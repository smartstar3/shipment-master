const MockResponse = require('mock-express-response');
const { expect, factory } = require('chai');
const { NotFoundError, UnprocessableEntityError } = require('errors');

const gconfig = require('../../../app/config');
const mongo = require('../../../app/helpers/mongo');
const {
    createWebhookMiddleware,
    getWebhookMiddleware,
    updateWebhookMiddleware,
    deleteWebhookMiddleware
} = require('../../../app/controllers/rest/webhook');

describe('Webhooks Controller', () => {
    describe('createWebhookMiddleware', () => {
        it('successfully creates webhooks', async () => {
            const org = await factory.create('organization');
            const url = 'https://www.foo.bar/webhook';
            const req = { org, body: { url } };
            const res = new MockResponse();

            await createWebhookMiddleware(req, res);

            expect(res.statusCode).to.eq(201);

            const webhooks = mongo.get().db(gconfig.mongoDBName).collection('webhooks');
            expect(await webhooks.countDocuments()).to.eq(1);

            const webhook = await webhooks.findOne();
            expect(webhook.shipper).to.eql(org.shipperSeqNum);
            expect(webhook.url).to.eq(url);

            expect(res._getJSON()).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: null,
                url: webhook.url
            });
        });

        for (const hostname of ['127.0.0.1', 'localhost', 'api.xdelivery.ai']) {
            it(`rejects ${hostname} urls`, async () => {
                const org = await factory.create('organization');
                const url = `https://${hostname}:5000/webhook`;
                const req = { org, body: { url } };
                const res = new MockResponse();

                await expect(createWebhookMiddleware(req, res)).to.be.rejectedWith(
                    UnprocessableEntityError
                );
            });
        }
    });

    describe('getWebhookMiddleware', () => {
        it('finds existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', { shipper: org.shipperSeqNum });
            const req = { org, params: { id: webhook._id.toString() } };
            const res = new MockResponse();

            await getWebhookMiddleware(req, res);

            expect(res.statusCode).to.eq(200);
            expect(res._getJSON()).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: null,
                url: webhook.url
            });
        });

        it('sets status to 404 for unknown ids', async () => {
            const org = await factory.create('organization');
            const req = { org, params: { id: '60c7f2a9caa2c714d07039f1' } };
            const res = new MockResponse();

            await expect(getWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });

        it('does not allow viewing other orgs webhooks', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook');
            expect(org.shipperSeqNum).not.to.eql(webhook.shipper);

            const req = { org, params: { id: webhook._id.toString() } };
            const res = new MockResponse();

            await expect(getWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });
    });

    describe('updateWebhookMiddleware', () => {
        it('updates existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', { shipper: org.shipperSeqNum });
            const url = 'https://new.cool.com/webhook';
            const req = { org, params: { id: webhook._id.toString() }, body: { url } };
            const res = new MockResponse();

            await updateWebhookMiddleware(req, res);

            expect(res.statusCode).to.eq(200);

            const webhooks = mongo.get().db(gconfig.mongoDBName).collection('webhooks');
            expect(await webhooks.countDocuments()).to.eq(1);

            const updated = await webhooks.findOne();
            expect(updated.shipper).to.eql(org.shipperSeqNum);
            expect(updated.url).to.eq(url);

            expect(res._getJSON()).to.eql({
                id: updated._id.toString(),
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
                url: url
            });
        });

        it('sets status to 404 for unknown ids', async () => {
            const org = await factory.create('organization');
            const url = 'https://new.cool.com/webhook';
            const req = { org, params: { id: '60c7f2a9caa2c714d07039f1' }, body: { url } };
            const res = new MockResponse();

            await expect(updateWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });

        it('does not allow viewing other orgs webhooks', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook');
            expect(org.shipperSeqNum).not.to.eql(webhook.shipper);

            const url = 'https://new.cool.com/webhook';
            const req = { org, params: { id: webhook._id.toString() }, body: { url } };
            const res = new MockResponse();

            await expect(updateWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });

        for (const hostname of ['127.0.0.1', 'localhost', 'api.xdelivery.ai']) {
            it(`rejects ${hostname} urls`, async () => {
                const org = await factory.create('organization');
                const webhook = await factory.create('webhook', { shipper: org.shipperSeqNum });
                const url = `https://${hostname}:5000/webhook`;
                const req = { org, params: { id: webhook._id.toString() }, body: { url } };
                const res = new MockResponse();

                await expect(updateWebhookMiddleware(req, res)).to.be.rejectedWith(
                    UnprocessableEntityError
                );
            });
        }
    });

    describe('deleteWebhookMiddleware', () => {
        it('deletes existing webhook', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook', { shipper: org.shipperSeqNum });
            const req = { org, params: { id: webhook._id.toString() } };
            const res = new MockResponse();

            await deleteWebhookMiddleware(req, res);

            expect(res.statusCode).to.eq(204);
        });

        it('sets status to 404 for unknown ids', async () => {
            const org = await factory.create('organization');
            const req = { org, params: { id: '60c7f2a9caa2c714d07039f1' } };
            const res = new MockResponse();

            await expect(deleteWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });

        it('does not allow viewing other orgs webhooks', async () => {
            const org = await factory.create('organization');
            const webhook = await factory.create('webhook');
            expect(org.shipperSeqNum).not.to.eql(webhook.shipper);

            const req = { org, params: { id: webhook._id.toString() } };
            const res = new MockResponse();

            await expect(deleteWebhookMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });
    });
});
