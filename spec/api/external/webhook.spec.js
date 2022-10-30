const { expect, factory, request } = require('chai');
const { UnauthorizedError } = require('errors');

const gconfig = require('../../../app/config');
const mongo = require('../../../app/helpers/mongo');

describe('/service/v1', () => {
    describe('POST /webhook', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .post('/service/v1/webhook');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('creates a webhook', async () => {
            const org = await factory.create('organization');
            const url = 'https://www.foo.bar/webhook';
            const response = await request(global.server)
                .post('/service/v1/webhook')
                .auth(org.apiId, org.apiKey)
                .send({ url });

            expect(response.status).to.eq(201);

            const webhooks = mongo.get().db(gconfig.mongoDBName).collection('webhooks');
            expect(await webhooks.countDocuments()).to.eq(1);

            const webhook = await webhooks.findOne();
            expect(webhook.shipper).to.eql(org.shipperSeqNum);
            expect(webhook.url).to.eq(url);

            expect(response.body).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: null,
                url: webhook.url
            });
        });

        it('rejects non-https urls', async () => {
            const org = await factory.create('organization');
            const url = 'http://new.cool.com/webhook';

            const response = await request(global.server)
                .post('/service/v1/webhook')
                .auth(org.apiId, org.apiKey)
                .send({ url });

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([{
                message: '"url" must be a valid uri with a scheme matching the https pattern',
                name: 'url',
                segment: 'body'
            }]);
        });
    });

    describe('GET /webhook/:id', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .get('/service/v1/webhook/60c7f2a9caa2c714d07039f1');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('finds existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', {
                shipper: org.shipperSeqNum
            });

            const response = await request(global.server)
                .get(`/service/v1/webhook/${webhook._id}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: null,
                url: webhook.url
            });
        });

        it('rejects invalid ids', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .get('/service/v1/webhook/foobar')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([
                {
                    message: '"id" length must be 24 characters long',
                    name: 'id',
                    segment: 'params'
                }
            ]);
        });
    });

    describe('PUT /webhook/:id', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .put('/service/v1/webhook/60c7f2a9caa2c714d07039f1');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('updates existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', {
                shipper: org.shipperSeqNum
            });
            const url = 'https://new.cool.com/webhook';

            const response = await request(global.server)
                .put(`/service/v1/webhook/${webhook._id}`)
                .auth(org.apiId, org.apiKey)
                .send({ url });

            const webhooks = mongo.get().db(gconfig.mongoDBName).collection('webhooks');
            expect(await webhooks.countDocuments()).to.eq(1);

            const updated = await webhooks.findOne();
            expect(updated.shipper).to.eql(org.shipperSeqNum);
            expect(updated.url).to.eq(url);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                id: updated._id.toString(),
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
                url: url
            });
        });

        it('rejects invalid ids', async () => {
            const org = await factory.create('organization');
            const url = 'https://new.cool.com/webhook';

            const response = await request(global.server)
                .put('/service/v1/webhook/foobar')
                .auth(org.apiId, org.apiKey)
                .send({ url });

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([
                {
                    message: '"id" length must be 24 characters long',
                    name: 'id',
                    segment: 'params'
                }
            ]);
        });

        it('rejects non-https urls', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', {
                shipper: org.shipperSeqNum
            });
            const url = 'http://new.cool.com/webhook';

            const response = await request(global.server)
                .put(`/service/v1/webhook/${webhook._id}`)
                .auth(org.apiId, org.apiKey)
                .send({ url });

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([{
                message: '"url" must be a valid uri with a scheme matching the https pattern',
                name: 'url',
                segment: 'body'
            }]);
        });
    });

    describe('DELETE /webhook/:id', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .delete('/service/v1/webhook/60c7f2a9caa2c714d07039f1');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('deletes existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', {
                shipper: org.shipperSeqNum
            });

            const response = await request(global.server)
                .delete(`/service/v1/webhook/${webhook._id}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(204);
        });

        it('rejects invalid ids', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .delete('/service/v1/webhook/foobar')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([
                {
                    message: '"id" length must be 24 characters long',
                    name: 'id',
                    segment: 'params'
                }
            ]);
        });
    });
});
