const { expect, factory } = require('chai');
const { getZipCodesMiddleware } = require('../../../app/controllers/rest/zipcode');
const { MockResponse } = require('../../helper/mockResponse');

describe('zipcode controller', () => {
    context('getZipCodesMiddleware', () => {
        it('fetches zip codes scoped by shipper id', async () => {
            const org1 = await factory.create('organization');
            const zone1 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '1234' });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '1234' });
            const zone2 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '1235' });
            const zone3 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '1236' });

            const org2 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });

            const req = { org: { ...org1 } };
            const res = new MockResponse();

            await getZipCodesMiddleware(req, res);

            const { statusCode, data: { zipcodes } } = res;

            expect(statusCode).to.eq(200);
            expect(zipcodes).to.have.length(3);
            expect(zipcodes).to.have.members([
                zone1.zipcode,
                zone2.zipcode,
                zone3.zipcode
            ]);
        });
    });
});
