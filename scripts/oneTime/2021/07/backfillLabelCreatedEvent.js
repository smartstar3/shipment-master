// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const { ArgumentParser } = require('argparse');

const mongo = require('../../../../app/helpers/mongo');
const {
    getTerminalProvider,
    getTerminalTrackingNumber
} = require('../../../../app/repositories/shipments');
const { getClient } = require('../../../../app/repositories/transport');

const main = async args => {
    await mongo.connect();

    const transport = getClient();
    const events = mongo.get().db().collection('events');
    const shipments = mongo.get().db().collection('olxshipment');

    for await (const shipment of shipments.find()) {
        const trackingNumber = getTerminalTrackingNumber(shipment);
        if (typeof trackingNumber !== 'string') {
            logger.error('trackingNumber does not exist', {
                trackingNumber: shipment.tn,
                terminalTrackingNumber: trackingNumber
            });
            continue;
        }

        const liveSegment = await transport.findLiveSegment({
            shipDate: shipment.created_date,
            trackingNumber
        });
        const event = liveSegment
            ? await events.findOne({
                liveSegmentId: liveSegment._id,
                internalStatus: 'Label Created',
                hidden: { $ne: true }
            })
            : null;

        if (!event) {
            logger.info('event not found', { trackingNumber });

            if (!args.dryRun) {
                await transport.buildCreatedEvent({
                    trackingNumber,
                    terminalProvider: getTerminalProvider(shipment),
                    createdAt: shipment.created_date,
                    location: {
                        city: shipment.from_address?.city,
                        state: shipment.from_address?.state,
                        zip: shipment.from_address?.zip
                    }
                });
            }
        } else {
            logger.info('exising event found', { event });
        }
    }
};

const parser = new ArgumentParser({
    description: 'Backfill label created events for all existing shipments'
});
parser.add_argument('-d', '--dry-run', {
    dest: 'dryRun',
    action: 'store_true',
    help: 'Print what is going to happen instead of doing anything'
});

main(parser.parse_args())
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
