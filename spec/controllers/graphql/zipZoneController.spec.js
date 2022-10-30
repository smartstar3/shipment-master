const zipZoneController = require('../../../app/controllers/graphql/zipZone');
const { expect, factory } = require('chai');

describe('Graphql ZipZone Controller', () => {
    describe('getZipzone', () => {
        it('returns a specific zipzone by id', async () => {
            const firstZipZone = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZone(null, { _id: firstZipZone._id });
            expect(response).to.deep.eq(firstZipZone);
        });

        it('returns null if zipzone is not found', async () => {
            const response = await zipZoneController.getZipZone(null, { _id: 'abc90981' });
            expect(response).to.eq(null);
        });
    });

    describe('getZipZones', () => {
        it('returns all zipzones for a given zipcode with all carriers', async () => {
            const { _id: firstId, ...restFirst } = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            const { _id: secondId, ...restSecond } = await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZones(null, { searchWord: '90210', carrier: ['testCarrier', 'carrierTest'] });
            expect(response.zipzones.length).to.eq(2);
            expect(response.zipzones).to.deep.eq([{ id: firstId, ...restFirst }, { id: secondId, ...restSecond }]);
        });

        it('returns a subset zipzones for a given zipcode with a single carrier ', async () => {
            await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            const { _id: secondId, ...restSecond } = await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZones(null, { searchWord: '90210', carrier: ['carrierTest'] });
            expect(response.zipzones.length).to.eq(1);
            expect(response.zipzones).to.deep.eq([{ id: secondId, ...restSecond }]);
        });

        it('returns an empty array if no zipcodes found', async () => {
            await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '21030' });
            const response = await zipZoneController.getZipZones(null, { searchWord: '90210', carrier: ['carrierTest'] });
            expect(response.zipzones.length).to.eq(0);
        });

        it('returns hasMore true if there is more', async () => {
            const { _id: firstId, ...restFirst } = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZones(null, { count: 1, searchWord: '90210', carrier: ['testCarrier', 'carrierTest'] });
            expect(response.zipzones.length).to.eq(1);
            expect(response).to.deep.eq({ zipzones: [{ id: firstId, ...restFirst }], hasMore: true });
        });

        it('returns hasMore false if there arent more (count equal to the entire collection)', async () => {
            const { _id: firstId, ...restFirst } = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            const { _id: secondId, ...restSecond } = await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZones(null, { count: 2, searchWord: '90210', carrier: ['testCarrier', 'carrierTest'] });
            expect(response.zipzones.length).to.eq(2);
            expect(response).to.deep.eq({ zipzones: [{ id: firstId, ...restFirst }, { id: secondId, ...restSecond }], hasMore: false });
        });

        it('returns hasMore false if the count exceeds the records available', async () => {
            const { _id: firstId, ...restFirst } = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            const { _id: secondId, ...restSecond } = await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await zipZoneController.getZipZones(null, { count: 3, searchWord: '90210', carrier: ['testCarrier', 'carrierTest'] });
            expect(response.zipzones.length).to.eq(2);
            expect(response).to.deep.eq({ zipzones: [{ id: firstId, ...restFirst }, { id: secondId, ...restSecond }], hasMore: false });
        });
    });
});
