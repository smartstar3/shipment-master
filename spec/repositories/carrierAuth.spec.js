const Provider = require('../../app/repositories/provider');
const { expect, factory } = require('chai');

describe('Provider Repo', () => {
    describe('encryption', () => {
        it('can encrypt a record', async () => {
            const { name, credentials } = await factory.create('providerCreds');
            const doc = await Provider.setCredentials(name, credentials);
            expect(doc.credentials).to.not.deep.eq(credentials);
            const { _id, ...decrypted } = await Provider.getCredentials(name);
            expect(decrypted).to.deep.eq({ name, credentials });
        });

        it('can decrypt a record', async () => {
            const { name, credentials } = await factory.create('providerCreds', { name: 'LSO' });
            await factory.create('provider', { name, credentials });
            const { _id, ...decrypted } = await Provider.getCredentials(name);
            expect(decrypted).to.deep.eq({ name, credentials });
        });

        it('can update a providers credentials', async () => {
            const provider = 'CapitalExpress';
            const credentials = { accountNumber: '12345000' };
            const newCredentials = {
                username: 'user',
                password: 'password'
            };
            await Provider.setCredentials(provider, credentials);
            const { _id, ...decrypted } = await Provider.getCredentials(provider);
            expect(decrypted).to.deep.eq({ name: provider, credentials });
            await Provider.updateCredentials(provider, newCredentials);
            const doc = await Provider.getCredentials(provider);
            expect(doc.credentials).to.deep.eq({
                ...credentials, ...newCredentials
            });
        });

        it('can replace a providers credentials', async () => {
            const newCredentials = { accountNumber: 'ABC' };
            const { name, credentials: oldCreds } = await factory.create('provider');
            await Provider.updateCredentials(name, newCredentials, true);
            const doc = await Provider.getCredentials(name);
            expect(doc.credentials).to.deep.eq(newCredentials);
            expect(doc.credentials).to.not.deep.eq(oldCreds);
        });

        it('can rotate keys', async () => {
            const newSecret = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzABC';
            const { name } = await factory.create('provider');
            // fetch the original doc
            const originalDoc = await Provider.getCredentials(name);
            // rotate the secret
            await Provider.rotateSecret(newSecret);
            const newDoc = await Provider.getCredentials(name);
            // decryption shouldn't work
            expect(newDoc.credentials).to.not.deep.equal(originalDoc.credentials);
            // update the enviroment
            process.env.PROVIDER_AUTH_SECRET = newSecret;
            const rotatedDoc = await Provider.getCredentials(name);
            // decryption should work
            expect(originalDoc.credentials).to.not.deep.equal(rotatedDoc.credentials);
        });
    });
});
