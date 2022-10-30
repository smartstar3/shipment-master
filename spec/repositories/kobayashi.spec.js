const { expect } = require('chai');
const { Kobayashi } = require('kobayashi');

const kobayashi = require('../../app/repositories/kobayashi');

describe('kobayashi', () => {
    describe('getClient', () => {
        it('creates a new client and then reuses it', () => {
            const client = kobayashi.getClient();
            expect(client instanceof Kobayashi).to.eq(true);
            expect(kobayashi.getClient()).to.eql(client);
        });
    });
});
