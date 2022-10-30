const { expect } = require('chai');
const { ValidationError } = require('joi');

const getOrderValidator = require('../../../../app/validation/external/rest/orderValidator');
const { toJsonSorted } = require('../../../../app/helpers/utils');

const optsToTest = [
    {},
    {
        controlledSubstance: 'tobacco'
    },
    {
        businessRecipient: true
    },
    {
        response: true
    },
    {
        businessRecipient: true,
        controlledSubstance: 'tobacco'
    }
];

const optsMap = {};

optsToTest.forEach((opts) => {
    const key = toJsonSorted(opts);
    optsMap[key] = opts;
});

const modifyInput = (input, field, replacement) => {
    const fields = field.split('.');

    let i = 0;
    let target = input;
    const maxIdx = fields.length - 1;

    while (i < maxIdx) {
        const key = fields[i];
        target = target[key];
        i++;
    }

    if (replacement === undefined) {
        delete target[fields[maxIdx]];
    } else {
        target[fields[maxIdx]] = replacement;
    }

    return input;
};

describe('Order Validator Test', () => {
    given('input', () => {
        return {
            shipper_name: 'TEST',
            shipper_phone: '4567891234',
            reference_id: '',
            reference_data: '',
            to_address: {
                name: 'John Doe',
                address1: '100 1st st',
                address2: '',
                city: 'CITY',
                state: 'KY',
                zip: '02044',
                country: 'US',
                phone: '7024652302'
            },
            from_address: {
                name: 'Jane Doe',
                address1: '200 2nd St',
                address2: '',
                city: 'CITY',
                state: 'KY',
                zip: '02044',
                country: 'US',
                phone: '1368453542'
            },
            parcel: {
                description: 'Clothing',
                length: '12.0',
                width: '10.0',
                height: '10.0',
                weight: '32.0',
                value: '39.99',
                attributes: {},
                reference: ''
            },
            label_format: 'Z4x6'
        };
    });

    it('creates validator with default opts', () => {
        const validator = getOrderValidator();
        expect(validator).to.be.instanceOf(Function);
    });

    Object.entries(optsMap).forEach(([memo, opts]) => {
        const { response } = opts;

        describe(`opts: '${memo}'`, () => {
            let validator = null;

            it('creates validator', () => {
                validator = getOrderValidator(opts);
                if (!validator) throw new Error('unable to complete test due to missing validator');

                expect(validator).to.be.instanceOf(Function);
            });

            const getInput = (givenObj) => {
                const input = givenObj.input;

                if (!response) return input;

                return {
                    ...input,
                    parcel: {
                        ...input.parcel,
                        tracking_num: '1LSCYJR0008YXLE',
                        carrier: 'LaserShip'
                    },
                    rate: {
                        billable_weight: 32,
                        cost: '899.00',
                        dollar_cost: '$899.00',
                        zone: 8,
                        use_dim_weight: false
                    },
                    tracking_number: 'XLX004000F80WZ76T',
                    tracking_url: 'https://localhost:8002/XLX004000F80WZ76T',
                    label_base64: 'reallyCoolBase64==',
                    create_time: '2021-05-03T18:54:51.098Z',
                    cancelled_time: null
                };
            };

            const shouldEqual = (test, expected) => {
                const result = validator(test);
                expect(result).to.deep.eql(expected);
            };

            const shouldThrow = (input) => {
                expect(() => validator(input)).to.throw(ValidationError);
            };

            const requiredButEmpty = (field) => {
                it(`${field} can be null`, () => {
                    const input = modifyInput(
                        getInput(given),
                        field,
                        null
                    );
                    shouldEqual(input, input);
                });

                it(`${field} can be empty string`, () => {
                    const input = modifyInput(
                        getInput(given),
                        field,
                        ''
                    );
                    shouldEqual(input, input);
                });

                isRequired(field);
            };

            const isRequired = (field) => {
                it(`${field} is required`, () => {
                    const input = modifyInput(
                        getInput(given),
                        field
                    );
                    shouldThrow(input);
                });
            };

            // reserve for future use
            /* eslint-disable-next-line no-unused-vars */
            const isBooleanOrBooleanString = (field) => {
                it(`${field} fails on non-boolean value`, () => {
                    const input = getInput(given);
                    input[field] = 'bad value';
                    shouldThrow(input);
                });

                it(`${field} validates as boolean false`, () => {
                    const input = getInput(given);
                    input[field] = false;
                    shouldEqual(input, input);
                });
            };

            it('returns same validator function given same options', () => {
                const validator2 = getOrderValidator(opts);
                expect(validator2).to.equal(validator);
            });

            it('passes when valid', () => {
                const input = getInput(given);
                shouldEqual(input, input);
            });

            isRequired('to_address', given);
            isRequired('parcel', given);

            requiredButEmpty('shipper_name', given);
            requiredButEmpty('shipper_phone', given);
            requiredButEmpty('reference_id', given);
            requiredButEmpty('reference_data', given);

            it('label_format should be in [P4x6, Z4x6]', () => {
                const input = getInput(given);
                input.label_format = 'invalid format';
                shouldThrow(input);
            });

            if (response) {
                isRequired('tracking_number', given);
                isRequired('tracking_url', given);

                requiredButEmpty('label_base64', given);
                requiredButEmpty('create_time', given);
                requiredButEmpty('cancelled_time', given);

                isRequired('rate.cost', given);
                isRequired('rate.billable_weight', given);
                isRequired('rate.use_dim_weight', given);
                isRequired('rate.dollar_cost', given);
                requiredButEmpty('rate.zone', given);
            }
        });
    });
});
