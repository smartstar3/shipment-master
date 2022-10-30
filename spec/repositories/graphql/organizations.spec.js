const { expect, factory } = require('chai');

const organizationGQLRepo = require('../../../app/repositories/graphql/organizations');

describe('Organization Graphql Repository', () => {
    describe('getApiKey', () => {
        it('return null if nothing found', async () => {
            const args = {
                apiId: 'XYZ-123-455',
                organizationScope: ['4']
            };

            return organizationGQLRepo.getApiKey(args).then(
                (res) => {
                    expect(res).to.eq(null);
                },
                (e) => {
                    throw e;
                }
            );
        });

        it('return org with apikey if apiId and scope are valid ', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 1 });

            const args = {
                apiId: org.apiId,
                organizationScope: [org.shipperSeqNum]
            };

            return organizationGQLRepo.getApiKey(args).then(
                (res) => {
                    expect(res.apiId).to.eq(args.apiId);
                },
                (e) => {
                    throw e;
                }
            );
        });

        it('return null if invalid apiId but valid scope ', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 1 });

            const args = {
                apiId: 'invaidKey',
                organizationScope: [org.shipperSeqNum]
            };

            return organizationGQLRepo.getApiKey(args).then(
                (res) => {
                    expect(res).to.eq(null);
                },
                (e) => {
                    throw e;
                }
            );
        });

        it('return null if valid apiId but invalid scope ', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 1 });

            const args = {
                apiId: org.apiId,
                organizationScope: [5]
            };

            return organizationGQLRepo.getApiKey(args).then(
                (res) => {
                    expect(res).to.eq(null);
                },
                (e) => {
                    throw e;
                }
            );
        });
    });

    describe('getRateCard', () => {
        it('returns an empty array if no rates are found', async () => {
            const res = await organizationGQLRepo.getRateCard({ shipperId: 1 });
            expect(res.length).to.eq(0);
        });

        it('returns all rate card weight rows if a card is found for a given shipper', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 1 });
            const weightOne = await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 1,
                weight: 16,
                cost: 50
            });
            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 2,
                weight: 16,
                cost: 50
            });
            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 1,
                weight: 32,
                cost: 50
            });
            const res = await organizationGQLRepo.getRateCard({ shipperId: org.shipperSeqNum });
            // 2 weights (16 & 32) give 2 results;
            expect(res.length).to.eq(2);
            expect(res[0].weight).to.eq(weightOne.weight);
            // 16 oz has 2 rates
            expect(Object.keys(res[0].rates).length).to.eq(2);
        });

        it('only returns rates for the given org', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 1 });
            const orgTwo = await factory.create('organization', { shipperSeqNum: 2 });

            await factory.create('rateCards', {
                shipperId: orgTwo.shipperSeqNum,
                zone: 1,
                weight: 16,
                cost: 50
            });
            const rateCardOne = await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 2,
                weight: 16,
                cost: 50
            });
            await factory.create('rateCards', {
                shipperId: orgTwo.shipperSeqNum,
                zone: 1,
                weight: 32,
                cost: 50
            });
            const res = await organizationGQLRepo.getRateCard({ shipperId: org.shipperSeqNum });
            expect(res.length).to.eq(1);
            expect(res[0].weight).to.eq(rateCardOne.weight);
            expect(Object.keys(res[0].rates).length).to.eq(1);
        });
    });

    describe('getTerminalProviders', () => {
        it('returns the correct carrier order given a shipperSeqNum', async () => {
            const CARRIER_ORDER = ['Carrier A', 'Carrier C', 'Carrier B'];
            const org = await factory.create('organization', { shipperSeqNum: 1, terminalProviderOrder: CARRIER_ORDER });
            const res = await organizationGQLRepo.getTerminalProviders({ shipperSeqNum: org.shipperSeqNum });
            expect(res).to.deep.eq(CARRIER_ORDER);
        });
        it('returns an empty array if shipperSeqNum doesnt exist', async () => {
            const res = await organizationGQLRepo.getTerminalProviders({ shipperSeqNum: 20 });
            expect(res.length).to.eq(0);
        });

        it('returns an empty array if carrier does not have a terminalProviderOrder ', async () => {
            await factory.create('organization', { shipperSeqNum: 1, terminalProviderOrder: [] });
            const res = await organizationGQLRepo.getTerminalProviders({ shipperSeqNum: 1 });
            expect(res.length).to.eq(0);
        });
    });
});
