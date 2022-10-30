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

    const shipper = parseInt(args.shipper);

    const start = args.start
        ? new Date(args.start)
        : DateTime.now().startOf('hour').minus({ hours: 1 }).toJSDate();
    const end = args.end
        ? new Date(args.end)
        : DateTime.now().startOf('hour').toJSDate();

    const eventsInPeriod = events
        .find({ createdAt: { $gte: start, $lt: end } })
        .addCursorFlag('noCursorTimeout', true);

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
            // Only process LaserShip and LSO tracking numbers.
            if (args.providers && !args.providers.includes(terminalLiveSegment.provider)) {
                continue;
            }

            const shipment = await getShipmentByTrackingNumber(terminalLiveSegment.trackingNumber);

            // If there is a shipment we will have notified this via the normal tracking flow.
            if (shipment) {
                continue;
            }

            const labelCreatedEvent = event.externalStatus === 'Label Created'
                ? event
                : await events.findOne({
                    liveSegmentId: liveSegment._id,
                    externalStatus: 'Label Created'
                });
            const shippedAt = labelCreatedEvent
                ? DateTime.fromISO(labelCreatedEvent.timestamp).toJSDate()
                : null;

            const request = await narvar.createRequest({
                shipper,
                shippedAt,
                terminalTrackingNumber: terminalLiveSegment.trackingNumber,
                terminalProvider: terminalLiveSegment.provider,
                event
            });

            if (args.dryRun) {
                logger.info('request', { request });
            } else {
                await hermodClient.createNotification(scv.get(), {
                    requestor: { shipper },
                    request
                });
            }
        }
    }
}

const parser = new ArgumentParser({ description: 'Push FashionNova events to Narvar' });
parser.add_argument('-n', '--shipper', { help: 'Shipper ID to push events for', required: true });
parser.add_argument('-p', '--provider', {
    help: 'Limit push to specific providers',
    dest: 'providers',
    action: 'append'
});
parser.add_argument('-s', '--start', { help: 'ISO date string of time start looking for events' });
parser.add_argument('-e', '--end', { help: 'ISO date string of time stop looking for events' });
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
