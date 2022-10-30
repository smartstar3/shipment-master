const { expect, factory, request } = require('chai');
const { UnauthorizedError } = require('errors');

describe('/service/v1', () => {
    describe('GET /serviceArea', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .get('/service/v1/serviceArea');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('returns zipcodes scoped by organization', async () => {
            const org1 = await factory.create('organization');
            const zone1 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75243' });
            const zone2 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75244' });
            const zone3 = await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75245' });

            const org2 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum, zipcode: '75246' });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum, zipcode: '75247' });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum, zipcode: '75248' });

            const { status, body: { zipcodes } } = await request(global.server)
                .get('/service/v1/serviceArea')
                .auth(org1.apiId, org1.apiKey);

            expect(status).to.eq(200);
            expect(zipcodes).to.have.length(3);
            expect(zipcodes).to.have.members([
                zone1.zipcode,
                zone2.zipcode,
                zone3.zipcode
            ]);
        });

        it('get zipcodes by wrong organization', async () => {
            const org1 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75249' });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75240' });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75241' });

            const org2 = await factory.create('organization');

            const { status, body: { zipcodes } } = await request(global.server)
                .get('/service/v1/serviceArea')
                .auth(org2.apiId, org2.apiKey);

            expect(status).to.eq(200);
            expect(zipcodes).to.have.length(0);
        });
    });
});
