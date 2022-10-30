const Identites = require('../../../../app/models/identities');
const passport = require('passport');
const {
    google: { callbackURL },
    jwtRefreshTokenSecret,
    jwtRefreshTokenExpiration,
    adminUI: { redirectURL }
} = require('../../../../app/config');
const { expect, factory, request } = require('chai');

const authTest = async (opts) => {
    const { url, endpointName, method = 'get', body } = opts;
    describe(`Authorization for ${endpointName} - ${url}`, async () => {
        it('401 with no jwt', async () => {
            const response = await request(global.server)[method](url);
            expect(response.status).to.eq(401);
        });

        it('401 with junk jwt', async () => {
            const response = await request(global.server)[method](url)
                .set('authorization', 'Bearer imasneakycodebreaker');
            expect(response.status).to.eq(401);
        });

        it('401 with incorrect ISS jwt', async () => {
            const token = await factory.create('jwt', { iss: 'BadActorInc' });
            const response = await request(global.server)[method](url)
                .set('authorization', `Bearer ${token}`);
            expect(response.status).to.eq(401);
        });

        it('401 with different signing secret jwt ', async () => {
            const token = await factory.create('jwt', { secret: 'wrongsecret.ext' });
            const response = await request(global.server)[method](url)
                .set('authorization', `Bearer ${token}`);
            expect(response.status).to.eq(401);
        });

        it('401 with outdated jti in jwt ', async () => {
            const user = await factory.create('identity', { jti: 'newjti' });
            const token = await factory.create('jwt', { ...user, jti: 'oldjti' });
            const response = await request(global.server)[method](url)
                .set('authorization', `Bearer ${token}`);
            expect(response.status).to.eq(401);
        });

        it('401 with expired jwt ', async () => {
            const user = await factory.create('identity', { jti: 'correctjti' });
            const token = await factory.create('jwt', { ...user, jti: 'correctjti', exp: 10000 });
            const response = await request(global.server)[method](url)
                .set('authorization', `Bearer ${token}`);
            expect(response.status).to.eq(401);
        });

        it('200 with valid jwt', async () => {
            const role = await factory.create('role', { authLevel: 2, name: 'Admin' });
            const user = await factory.create('identity', { jti: 'correctjti', roleId: role._id });
            const token = await factory.create('jwt', { ...user, jti: 'correctjti' });
            const response = await request(global.server)[method](url)
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/json')
                .send(body);
            expect(response.status).to.eq(200);
        });
    });
};

describe('Admin Auth Test', () => {
    describe('oauth login', () => {
        it('With valid oauth, it logs in', async () => {
            await factory.create('role', { authLevel: 2, name: 'Admin' });
            const user = await factory.create('identity');

            const MockStrategy = passport._strategies.google;
            MockStrategy._token_response = {
                access_token: 'at-1234',
                expires_in: 3600
            };

            MockStrategy._profile = {
                ...user,
                id: user.oauthId.googleId,
                emails: [{ value: user.email }],
                _id: null,
                provider: 'google',
                photos: [{ value: 'http://mypic.gov' }]
            };

            const response = await request(global.server)
                .get('/admin/api/auth/google').redirects(1);

            const redirectPath = response.headers.location.split('?');

            expect(response.status).to.eq(302);
            expect(response).to.redirect;
            expect(response).to.redirectTo(`${callbackURL}?__mock_strategy_callback=true`);
            expect(redirectPath[0]).to.eq(`${redirectURL}`);
            expect(response.headers['set-cookie']).to.not.eq(null);
            expect(response.headers['set-cookie'][0]).to.include(`Max-Age=${jwtRefreshTokenExpiration}`);
        });
    });

    authTest({ url: '/admin/api/shipments/exports', endpointName: 'shipments export', method: 'post' });
    const testQuery = '{"query":"query statusesQuery { viewer { ...status_viewer  }} fragment status_viewer on Viewrec { services {   name   } } ","variables":{}}';
    authTest({ url: '/admin/graphql', endpointName: 'graphql', method: 'post', body: testQuery });

    describe('Refresh Tokens', () => {
        it('can refresh a jwt', async () => {
            const INITIAL_REFRESH_JTI = 'initialRefreshJti';
            const role = await factory.create('role', { authLevel: 2, name: 'Admin' });
            const user = await factory.create('identity', {
                jti: 'initialJti',
                refreshJti: INITIAL_REFRESH_JTI,
                roleId: role._id
            });
            const refreshToken = await factory.create('jwt', {
                ...user,
                jti: INITIAL_REFRESH_JTI,
                secret: jwtRefreshTokenSecret
            });
            const response = await request(global.server)
                .post('/admin/api/token')
                .set('Content-Type', 'application/json')
                .send({ refreshToken });
            expect(response.status).to.eq(200);
            expect(response.body.token).to.not.eq(null);
            const { refreshJti } = await Identites.dbget({ _id: user._id });
            expect(refreshJti).to.not.eq(INITIAL_REFRESH_JTI);
        });

        it('cannot refresh without a refresh token ', async () => {
            const INITIAL_REFRESH_JTI = 'initialRefreshJti';
            const role = await factory.create('role', { authLevel: 2, name: 'Admin' });
            await factory.create('identity', {
                jti: 'initialJti',
                refreshJti: INITIAL_REFRESH_JTI,
                roleId: role._id
            });
            const response = await request(global.server)
                .post('/admin/api/token')
                .set('Content-Type', 'application/json')
                .send({});
            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.deep.eq(
                {
                    error_code: 422,
                    error_msg: 'The request was well-formed but was unable to be followed due to semantic errors.',
                    error_fields: [
                        {
                            name: 'refreshToken',
                            message: '"refreshToken" is required',
                            segment: 'body'
                        }
                    ]
                }
            );
        });

        it('cannot refresh with an invalid token', async () => {
            const INITIAL_REFRESH_JTI = 'initialRefreshJti';
            const WRONG_REFRESH_JTI = 'wrongJTI';

            const role = await factory.create('role', { authLevel: 2, name: 'Admin' });
            const user = await factory.create('identity', {
                jti: 'initialJti',
                refreshJti: INITIAL_REFRESH_JTI,
                roleId: role._id
            });
            const refreshToken = await factory.create('jwt', {
                ...user,
                jti: WRONG_REFRESH_JTI,
                secret: jwtRefreshTokenSecret
            });
            const response = await request(global.server)
                .post('/admin/api/token')
                .set('Content-Type', 'application/json')
                .send({ refreshToken });
            expect(response.status).to.eq(401);
            const { refreshJti } = await Identites.dbget({ _id: user._id });
            // jti should have remained the same in the user record
            expect(refreshJti).to.eq(INITIAL_REFRESH_JTI);
        });
    });
});
