const { expect, factory, request } = require('chai');
const { UnauthorizedError } = require('errors');

describe('/service/v1', () => {
    describe('GET /verify', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .get('/service/v1/verify');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('returns a 200 if authenticated', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .get('/service/v1/verify')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({ status: 'ok' });
        });
    });
});
