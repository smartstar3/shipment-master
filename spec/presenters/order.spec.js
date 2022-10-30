const { expect, factory } = require('chai');

const orderPresenter = require('../../app/presenters/order');
const { getTrackingUrl } = require('../../app/repositories/shipments');

const rate = {
    billable_weight: 2,
    cost: '5.00',
    dollar_cost: '$5.00',
    zone: 1,
    use_dim_weight: false
};

describe('Order Presenter', () => {
    describe('present', () => {
        it('presents a shipment', async () => {
            const shipment = await factory.create('shipment', { rate });

            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: shipment.docs[0].vendor,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents even if parcel is undefined', async () => {
            const shipment = await factory.create('shipment', {
                parcel: undefined,
                rate
            });
            expect(orderPresenter.present(shipment).parcel).to.eql({
                carrier: shipment.docs[0].vendor,
                tracking_num: shipment.docs[0].doc.trackingNumber
            });
        });

        it('presents a UDS shipment', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{ vendor: 'UDS', doc: { Barcode: 'UDS1234' } }]
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'UDS',
                    tracking_num: 'UDS1234',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents a LaserShip shipment', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{
                        vendor: 'LaserShip',
                        doc: { Pieces: [{ LaserShipBarcode: '1LS1234' }] }
                    }]
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'LaserShip',
                    tracking_num: '1LS1234',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents an OnTrac shipment', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{ vendor: 'OnTrac', doc: { Tracking: 'D10012244731146' } }]
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'OnTrac',
                    tracking_num: 'D10012244731146',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents a DHL eCommerce shipment', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{ vendor: 'DHLeCommerce', doc: { trackingNumber: '4341601140002462' } }]
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'DHLeCommerce',
                    tracking_num: '4341601140002462',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents a LSO shipment', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{ vendor: 'LSO', doc: { trackingNumber: 'ZY03RFYW' } }]
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'LSO',
                    tracking_num: 'ZY03RFYW',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('presents cancelledAt if present', async () => {
            const shipment = await factory.create(
                'shipment',
                {
                    rate,
                    docs: [{ vendor: 'LSO', doc: { trackingNumber: 'ZY03RFYW' } }],
                    cancelledAt: new Date()
                }
            );
            expect(orderPresenter.present(shipment)).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: 'LSO',
                    tracking_num: 'ZY03RFYW',
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: shipment.cancelledAt.toISOString()
            });
        });
    });
});
