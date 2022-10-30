const Narvar = require('narvar');
const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../config');

const logger = getLogger(module);

const narvar = new Narvar(gconfig.narvarApiToken, {
    url: gconfig.narvarUrl,
    logger
});

const buildNotifications = async (event, liveSegment, { shipment } = {}) => {
    const { shipper } = shipment;
    const request = await narvar.createRequest({
        shipper,
        shippedAt: shipment.created_date,
        trackingNumber: shipment.tn,
        terminalTrackingNumber: liveSegment.trackingNumber,
        terminalProvider: liveSegment.provider,
        event
    });

    return request ? [{ requestor: { shipper }, request }] : [];
};

module.exports = {
    narvar,
    buildNotifications
};
