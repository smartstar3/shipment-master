const eventsPresenter = require('../events');
const { edd, eddTobacco } = require('../../config/index');
const { getDestinationTimezone } = require('../../repositories/shipments');
const { getTerminalTrackingNumber } = require('../../repositories/shipments');
const { getTrackingForShipment } = require('../../repositories/transport');

async function presentShipment (shipment) {
    const events = await getTrackingForShipment(shipment);
    const timezone = await getDestinationTimezone(shipment) || 'America/Chicago';

    const { rate = null } = shipment;
    const { settings = {} } = shipment.organization;
    const { tobacco = false } = settings;

    return {
        tn: shipment.tn,
        status: shipment.status,
        vendor: shipment.vendor,
        organization: shipment.organization,
        label: shipment.label,
        date: shipment.created_date,
        referenceId: shipment.reference_id,
        referenceData: shipment.reference_data,
        toAddress: shipment.to_address,
        fromAddress: shipment.from_address,
        shipperName: shipment.shipper_name,
        tracking: await eventsPresenter.present(events, {
            deliveryDays: tobacco ? eddTobacco : edd,
            destinationTimezone: timezone
        }),
        parcel: {
            ...shipment.parcel,
            tracking_num: getTerminalTrackingNumber(shipment)
        },
        trackingStatus: shipment.trackingStatus,
        carrierTrackingNumber: shipment.carrierTrackingNumber,
        rate: (rate)
            ? {
                billable_weight: rate.billable_weight,
                cost: rate.cost,
                dollar_cost: rate.dollar_cost,
                zone: rate.zone,
                use_dim_weight: rate.use_dim_weight
            }
            : null

    };
}

module.exports = {
    present: async (shipments) => {
        return Promise.all(shipments.map(async (shipment) => presentShipment(shipment)));
    }
};
