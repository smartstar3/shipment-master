const uuid = require('uuid');
const { expect, factory } = require('chai');

const gconfig = require('../../app/config');
const {
    getDestinationTimezone,
    getShipmentById,
    getShipmentByTrackingNumber,
    getTerminalProvider,
    getTerminalTrackingNumber,
    getTrackingUrl,
    updateShipment
} = require('../../app/repositories/shipments');

describe('Shipment Repository', () => {
    describe('getTrackingUrl', () => {
        it('works', () => {
            expect(getTrackingUrl({ tn: 'TN1234' })).to.eq(`${gconfig.trackingUrl}/TN1234`);
        });
    });

    describe('getTerminalProvider', () => {
        it('works', () => {
            expect(getTerminalProvider({ docs: [{ vendor: 'vendor' }] })).to.eq('vendor');
        });
    });

    describe('getTerminalTrackingNumber', () => {
        it('returns for UDS', () => {
            expect(
                getTerminalTrackingNumber({
                    tn: 'TN1234',
                    docs: [{ vendor: 'UDS', doc: { Barcode: 'UDS1234' } }]
                })
            ).to.eq('UDS1234');
        });

        it('returns for LaserShip', () => {
            expect(
                getTerminalTrackingNumber({
                    tn: 'TN1234',
                    docs: [{
                        vendor: 'LaserShip',
                        doc: { Pieces: [{ LaserShipBarcode: 'LaserShip1234' }] }
                    }]
                })
            ).to.eq('LaserShip1234');
        });

        it('returns for OnTrac', () => {
            expect(
                getTerminalTrackingNumber({
                    tn: 'TN1234',
                    docs: [{ vendor: 'OnTrac', doc: { Tracking: 'OnTrac1234' } }]
                })
            ).to.eq('OnTrac1234');
        });

        it('returns for any carrier with trackingNumber', () => {
            expect(
                getTerminalTrackingNumber({
                    tn: 'TN1234',
                    docs: [{ vendor: 'FOOBAR', doc: { trackingNumber: 'FOOBAR1234' } }]
                })
            ).to.eq('FOOBAR1234');
        });

        it('defaults to tn', () => {
            expect(
                getTerminalTrackingNumber({ tn: 'TN1234', docs: [{ doc: {} }] })
            ).to.eq('TN1234');
        });

        it('handles invalid documents', () => {
            expect(getTerminalTrackingNumber({ tn: 'TN1234' })).to.eq('TN1234');
            expect(getTerminalTrackingNumber({ tn: 'TN1234', docs: [] })).to.eq('TN1234');
            expect(getTerminalTrackingNumber({ tn: 'TN1234', docs: [{}] })).to.eq('TN1234');
        });
    });

    describe('getShipmentByTrackingNumber', () => {
        it('returns null if nothing found', async () => {
            const found = await getShipmentByTrackingNumber('1234', 1);
            expect(found).to.eq(null);
        });

        it('returns shipment by tn', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            const shipment = await factory.create('shipment', { shipper: org.shipperSeqNum });
            const found = await getShipmentByTrackingNumber(
                shipment.tn.toString(),
                shipment.shipper
            );

            expect(found).to.eql(shipment);
        });

        it('return null for wrong shipper by tn', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentByTrackingNumber(
                shipment.tn.toString(),
                shipment.shipper + 1
            );

            expect(found).to.eql(null);
        });

        const trackingNumber = uuid.v4();
        for (const doc of [
            { trackingNumber },
            { masterTrackingNumber: trackingNumber },
            { Pieces: [{ LaserShipBarcode: trackingNumber }] },
            { Tracking: trackingNumber },
            { Barcode: trackingNumber }
        ]) {
            it(`returns shipment by doc ${JSON.stringify(doc)}`, async () => {
                const org = await factory.create('organization', { name: 'Test Org' });
                const shipment = await factory.create('shipment', {
                    vendor: 'foobar',
                    shipper: org.shipperSeqNum,
                    docs: [{ doc }]
                });
                const found = await getShipmentByTrackingNumber(trackingNumber, shipment.shipper);

                expect(found).to.eql(shipment);
            });
        }

        it('return null for wrong shipper by tracking number', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ doc: { masterTrackingNumber: '791234' } }]
            });

            const found = await getShipmentByTrackingNumber('791234', [shipment.shipper + 1]);

            expect(found).to.eql(null);
        });

        it('does not require shipper', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentByTrackingNumber(shipment.tn);
            expect(found).to.eql(shipment);
        });
    });

    describe('getShipmentById', () => {
        it('returns null if nothing found', async () => {
            const found = await getShipmentById('1234', 1);
            expect(found).to.eq(null);
        });

        it('returns shipment by _id', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentById(shipment._id.toString(), shipment.shipper);

            expect(found).to.eql(shipment);
        });

        it('return null for wrong shipper by _id', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentById(shipment._id.toString(), shipment.shipper + 1);

            expect(found).to.eql(null);
        });

        it('returns shipment by tn', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum
            });
            const found = await getShipmentById(shipment.tn.toString(), shipment.shipper);

            expect(found).to.eql(shipment);
        });

        const trackingNumber = uuid.v4();
        for (const doc of [
            { trackingNumber },
            { masterTrackingNumber: trackingNumber },
            { Pieces: [{ LaserShipBarcode: trackingNumber }] },
            { Tracking: trackingNumber },
            { Barcode: trackingNumber }
        ]) {
            it(`returns shipment by doc ${doc}`, async () => {
                const org = await factory.create('organization', { name: 'Test Org' });
                const shipment = await factory.create('shipment', {
                    shipper: org.shipperSeqNum,
                    organization: { settings: {} },
                    docs: [{ doc }]
                });
                const found = await getShipmentById(trackingNumber, shipment.shipper);

                expect(found).to.eql(shipment);
            });
        }

        it('return null for wrong shipper by tracking number', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ doc: { masterTrackingNumber: '791234' } }]
            });

            const found = await getShipmentById('791234', shipment.shipper + 1);

            expect(found).to.eql(null);
        });

        it('does not require shipper', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentById(shipment._id);
            expect(found).to.eql(shipment);
        });
    });

    describe('updateShipment', () => {
        it('updates with _id', async () => {
            const shipment = await factory.create('shipment');
            const updated = await updateShipment(shipment, { foobar: 1 });

            expect(updated.foobar).to.eq(1);
            expect(updated.updatedAt instanceof Date).to.eq(true);
        });

        it('updates with id', async () => {
            const { _id, ...shipment } = await factory.create('shipment');
            const updated = await updateShipment({ id: _id, ...shipment }, { foobar: 1 });

            expect(updated.foobar).to.eq(1);
            expect(updated.updatedAt instanceof Date).to.eq(true);
        });
    });

    describe('getDestinationTimezone', () => {
        it('resolves a timezone given a valid zip', async () => {
            const shipment = await factory.create('shipment');
            const zipcode = await factory.create('zipcode', { zipcode: shipment.to_address.zip });
            const tz = await getDestinationTimezone(shipment);
            expect(tz).to.eq(zipcode.timezone);
        });

        it('resolves a timezone given a valid zip+4', async () => {
            const shipment = await factory.create('shipment', {
                to_address: {
                    name: 'Jamila Small',
                    address1: '174 Riverdale Ave',
                    address2: 'F',
                    city: 'Brooklyn',
                    state: 'NY',
                    zip: '37701-4313',
                    country: 'US',
                    phone: '347-691-8291'
                }
            });
            const zipcode = await factory.create('zipcode', { zipcode: '37701' });
            const tz = await getDestinationTimezone(shipment);
            expect(tz).to.eq(zipcode.timezone);
        });

        it('returns null if the shipment doesnt have a to address zipcode', async () => {
            const shipment = await factory.create('shipment', {
                to_address: {}
            });
            const tz = await getDestinationTimezone(shipment);
            expect(tz).to.eq(null);
        });

        it('returns null if the zipcode isn not found ', async () => {
            const shipment = await factory.create('shipment', {
                to_address: { zip: '27701' }
            });
            const tz = await getDestinationTimezone(shipment);
            expect(tz).to.eq(null);
        });
    });
});
