const { expect, factory } = require('chai');

const defaultRules = require('../../../app/subsystems/rulesEngine/defaultRules');
const { CARRIER_NAMES } = require('../../../app/constants/carrierConstants');

const checkEligibility = (zip) => defaultRules(CARRIER_NAMES.dhlecommerce, zip);

describe('Default Rules Engine', () => {
    it('rejects on invalid carrier', async () => {
        const zipZone = await factory.create('dhlecommerceZipZone');

        const promise = defaultRules('badcarrier', {
            zipcode: zipZone.zipcode,
            weight: 1,
            shipperId: 1
        });

        await expect(promise).to.be.rejectedWith(Error);
    });

    it('returns null on missing zip', async () => {
        const result = await defaultRules(CARRIER_NAMES.dhlecommerce, undefined);
        expect(result).to.be.null;
    });

    it('returns null on invalid zip value (non-object)', async () => {
        const result = await defaultRules(CARRIER_NAMES.dhlecommerce, '75243');
        expect(result).to.be.null;
    });

    it('returns shipper specific zipZone if available', async () => {
        await factory.create('dhlecommerceZipZone');
        const zipZone = await factory.create('dhlecommerceZipZone', { shipper_id: 1 });

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 1,
            shipperId: 1
        });

        expect(result).to.eql(zipZone);
    });

    it('returns null if wrong shipper', async () => {
        const zipZone = await factory.create('dhlecommerceZipZone', { shipper_id: 2 });

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 1,
            shipperId: 1
        });
        expect(result).to.eq(null);
    });

    it('returns null if overweight', async () => {
        const zipZone = await factory.create('dhlecommerceZipZone');

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 1121,
            shipperId: 1
        });
        expect(result).to.eq(null);
    });

    it('chooses the highest weight without going over', async () => {
        await factory.create(
            'dhlecommerceZipZone',
            { max_weight: 5, options: { name: '5' } }
        );
        await factory.create(
            'dhlecommerceZipZone',
            { max_weight: 15, options: { name: '15' } }
        );
        const zipZone = await factory.create(
            'dhlecommerceZipZone',
            { max_weight: 10, options: { name: '10' } }
        );

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 10,
            shipperId: 1
        });
        expect(result).to.eql(zipZone);
    });

    it('will override the default rule if one exists for shipper_id', async () => {
        await factory.create(
            'dhlecommerceZipZone',
            { shipper_id: null, options: { name: 'null' } }
        );
        await factory.create(
            'dhlecommerceZipZone',
            { shipper_id: 5, options: { name: '5' } }
        );
        await factory.create(
            'dhlecommerceZipZone',
            { shipper_id: 15, options: { name: '15' } }
        );
        const zipZone = await factory.create(
            'dhlecommerceZipZone',
            { shipper_id: 10, options: { name: '10' } }
        );

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 1,
            shipperId: 10
        });
        expect(result).to.eql(zipZone);
    });

    it('does not select other carriers zipZones', async () => {
        const zipZone = await factory.create('dhlecommerceZipZone', { carrier: 'UDS' });

        const result = await checkEligibility({
            zipcode: zipZone.zipcode,
            weight: 1,
            shipperId: 1
        });
        expect(result).to.eq(null);
    });

    it('does nothing if no target_zip', async () => {
        const result = await checkEligibility({});
        expect(result).to.eq(null);
    });

    it('returns null if no zipZone is found', async () => {
        await factory.create('dhlecommerceZipZone', { carrier: 'UDS' });

        const result = await checkEligibility({
            zipcode: '99999',
            weight: 1,
            shipperId: 1
        });
        expect(result).to.eq(null);
    });
});
