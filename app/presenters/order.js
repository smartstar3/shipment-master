const { getTerminalTrackingNumber, getTrackingUrl } = require('../repositories/shipments');

module.exports = {
    present: (shipment) => {
        const {
            tn,
            docs,
            rate,
            label,
            controlled_substance: substance,
            created_date: createdAt,
            cancelledAt
        } = shipment;

        const { vendor: carrier } = docs[0];

        let rateObj = null;
        if (rate) {
            rateObj = {
                billable_weight: rate.billable_weight,
                cost: rate.cost,
                dollar_cost: rate.dollar_cost,
                zone: rate.zone,
                use_dim_weight: rate.use_dim_weight
            };
        }

        const presented = {
            tracking_number: tn,
            tracking_url: getTrackingUrl(shipment),
            shipper_name: shipment.shipper_name,
            shipper_phone: shipment.shipper_phone,
            reference_id: shipment.reference_id,
            reference_data: shipment.reference_data,
            to_address: shipment.to_address,
            from_address: shipment.from_address,
            parcel: {
                tracking_num: getTerminalTrackingNumber(shipment),
                carrier,
                ...shipment.parcel
            },
            rate: rateObj,
            label_format: label.type,
            label_base64: label.base64,
            create_time: createdAt.toISOString(),
            cancelled_time: (cancelledAt) ? cancelledAt.toISOString() : null
        };

        if (substance) {
            presented.controlled_substance = substance;
        }

        return presented;
    }
};
