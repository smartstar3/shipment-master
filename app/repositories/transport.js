const {
    Transport,
    LiveSegmentsMongoGateway,
    EventsMongoGateway,
    ZipcodesMongoGateway
} = require('@onelive-dev/transport');

const mongo = require('../helpers/mongo');
const { getTerminalProvider, getTerminalTrackingNumber } = require('./shipments');
const { STATUSES: { LABEL_CREATED } } = require('../constants/trackingConstants');

let client;

const getGateways = () => {
    return {
        liveSegments: new LiveSegmentsMongoGateway({ client: mongo.get() }),
        events: new EventsMongoGateway({ client: mongo.get() }),
        zipcodes: new ZipcodesMongoGateway({ client: mongo.get() })
    };
};

const getClient = () => {
    if (!client) {
        client = new Transport(getGateways());
    }

    return client;
};

module.exports = {
    getClient,
    getGateways,

    getTrackingForShipment: async (shipment) => {
        const client = getClient();
        const trackingNumber = getTerminalTrackingNumber(shipment);
        const terminalProvider = getTerminalProvider(shipment);

        const events = await client.findEventsForTerminalTrackingNumber(
            trackingNumber,
            shipment.created_date
        );

        // XXX: remove this once events are backfilled
        let createdEvent = events.find(event => {
            return !event.hidden && event.externalStatus === LABEL_CREATED;
        });

        if (!createdEvent) {
            createdEvent = await client.buildCreatedEvent({
                trackingNumber,
                terminalProvider,
                createdAt: shipment.created_date,
                location: {
                    city: shipment.from_address?.city,
                    state: shipment.from_address?.state,
                    zip: shipment.from_address?.zip
                }
            });

            createdEvent.terminal = true;

            events.unshift(createdEvent);
        }

        return events;
    }
};
