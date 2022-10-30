const { expect, factory } = require('chai');

const { present } = require('../../app/presenters/webhook');

describe('Webhook Presenter', () => {
    describe('present', () => {
        it('presents webhook', async () => {
            const webhook = await factory.create('webhook');
            expect(present(webhook)).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: null,
                url: webhook.url
            });
        });

        it('presents webhook with updated_at', async () => {
            const updatedAt = new Date();
            const webhook = await factory.create('webhook', { updatedAt });
            expect(present(webhook)).to.eql({
                id: webhook._id.toString(),
                createdAt: webhook.createdAt.toISOString(),
                updatedAt: updatedAt.toISOString(),
                url: webhook.url
            });
        });
    });
});
