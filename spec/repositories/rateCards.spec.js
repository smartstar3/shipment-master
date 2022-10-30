const { expect, factory } = require('chai');

const rateCardsRepo = require('../../app/repositories/rateCards');

describe('rateCards repository', () => {
    describe('getCost', () => {
        it('can lookup a cost for a shipper when that cost exists in a valid table', async () => {
            await factory.create('rateCards', { shipperId: 1, cost: 6.00 });
            const response = await rateCardsRepo.getCost(1, 1, 1);
            expect(response).to.eq(6.00);
        });

        it('returns the zone default when the shipper doesnt have a weight in the table', async () => {
            await factory.create('rateCards', { shipperId: null, weight: 1, zone: 1, cost: 20.00 });
            const response = await rateCardsRepo.getCost(2, 1, 1);
            expect(response).to.eq(20.00);
        });

        it('returns the default when the shipper doesnt have an in date table ', async () => {
            await factory.create('rateCards', { shipperId: null, weight: 30, zone: 8, cost: 200.00 });
            await factory.create('rateCards', {
                shipperId: 3,
                effectiveAt: new Date('2022-01-01'),
                expiresAt: new Date('2023-01-01'),
                weight: 30,
                zone: 8,
                cost: 50.00
            });
            const response = await rateCardsRepo.getCost(3, 30, 8);
            expect(response).to.eq(200.00);
        });

        it('returns the default when the shipper doesnt have an in date table (null expiry) ', async () => {
            await factory.create('rateCards', { shipperId: null, weight: 30, zone: 8, cost: 200.00 });
            await factory.create('rateCards', {
                shipperId: 3,
                effectiveAt: new Date('2022-01-01'),
                expiresAt: null,
                weight: 30,
                zone: 8,
                cost: 50.00
            });
            const response = await rateCardsRepo.getCost(3, 30, 8);
            expect(response).to.eq(200.00);
        });

        it('returns the nearest greater than value when an exact weight is not present', async () => {
            await factory.create('rateCards', { shipperId: 10, weight: 100, zone: 8, cost: 200.00 });
            await factory.create('rateCards', { shipperId: 10, weight: 50, zone: 8, cost: 100.00 });
            const response = await rateCardsRepo.getCost(10, 51, 8);
            expect(response).to.eq(200.00);
        });
    });

    describe('getCost - un-initialized DB', () => {
        it('returns the extreme default if the DB does not contain a default rate', async () => {
            const response = await rateCardsRepo.getCost(1, 1, 1);
            expect(response).to.eq(null);
        });
    });
});
