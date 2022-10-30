const { expect, factory } = require('chai');

const userShipmentsPresenter = require('../../../app/presenters/user/shipments');
const { getFutureDeliveryDate } = require('../../helper/time');

describe('User Shipments Presenter', () => {
    describe('present', () => {
        it('presents two shipments when given two shipments', async () => {
            const { today } = await factory.create('expectedDeliveryDates');
            const shipment = await factory.create('shipment', {
                vendor: 'X',
                created_date: new Date(today)
            });
            const otherShipment = await factory.create('shipment', {
                created_date: new Date(today)
            });
            const response = await userShipmentsPresenter.present([
                { ...shipment, organization: { settings: {} } },
                { ...otherShipment, organization: { settings: {} } }
            ]);
            expect(response).to.have.lengthOf(2);
            expect(response[0]).to.deep.eq({
                tn: shipment.tn,
                status: shipment.status,
                vendor: shipment.vendor,
                date: shipment.created_date,
                toAddress: shipment.to_address,
                fromAddress: shipment.from_address,
                shipperName: 'OneLiveX',
                label: shipment.label,
                tracking: {
                    status: 'Label Created',
                    events: [{
                        timestamp: new Date(shipment.created_date).toISOString(),
                        status: 'Label Created',
                        message: 'Label has been created',
                        location: {
                            city: shipment.from_address.city,
                            state: shipment.from_address.state,
                            zip: shipment.from_address.zip,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    }],
                    expectedDeliveryDate: getFutureDeliveryDate('America/Chicago', 3)
                }
            });
            expect(response[1]).to.deep.eq({
                tn: otherShipment.tn,
                status: otherShipment.status,
                vendor: otherShipment.vendor,
                date: otherShipment.created_date,
                toAddress: otherShipment.to_address,
                fromAddress: otherShipment.from_address,
                shipperName: 'OneLiveX',
                label: otherShipment.label,
                tracking: {
                    status: 'Label Created',
                    events: [{
                        timestamp: new Date(otherShipment.created_date).toISOString(),
                        status: 'Label Created',
                        message: 'Label has been created',
                        location: {
                            city: otherShipment.from_address.city,
                            state: otherShipment.from_address.state,
                            zip: otherShipment.from_address.zip,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    }],
                    expectedDeliveryDate: getFutureDeliveryDate('America/Chicago', 3)
                }
            });
        });

        it('returns an empty array if passed 0 shipments', async () => {
            const response = await userShipmentsPresenter.present([]);
            expect(response).to.have.lengthOf(0);
        });
    });
});
