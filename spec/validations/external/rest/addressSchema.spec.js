const { expect } = require('chai');
const { Joi } = require('celebrate');

const getAddressSchema = require('../../../../app/validation/external/rest/addressSchema');

const getAddress = (opts = {}) => ({
    name: 'my home',
    address1: '410 Baylor St',
    address2: '',
    city: 'Austin',
    state: 'TX',
    zip: '78703',
    country: 'US',
    phone: '555-555-5555',
    ...opts
});

describe('address schema test', () => {
    describe('createSchema', () => {
        it('fails with unknown schema type', () => {
            const shouldThrow = () => getAddressSchema('badtype');
            expect(shouldThrow).to.throw(TypeError);
        });

        ['base', 'to', 'from', 'return', undefined].forEach((type) => {
            it(`returns '${type}' address validator`, () => {
                const isSchema = Joi.isSchema(getAddressSchema(type));
                expect(isSchema).to.eq(true);
            });

            it(`validates with '${type}' address validator`, () => {
                const schema = getAddressSchema(type);
                const result = schema.validate(getAddress());
                expect(result.error).to.be.undefined;
            });

            it('truncates zip field to 5 characters', () => {
                const schema = getAddressSchema(type);
                const address = getAddress({ zip: '123456789' });
                const result = schema.validate(address);
                expect(result.error).to.be.undefined;
                expect(result.value.zip).to.eq('12345');
            });
        });
    });

    describe('"to" address schema', () => {
        it('requires a valid phone when signature required', () => {
            const schema = getAddressSchema('to', { signatureRequired: true });
            const result = schema.validate(getAddress({ phone: 'badvalue' }));
            expect(result?.error?.message).to.eq('A valid phone number is required for this shipment');
        });

        it('fails validation if phone is empty string when signature is required', () => {
            const schema = getAddressSchema('to', { signatureRequired: true });
            const result = schema.validate(getAddress({ phone: '' }));
            expect(result?.error?.message).to.eq('"phone" is not allowed to be empty');
        });

        it('passes validation if phone is empty string when signature is not required', () => {
            const schema = getAddressSchema('to');
            const result = schema.validate(getAddress({ phone: '' }));
            expect(result.error).to.be.undefined;
        });

        it('passes validation if phone is null when signature is not required', () => {
            const schema = getAddressSchema('to');
            const result = schema.validate(getAddress({ phone: null }));
            expect(result.error).to.be.undefined;
        });

        for (const phone of [
            '+16823049543',
            '16823049543',
            '6823049543',
            '1-682-304-9543',
            '+1-682-304-9543',
            '1-(682)-304-9543',
            '+1-(682)-304-9543',
            '+1-682-304-9543',
            '+1 (682)-304-9543',
            '+1 682-304-9543',
            '+1 (682) 304-9543',
            '+1 682 304-9543',
            '+1 (682) 304 9543',
            '+1 682 304 9543',
            '6823049543',
            '682 304-9543',
            '682 304 9543',
            '682-304-9543',
            '(682)-304-9543',
            '(682) 304-9543',
            '(682) 304 9543'
        ]) {
            it(`passes for ${phone} when signature required`, () => {
                const schema = getAddressSchema('to', { signatureRequired: true });
                const result = schema.validate(getAddress({ phone }));
                expect(result.error).to.be.undefined;
            });
        }

        it('allows invalid phone number if not signature required', () => {
            const schema = getAddressSchema('to');
            const result = schema.validate(getAddress({ phone: '1234' }));
            expect(result.error).to.be.undefined;
        });

        [
            // test PO/Post office combinations
            'po box 123',
            'PO box 123',
            'PO BOX 123',
            'Po BOx 123',
            'p.o. box 123',
            'p. o. box 123',
            'p o box 123',
            'P O BOX 123',
            'post office box 123',
            'postoffice box 123',
            'Post Office Box 123',
            // test box/drawer/lockbox/bin combinations
            'pob 123',
            'POB 123',
            'POBox 123',
            'PO drawer 123',
            'PO lockbox 123',
            'PO bin 123',
            // box "number" combinations
            'PO Box -0123',
            'PO Box #123',
            'PO Box abc',
            'PO Box ABC',
            'PO Box #abc',
            'PO Box -0123456789',
            'PO Box #0123456789',
            'PO Box 0123456789',
            'PO Box 123abc'
        ].forEach((variant) => {
            it(`fails validation when ${variant} found in address1 in "to" address`, () => {
                const schema = getAddressSchema('to');
                const result = schema.validate(getAddress({ address1: variant }));
                expect(result?.error?.message).to.eq('Ineligible address. PO Boxes are not supported in primary address line.');
            });

            it(`passes validation when ${variant} found in address2 in "to" address`, () => {
                const schema = getAddressSchema('to');
                const result = schema.validate(getAddress({ address2: variant }));
                expect(result.error).to.be.undefined;
            });
        });

        it('passes validation when company_name is provided', () => {
            const schema = getAddressSchema('to');
            const address = getAddress({ company_name: 'OLX' });
            delete address.name;
            const result = schema.validate(address);
            expect(result.error).to.be.undefined;
        });

        it('passes validation when name is provided', () => {
            const schema = getAddressSchema('to');
            const address = getAddress({ name: 'OLX', company_name: 'OLX' });
            delete address.company_name;
            const result = schema.validate(address);
            expect(result.error).to.be.undefined;
        });

        it('passes validation when both name and company_name are provided', () => {
            const schema = getAddressSchema('to');
            const result = schema.validate(getAddress({ name: 'OLX', company_name: 'OLX' }));
            expect(result.error).to.be.undefined;
        });

        it('fails validation when both name and company_name are not provided', () => {
            const schema = getAddressSchema('to');
            const address = getAddress({ name: 'OLX', company_name: 'OLX' });
            delete address.name;
            delete address.company_name;

            const result = schema.validate(address);
            expect(result?.error?.message).to.eq('"value" must contain at least one of [name, company_name]');
        });
    });

    describe('"from" address schema', () => {
        it('passes validation when company_name is provided', () => {
            const schema = getAddressSchema('from');
            const address = getAddress({ company_name: 'OLX' });
            delete address.name;
            const result = schema.validate(address);
            expect(result.error).to.be.undefined;
        });

        it('passes validation when name is provided', () => {
            const schema = getAddressSchema('from');
            const address = getAddress({ name: 'OLX', company_name: 'OLX' });
            delete address.company_name;
            const result = schema.validate(address);
            expect(result.error).to.be.undefined;
        });

        it('passes validation when both name and company_name are provided', () => {
            const schema = getAddressSchema('from');
            const result = schema.validate(getAddress({ name: 'OLX', company_name: 'OLX' }));
            expect(result.error).to.be.undefined;
        });

        it('fails validation when both name and company_name are not provided', () => {
            const schema = getAddressSchema('from');
            const address = getAddress({ name: 'OLX', company_name: 'OLX' });
            delete address.name;
            delete address.company_name;

            const result = schema.validate(address);
            expect(result?.error?.message).to.eq('"value" must contain at least one of [name, company_name]');
        });
    });
});
