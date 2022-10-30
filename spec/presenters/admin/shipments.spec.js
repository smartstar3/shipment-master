const { DateTime } = require('luxon');
const { expect, factory } = require('chai');

const adminShipmentsPresenter = require('../../../app/presenters/admin/shipments');
const { getFutureDeliveryDate, getToday } = require('../../helper/time');
const { getTerminalTrackingNumber } = require('../../../app/repositories/shipments');

describe('Admin Shipments Presenter', () => {
    describe('present', () => {
        it('presents two shipments when given two shipments', async () => {
            const today = new Date(getToday('America/Chicago').toISO());
            const plusThree = getFutureDeliveryDate('America/Chicago', 3);
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                vendor: 'X',
                shipper: org.shipperSeqNum,
                organization: org,
                created_date: new Date(today)
            });
            const otherShipment = await factory.create('shipment', {
                vendor: 'X',
                shipper: org.shipperSeqNum,
                organization: org,
                created_date: new Date(today)
            });
            const zipcode = await factory.create('zipcode', {
                zipcode: shipment.from_address.zip
            });

            const response = await adminShipmentsPresenter.present([shipment, otherShipment]);
            expect(response).to.have.lengthOf(2);
            expect(response).to.eql([
                {
                    tn: shipment.tn,
                    status: shipment.status,
                    vendor: shipment.vendor,
                    organization: org,
                    date: shipment.created_date,
                    referenceId: shipment.reference_id,
                    referenceData: shipment.reference_data,
                    toAddress: shipment.to_address,
                    fromAddress: shipment.from_address,
                    shipperName: 'OneLiveX',
                    label: shipment.label,
                    parcel: {
                        ...shipment.parcel,
                        tracking_num: getTerminalTrackingNumber(shipment)
                    },
                    rate: shipment.rate,
                    carrierTrackingNumber: undefined,
                    trackingStatus: '--',
                    tracking: {
                        status: 'Label Created',
                        events: [{
                            timestamp: DateTime.fromJSDate(
                                shipment.created_date,
                                { zone: zipcode.timezone }
                            ).toISO(),
                            status: 'Label Created',
                            message: 'Label has been created',
                            location: {
                                city: shipment.from_address.city,
                                state: shipment.from_address.state,
                                zip: shipment.from_address.zip,
                                lng: zipcode.coordinates.lng,
                                lat: zipcode.coordinates.lat,
                                timezone: zipcode.timezone
                            },
                            expectedDeliveryDate: null,
                            signature: null,
                            signatureUrl: null
                        }],
                        expectedDeliveryDate: plusThree
                    }
                },
                {
                    tn: otherShipment.tn,
                    status: otherShipment.status,
                    vendor: otherShipment.vendor,
                    organization: org,
                    date: otherShipment.created_date,
                    referenceId: otherShipment.reference_id,
                    referenceData: otherShipment.reference_data,
                    toAddress: otherShipment.to_address,
                    fromAddress: otherShipment.from_address,
                    shipperName: 'OneLiveX',
                    label: otherShipment.label,
                    parcel: {
                        ...shipment.parcel,
                        tracking_num: getTerminalTrackingNumber(otherShipment)
                    },
                    rate: otherShipment.rate,
                    carrierTrackingNumber: undefined,
                    trackingStatus: '--',
                    tracking: {
                        status: 'Label Created',
                        events: [{
                            timestamp: DateTime.fromJSDate(
                                otherShipment.created_date,
                                { zone: zipcode.timezone }
                            ).toISO(),
                            status: 'Label Created',
                            message: 'Label has been created',
                            location: {
                                city: otherShipment.from_address.city,
                                state: otherShipment.from_address.state,
                                zip: otherShipment.from_address.zip,
                                lng: zipcode.coordinates.lng,
                                lat: zipcode.coordinates.lat,
                                timezone: zipcode.timezone
                            },
                            expectedDeliveryDate: null,
                            signature: null,
                            signatureUrl: null
                        }],
                        expectedDeliveryDate: plusThree
                    }
                }
            ]);
        });

        it('presents events properly', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                vendor: 'X',
                shipper: org.shipperSeqNum,
                organization: org
            });
            const liveSegment = await factory.create('liveSegment', {
                provider: 'LaserShip',
                trackingNumber: getTerminalTrackingNumber(shipment),
                terminal: true
            });
            await factory.create('event', {
                liveSegmentId: liveSegment._id,
                externalStatus: 'Delivered',
                trackingNumber: getTerminalTrackingNumber(shipment),
                signature: 'Han Solo',
                signatureUrl: 'https://test-onelivex.s3.amazonaws.com/olx/signatures/F99E7FA8-B9A3-40AD-97BB-33D727031EFC.png'
            });

            const response = await adminShipmentsPresenter.present([shipment]);
            expect(response).to.have.lengthOf(1);
            expect(response[0].tracking.events).to.have.lengthOf(2);
            expect(response[0].tracking.events[1].signature).to.eq('Han Solo');
            expect(response[0].tracking.events[1].signatureUrl).to.include('X-Amz-Signature');
        });

        it('returns an empty array if passed 0 shipments', async () => {
            const response = await adminShipmentsPresenter.present([]);
            expect(response).to.have.lengthOf(0);
        });
    });
});
