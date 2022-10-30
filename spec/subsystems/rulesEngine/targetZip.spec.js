'use strict';

const { expect, factory } = require('chai');

const targetZip = require('../../../app/subsystems/rulesEngine/targetZip');
const { CARRIER_NAMES } = require('../../../app/constants/carrierConstants');

/**
 * Note: when formulating test targetZip objects, passing a `name` value of `test` can be used to
 * simulate a fact being enabled in the rules engine. This case causes ontrac, uds, lso, and laserShip
 * facts to be checks for eligibility. Without this flag, only uds and lasership
 */

describe('Target Zip Rules Engine', () => {
    describe('General', () => {
        it('returns null if no ZipZone found', async () => {
            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', terminalProviderOrder: [] },
                { to_address: { zip: '99999' }, parcel: { weight: 1 } }
            );

            expect(fact).to.eq(null);
        });

        it('returns null on tobacco order if no matching tobacco zone', async () => {
            const zipZone = await factory.create('zipZone');

            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', settings: { tobacco: true }, terminalProviderOrder: [] },
                {
                    to_address: { zip: zipZone.zipcode },
                    parcel: { weight: 1 }
                }
            );

            expect(fact).to.eq(null);
        });

        it('resolves to correct fact on tobacco order', async () => {
            const zipZone = await factory.create('lsoZipZoneVape');

            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.lso] },
                {
                    to_address: { zip: zipZone.zipcode },
                    parcel: { weight: 1 }
                }
            );

            expect(fact.carrier).to.eq(zipZone.carrier);
            expect(fact.zipcode).to.eq(zipZone.zipcode);
        });
    });

    describe('default facts', () => {
        describe('UDS', () => {
            it('resolves the correct fact', async () => {
                const zipZone = await factory.create('udsZipZone');

                const fact = await targetZip(
                    { shipperSeqNum: 1, name: 'nomatch', terminalProviderOrder: [CARRIER_NAMES.uds] },
                    { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
                );

                expect(fact.carrier).to.eq('UDS');
                expect(fact.zipcode).to.eq(zipZone.zipcode);
            });
        });

        describe('LaserShip', () => {
            it('resolves the correct fact', async () => {
                const zipZone = await factory.create('lasershipZipZone');

                const fact = await targetZip(
                    { shipperSeqNum: 1, name: 'nomatch', terminalProviderOrder: [CARRIER_NAMES.laserShip] },
                    { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
                );
                expect(fact.carrier).to.eq('LaserShip');
                expect(fact.zipcode).to.eq(zipZone.zipcode);
            });
        });
    });

    describe('OnTrac', () => {
        it('resolves when enabled', async () => {
            const zipZone = await factory.create('ontracZipZone');

            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', terminalProviderOrder: [CARRIER_NAMES.ontrac] },
                { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
            );
            expect(fact.carrier).to.eq('OnTrac');
            expect(fact.zipcode).to.eq(zipZone.zipcode);
        });

        it('returns null if not enabled', async () => {
            const zipZone = await factory.create('ontracZipZone');

            expect(
                await targetZip(
                    { shipperSeqNum: 1, name: 'nomatch', terminalProviderOrder: [] },
                    { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
                )
            ).to.eq(null);
        });
    });

    describe('DHL eCommerce', () => {
        it.skip('resolves when enabled', async () => {
            const zipZone = await factory.create('dhlecommerceZipZone');

            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', terminalProviderOrder: [CARRIER_NAMES.dhlecommerce] },
                { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
            );
            expect(fact.carrier).to.eq('DHLeCommerce');
            expect(fact.zipcode).to.eq(zipZone.zipcode);
        });

        it('returns null if not enabled', async () => {
            const zipZone = await factory.create('dhlecommerceZipZone');

            expect(
                await targetZip(
                    { shipperSeqNum: 1, name: 'nomatch', terminalProviderOrder: [] },
                    { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
                )
            ).to.eq(null);
        });
    });

    describe('LSO', () => {
        it('resolves when enabled', async () => {
            const zipZone = await factory.create('lsoZipZone');

            const fact = await targetZip(
                { shipperSeqNum: 1, name: 'test', terminalProviderOrder: [CARRIER_NAMES.lso] },
                { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
            );
            expect(fact.carrier).to.eq('LSO');
            expect(fact.zipcode).to.eq(zipZone.zipcode);
        });

        it('returns null if not enabled', async () => {
            const zipZone = await factory.create('lsoZipZone');

            expect(
                await targetZip(
                    { shipperSeqNum: 1, name: 'nomatch', terminalProviderOrder: [] },
                    { to_address: { zip: zipZone.zipcode }, parcel: { weight: 1 } }
                )
            ).to.eq(null);
        });
    });
});
