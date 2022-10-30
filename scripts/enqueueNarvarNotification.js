// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const { ArgumentParser } = require('argparse');
const { DateTime } = require('luxon');

require('../app/config'); // dotenv needs to parse config
const hermod = require('../app/repositories/hermod');
const mongo = require('../app/helpers/mongo');
const scv = require('../app/repositories/scv');
const transport = require('../app/repositories/transport');
const { getShipmentByTrackingNumber } = require('../app/repositories/shipments');
const { narvar } = require('../app/repositories/narvar');

async function main (args) {
    await mongo.connect();

    const hermodClient = hermod.getClient();
    const transportClient = transport.getClient();

    const events = mongo.get().db().collection('events');
    const liveSegments = mongo.get().db().collection('liveSegments');

    const start = args.start
        ? new Date(args.start)
        : DateTime.now().startOf('hour').minus({ days: 1 }).toJSDate();
    const end = args.end
        ? new Date(args.end)
        : DateTime.now().startOf('hour').toJSDate();

    const query = args.query ? JSON.parse(args.query) : {};
    const eventsInPeriod = events.find({ createdAt: { $gte: start, $lt: end }, ...query });

    let index = 0;
    for await (const event of eventsInPeriod) {
        if (index % 1000 === 0) {
            logger.info(`${index} records processed`, { createdAt: event.createdAt });
        }
        index++;

        const liveSegment = await liveSegments.findOne({ _id: event.liveSegmentId });

        const terminalLiveSegments = liveSegment.terminal
            ? [liveSegment]
            : await transportClient.findTerminalLiveSegmentsInLane(liveSegment);

        for (const terminalLiveSegment of terminalLiveSegments) {
            const shipment = await getShipmentByTrackingNumber(terminalLiveSegment.trackingNumber);

            // Some events are for shipments outside of our database, ignore them.
            if (!shipment) {
                continue;
            }

            if (args.shipper && parseInt(args.shipper) !== shipment.shipper) {
                continue;
            }

            const request = await narvar.createRequest({
                shipper: shipment.shipper,
                shippedAt: shipment.created_date,
                trackingNumber: shipment.tn,
                terminalTrackingNumber: terminalLiveSegment.trackingNumber,
                terminalProvider: terminalLiveSegment.provider,
                event
            });

            if (args.dryRun) {
                logger.info('request', { request });
            } else {
                await hermodClient.createNotification(scv.get(), {
                    requestor: { shipper: shipment.shipper },
                    request
                });
            }
        }
    }
}

const parser = new ArgumentParser({
    description: 'Enqueue narvar notifications for events within the given time period'
});
parser.add_argument('-s', '--start', {
    help: 'ISO date string of time start looking for events, defaults to one day ago'
});
parser.add_argument('-e', '--end', {
    help: 'ISO date string of time stop looking for events, defaults to beginning of current hour'
});
parser.add_argument('-q', '--query', { help: 'JSON query to look for events' });
parser.add_argument('-n', '--shipper', { help: 'Limit push to specific shipper' });
parser.add_argument('-d', '--dry-run', {
    dest: 'dryRun',
    action: 'store_true',
    help: 'Do not enqueue jobs, just print'
});

main(parser.parse_args())
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
