const { expect } = require('chai');
const { ValidationError } = require('joi');

const getRateValidator = require('../../../../app/validation/external/rest/rateValidator');

const getValidator = () => getRateValidator({ response: true });

const shouldThrow = (opts = { response: true }, input) => {
    const validator = getValidator(opts);
    expect(() => validator(input)).to.throw(ValidationError);
};

describe('Rate Validator Test', () => {
    given('input', () => {
        return {
            shipper_name: 'Dmitry',
            shipper_phone: '14353452341',
            reference_id: '231434567456',
            reference_data: 'reference description',
            to_address: {
                name: 'my home',
                address1: '100 S Van Buren St',
                address2: '',
                city: 'Shipshewana',
                state: 'IN',
                zip: '10801',
                country: 'US',
                phone: '1368453542'
            },
            from_address: {
                name: 'my office',
                address1: '8487 Middle St',
                address2: '',
                city: 'Stinesville',
                state: 'IN',
                zip: '93011',
                country: 'US',
                phone: '1368453542'
            },
            parcel: {
                description: 'my t-shirt',
                length: '12.4',
                width: '10.0',
                height: '4.0',
                weight: '6.0',
                value: '160.00',
                attributes: {},
                reference: '324234532'
            },
            label_format: 'Z4x6',
            rate: {
                cost: '5.00',
                dollar_cost: '$5.00',
                billable_weight: 6,
                zone: 8,
                use_dim_weight: false
            }
        };
    });

    describe('request validation', () => {
        it('fails function validator creation when response option not passed', () => {
            expect(() => getRateValidator()).to.throw(Error);
        });
    });

    describe('response validation', () => {
        it('passes when valid', () => {
            const validator = getValidator();
            const result = validator(given.input);
            expect(result).to.eql(given.input);
        });

        it('cost is required', () => {
            delete given.input.rate.cost;
            shouldThrow(given.input);
        });

        it('billable_weight is required', () => {
            delete given.input.rate.billable_weight;
            shouldThrow(given.input);
        });

        it('use_dim_weight is required', () => {
            delete given.input.rate.use_dim_weight;
            shouldThrow(given.input);
        });

        it('zone is required', () => {
            delete given.input.rate.zone;
            shouldThrow(given.input);
        });

        it('zone can be null', () => {
            const validator = getValidator();
            given.input.rate.zone = null;
            expect(validator(given.input)).to.eql(given.input);
        });

        it('zone can be empty', () => {
            const validator = getValidator();
            given.input.rate.zone = '';
            expect(validator(given.input)).to.eql(given.input);
        });

        it('dollar_cost is required', () => {
            delete given.input.rate.dollar_cost;
            shouldThrow(given.input);
        });
    });
});
