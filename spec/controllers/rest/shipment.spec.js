const shipmentController = require('../../../app/controllers/rest/shipment');
const { expect, factory } = require('chai');
const { MockResponse } = require('../../helper/mockResponse');

describe('shipment controller', () => {
    describe('exportShipments', () => {
        it('should export shipments to CSV by matched params', async () => {
            const organization = await factory.create('organization');
            await factory.create(
                'shipment',
                {
                    shipper: organization.shipperSeqNum,
                    to_address: { name: 'testShipper' },
                    docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }],
                    created_date: new Date('2021-02-18')
                }
            );

            const req = {
                headers: {
                    accept: 'text/csv'
                },
                body: {
                    searchWord: 'testShipper',
                    organizationId: organization.id,
                    startDate: new Date('2021-02-17').getTime(),
                    endDate: new Date('2021-02-19').getTime(),
                    vendor: 'uds'
                }
            };

            const res = new MockResponse();

            return shipmentController.exportShipments(req, res).then(() => {
                expect(res.statusCode).to.eq(200);
                expect(res.data.message).to.eql('CSV File created successfully.');
                expect(typeof res.data.csvData).to.eq('string');
                expect(res.data.csvData !== '').to.eq(true);
            });
        });

        it('should not export shipments to CSV by unmatched params', async () => {
            const organization = await factory.create('organization');
            await factory.create(
                'shipment',
                {
                    shipper: organization.shipperSeqNum,
                    shipper_name: 'testShipper',
                    docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }],
                    created_date: new Date('2021-02-18')
                }
            );

            const req = {
                headers: {
                    accept: 'text/csv'
                },
                body: {
                    searchWord: 'unmatched'
                }
            };

            const res = new MockResponse();

            return shipmentController.exportShipments(req, res).then(() => {
                expect(res.statusCode).to.eq(200);
                expect(res.data.csvData).to.eql('');
            });
        });
    });
});
