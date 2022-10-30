const { Hermod, NotificationsMongoGateway } = require('hermod');

const mongo = require('../helpers/mongo');
const narvar = require('./narvar');
const webhooks = require('./webhooks');
const { getShipmentByTrackingNumber } = require('./shipments');

let client;
const DEFAULT_SERVICES = [narvar, webhooks];

const getGateways = () => {
    return {
        notifications: new NotificationsMongoGateway({ client: mongo.get() })
    };
};

const getClient = () => {
    if (!client) {
        // Import scv here to avoid circular import.
        //
        // ✖ Found 1 circular dependency!
        //
        // 1) app/repositories/scv/index.js > app/repositories/scv/runners.js > app/repositories/narvar.js > app/repositories/hermod.js
        client = new Hermod(getGateways(), require('./scv').get());
    }

    return client;
};

const enqueueNotifications = async (event, terminalLiveSegment, worker, opts = {}) => {
    let { shipment, services } = opts;

    if (event.hidden) {
        return;
    }

    shipment = shipment || await getShipmentByTrackingNumber(
        terminalLiveSegment.trackingNumber
    );
    if (!shipment) {
        return;
    }

    let notifications = [];
    for (const service of services || DEFAULT_SERVICES) {
        notifications = notifications.concat(
            await service.buildNotifications(event, terminalLiveSegment, { shipment })
        );
    }

    await getClient().createNotifications(worker, notifications);
};

module.exports = {
    getClient,
    getGateways,
    enqueueNotifications
};
