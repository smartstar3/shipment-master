const eventsPresenter = require('../events');
const { edd, eddTobacco } = require('../../config/index');
const { getDestinationTimezone } = require('../../repositories/shipments');
const { getTrackingForShipment } = require('../../repositories/transport');

async function presentShipment (shipment) {
    const events = await getTrackingForShipment(shipment);
    const timezone = await getDestinationTimezone(shipment) || 'America/Chicago';

    const { settings = {} } = shipment.organization;
    const { tobacco = false } = settings;

    return {
        tn: shipment.tn,
        status: shipment.status,
        vendor: shipment.vendor,
        date: shipment.created_date,
        toAddress: shipment.to_address,
        fromAddress: shipment.from_address,
        shipperName: shipment.shipper_name,
        label: shipment.label,
        tracking: await eventsPresenter.present(events, {
            deliveryDays: tobacco ? eddTobacco : edd,
            destinationTimezone: timezone
        })
    };
}

module.exports = {
    present: async (shipments) => {
        return Promise.all(shipments.map(async (shipment) => presentShipment(shipment)));
    }
};
