const { expect } = require('chai');
const { Joi } = require('celebrate');

const { ValidationError } = Joi;

const getParcelSchema = require('../../../../app/validation/external/rest/parcelSchema');

// tobacco weight limit in oz
const tobaccoWeightLimits = {
    consumer: 10 * 16,
    business: 35 * 16
};

describe('parcel schema test', () => {
    describe('createSchema', () => {
        for (const opts of [
            {},
            { businessRecipient: true },
            { response: true },
            { businessRecipient: true, response: true },
            undefined
        ]) {
            const json = JSON.stringify(opts);
            const schema = getParcelSchema(opts);

            const businessRecipient = opts?.businessRecipient ?? false;
            const response = opts?.response ?? false;
            const weightLimit = businessRecipient
                ? tobaccoWeightLimits.business
                : tobaccoWeightLimits.consumer;

            const getParcel = (opts = {}) => ({
                description: 'my t-shirt',
                length: '12.4',
                width: '10.0',
                height: '4.0',
                weight: '6.0',
                value: '10.06',
                attributes: {},
                reference: '324234532',
                ...response ? { tracking_num: 'abc123', carrier: 'UDS' } : {},
                ...opts
            });

            describe(`using opts '${json}'`, () => {
                it('returns parcel validator using opts', () => {
                    const isSchema = Joi.isSchema(schema);
                    expect(isSchema).to.eq(true);
                });

                it('validates parcel with validator', () => {
                    const parcel = getParcel();
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.undefined;
                    expect(result.value).to.eql(parcel);
                });

                for (const weight of [1, 1.2, '1', '1.2']) {
                    it(`accepts weight of ${typeof weight} ${weight}`, () => {
                        const parcel = getParcel({ weight });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.undefined;
                        expect(result.value).to.eql(parcel);
                    });
                }

                for (const weight of [0, '0', -1, '-1', -1.2, '-1.2']) {
                    it(`rejects weight of ${typeof weight} ${weight}`, () => {
                        const parcel = getParcel({ weight });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.instanceOf(ValidationError);
                        expect(result.error.message).to.eq('"weight" must be greater than 0');
                    });
                }

                for (const weight of ['asdf', '12asdf']) {
                    it(`rejects weight of ${weight}`, () => {
                        const parcel = getParcel({ weight });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.instanceOf(ValidationError);
                        expect(result.error.message).to.eq('"weight" must be a number');
                    });
                }

                it('rejects weight of ""', () => {
                    const parcel = getParcel({ weight: '' });
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.instanceOf(ValidationError);
                    expect(result.error.message).to.eq('"weight" is not allowed to be empty');
                });

                it('rejects weight of null', () => {
                    const parcel = getParcel({ weight: null });
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.instanceOf(ValidationError);
                    expect(result.error.message).to.eq('"weight" must be one of [string, number]');
                });

                it('rejects weight of undefined', () => {
                    const parcel = getParcel({ weight: undefined });
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.instanceOf(ValidationError);
                    expect(result.error.message).to.eq('"weight" is required');
                });

                it('fails validation for bad parcel.attributes.delivery_confirmation value', () => {
                    const parcel = getParcel({ attributes: { delivery_confirmation: 'badvalue' } });
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.instanceOf(ValidationError);
                    expect(result.error.message).to.match(
                        /"attributes.delivery_confirmation" must be one of/
                    );
                });

                it('fails validation for bad parcel.attributes.substance value', () => {
                    const parcel = getParcel({ attributes: { substance: 'badvalue' } });
                    const result = schema.validate(parcel);
                    expect(result.error).to.be.instanceOf(ValidationError, 'asdf');
                });

                if (response) {
                    it('validation fails if missing tracking_num', () => {
                        const parcel = getParcel({ tracking_num: null, carrier: 'UDS' });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.instanceOf(ValidationError);
                        expect(result.error.message).to.eq('"tracking_num" must be a string');
                    });

                    it('validation fails if missing carrier', () => {
                        const parcel = getParcel({ tracking_num: 'abc123', carrier: null });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.instanceOf(ValidationError);
                        expect(result.error.message).to.match(/"carrier" must be one of/);
                    });
                } else {
                    it(`if substance is tobacco, weight cannot exceed ${weightLimit}oz`, () => {
                        const parcel = getParcel({
                            weight: (weightLimit + 1).toString(),
                            attributes: { substance: 'tobacco' }
                        });
                        const result = schema.validate(parcel);
                        expect(result.error).to.be.instanceOf(ValidationError);
                        expect(result.error.message).to.eq(
                            `"weight" must be less than or equal to ${weightLimit}`
                        );
                    });
                }
            });
        }
    });
});
