const axios = require('axios');
const qs = require('qs');
const { expect, request } = require('chai');

const { auth0: { domain, audience, ci } } = require('../../../../../app/config');
const { genISSJWT } = require('../../../../../app/services/auth');

const fetchCreds = async () => {
    const options = {
        method: 'POST',
        url: `${domain}oauth/token`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify({
            grant_type: 'password',
            username: 'ci@xdelivery.ai',
            password: ci.password,
            audience: audience,
            scope: 'email profile openid',
            client_id: ci.client_id,
            client_secret: ci.client_secret
        })
    };
    return await axios.request(options);
};

describe('nexus graphQL authentication', function () {
    this.timeout(5000);

    it('401 with no jwt', async () => {
        const response = await request(global.server).post('/nexus/graphql');
        expect(response.status).to.eq(401);
    });

    it('401 with jwt from wrong issuer', async () => {
        const { token } = await genISSJWT({ _id: 1, email: 'test@test.com', roleId: '1' });
        const response = await request(global.server)
            .post('/nexus/graphql')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).to.eq(401);
    });

    it('200 with jwt from AUTH0', async () => {
        const SHIPMENT_QUERY = {
            query: ` {
                shipments ( start: 10   count: 10 ) {
                    hasMore
                }
            }`
        };
        const creds = await fetchCreds();
        const token = creds.data?.access_token;
        const response = await request(global.server)
            .post('/nexus/graphql')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json').send(SHIPMENT_QUERY);
        expect(response.status).to.eq(200);
    });
});
