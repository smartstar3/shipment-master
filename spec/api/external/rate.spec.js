const { expect, factory, request } = require('chai');
const { UnauthorizedError } = require('errors');

describe('/service/v1', () => {
    describe('POST /rate', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .delete('/service/v1/rate');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('successfully gets rates', async () => {
            const org = await factory.create('organization');
            const zip = '00110';
            const zipPrefix = zip.slice(0, 3);

            await factory.create('zoneMatrix', {
                prefix: zipPrefix,
                matrix: new Array(999).fill('1*')
            });
            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 1,
                weight: 16,
                cost: 5.00
            });

            const body = await factory.create('orderRequest', { to_address: { zip } });

            const response = await request(global.server)
                .post('/service/v1/rate')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(200);
            expect(response.body.rate).to.eql({
                billable_weight: 3,
                cost: '5.00',
                dollar_cost: '$5.00',
                use_dim_weight: true,
                zone: 1
            });
        });
    });
});
