const { expect, request } = require('chai');
const { UnprocessableEntityError } = require('errors');

const gconfig = require('../../../../app/config');
const transport = require('../../../../app/repositories/transport');

describe('Internal Tracking Ingestion API', function () {
    given('transport', function () {
        return transport.build();
    });

    describe('/v1/source', function () {
        it('requires authentication', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .send({
                    location: 's3://test-onelivex/transport/fashionnova/FashionNovaOneLiveShipped_202101050730.csv',
                    data: { provider: 'FashionNova', transfer: true }
                });

            expect(response.status).to.eq(401);
        });

        it('requires data', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({ location: 's3://test-onelivex/transport/foo/bar.csv' });

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 422,
                error_msg: UnprocessableEntityError.message,
                error_fields: [{ name: 'data', message: '"data" is required', segment: 'body' }]
            });
        });

        it('validates location and data.client', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({ location: 'foo', data: { provider: 'bar', transfer: true } });

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 422,
                error_msg: UnprocessableEntityError.message,
                error_fields: [{
                    name: 'location',
                    message: '"location" must be a valid uri',
                    segment: 'body'
                }]
            });
        });

        it('validates location', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({ location: 'foo', data: { provider: 'bar' } });

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 422,
                error_msg: UnprocessableEntityError.message,
                error_fields: [{
                    name: 'location',
                    message: '"location" must be a valid uri',
                    segment: 'body'
                }]
            });
        });

        it('requires location and either data.client or data.provider', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({ location: 's3://test-onelivex/transport/foo/bar.csv', data: {} });

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 422,
                error_msg: UnprocessableEntityError.message,
                error_fields: [
                    {
                        name: 'data',
                        message: '"data" must contain at least one of [client, provider]',
                        segment: 'body'
                    }
                ]
            });
        });

        it('can creates sources for clients', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({
                    location: 's3://test-onelivex/transport/fashionnova/FashionNovaOneLiveShipped_202101050730.csv',
                    data: { provider: 'FashionNova', transfer: true }
                });

            expect(response.status).to.eq(202);
        });

        it('can creates sources for providers', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({
                    location: 's3://test-onelivex/transport/fashionnova/FashionNovaOneLiveShipped_202101050730.csv',
                    data: { provider: 'X' }
                });

            expect(response.status).to.eq(202);
        });

        it('can creates sources for providers with transfer', async function () {
            const response = await request(global.server)
                .post('/internal/tracking/v1/source')
                .auth('glacier', gconfig.internalApiKey)
                .send({
                    location: 's3://test-onelivex/transport/fashionnova/FashionNovaOneLiveShipped_202101050730.csv',
                    data: { provider: 'X', transfer: true }
                });

            expect(response.status).to.eq(202);
        });
    });
});
