const uuid = require('uuid');
const { expect, factory } = require('chai');

const {
    getShipmentByTrackingNumber,
    getShipments
} = require('../../../app/repositories/graphql/shipments');

describe('GraphQL Shipment Repository', () => {
    describe('getShipmentByTrackingNumber', () => {
        it('returns null if nothing found', async () => {
            const found = await getShipmentByTrackingNumber('1234', [1]);
            expect(found).to.eq(null);
        });

        it('returns shipment by tn', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum
            });
            const found = await getShipmentByTrackingNumber(
                shipment.tn.toString(),
                [shipment.shipper]
            );

            expect(found).to.eql({
                ...shipment,
                organization: { settings: {}, name: 'Test Org' }
            });
        });

        it('return null for wrong shipper by tn', async () => {
            const shipment = await factory.create('shipment');
            const found = await getShipmentByTrackingNumber(
                shipment.tn.toString(),
                [shipment.shipper + 1]
            );

            expect(found).to.eql(null);
        });

        const trackingNumber = uuid.v4().toUpperCase();
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
                    shipper: org.shipperSeqNum,
                    docs: [{ doc }]
                });
                const found = await getShipmentByTrackingNumber(
                    trackingNumber,
                    [shipment.shipper]
                );

                expect(found).to.eql({
                    ...shipment,
                    organization: { settings: {}, name: 'Test Org' }
                });
            });
        }

        it('return null for wrong shipper by tracking number', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ doc: { masterTrackingNumber: '791234' } }]
            });

            const found = await getShipmentByTrackingNumber('791234', [shipment.shipper + 1]);

            expect(found).to.eql(null);
        });

        it('does not require shipperId', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            const shipment = await factory.create('shipment', { shipper: org.shipperSeqNum });
            const found = await getShipmentByTrackingNumber(shipment.tn.toString());
            expect(found).to.eql({
                ...shipment,
                organization: { settings: {}, name: 'Test Org' }
            });
        });

        it('gets the most recent shipment by provider tracking number', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            await factory.create('shipment', {
                vendor: 'foobar',
                docs: [{ doc: { trackingNumber: '1234567890ABCDEF' }, vendor: 'foo' }]
            });
            const shipment = await factory.create('shipment', {
                vendor: 'foobar',
                shipper: org.shipperSeqNum,
                docs: [{ doc: { trackingNumber: '1234567890ABCDEF' }, vendor: 'foo' }]
            });

            const found = await getShipmentByTrackingNumber('1234567890ABCDEF');
            expect(found).to.eql({
                ...shipment,
                organization: { settings: {}, name: 'Test Org' }
            });
        });

        it('returns shipment by insensitive tracking number', async () => {
            const org = await factory.create('organization', { name: 'Test Org' });
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ doc: { trackingNumber: '1234567890ABCDEF' }, vendor: 'foo' }]
            });

            const found = await getShipmentByTrackingNumber('1234567890abcdef');
            expect(found).to.eql({
                ...shipment,
                organization: { settings: {}, name: 'Test Org' }
            });
        });
    });
    describe('getShipments', () => {
        it('searches shipment by UDS tracking code', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ vendor: 'UDS', doc: { Barcode: 'UDS12347' } }]
            });

            const searchWord = 'UDS12347';
            const found = await getShipments({ searchWord });

            expect(found.length).to.eql(1);
            expect(found[0].docs).to.eql(shipment.docs);
        });

        it('searches by LaserShip tracking code', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{
                    vendor: 'LaserShip',
                    doc: { Pieces: [{ LaserShipBarcode: '1LS1234' }] }
                }]
            });

            const searchWord = '1LS1234';
            const found = await getShipments({ searchWord });

            expect(found.length).to.eql(1);
            expect(found[0].docs).to.eql(shipment.docs);
        });

        it('searches by OnTrac tracking code', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ vendor: 'OnTrac', doc: { Tracking: 'D10012244731146' } }]
            });

            const searchWord = 'D10012244731146';
            const found = await getShipments({ searchWord });

            expect(found.length).to.eql(1);
            expect(found[0].docs).to.eql(shipment.docs);
        });

        it('searches for any carrier with trackingNumber', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{ vendor: 'OnTrac', doc: { Tracking: 'XX0012244734563' } }]
            });

            const searchWord = 'XX0012244734563';
            const found = await getShipments({ searchWord });

            expect(found.length).to.eql(1);
            expect(found[0].docs).to.eql(shipment.docs);
        });

        it('searches shipments with insensitive trackingNumber', async () => {
            const shipment1 = await factory.create('shipment', {
                docs: [{ vendor: 'testVendor', doc: { trackingNumber: 'XX00122ABC734563' } }]
            });

            const shipment2 = await factory.create('shipment', {
                docs: [{ vendor: 'testVendor', doc: { trackingNumber: 'PP0022ABC734563' } }]
            });

            const searchWord = '22abc7';
            const found = await getShipments({ searchWord });

            expect(found.length).to.eql(2);
            expect(found[0].docs[0].doc.trackingNumber).to.eql(shipment1.docs[0].doc.trackingNumber);
            expect(found[1].docs[0].doc.trackingNumber).to.eql(shipment2.docs[0].doc.trackingNumber);
        });
    });
});
