const { Joi } = require('celebrate');

const { CARRIER_NAMES } = require('../../../constants/carrierConstants');
const { CONTROLLED_SUBSTANCES, DELIVERY_CONFIRMATION_TYPE } = require('../../../constants/olxConstants');

// tobacco weight limit in oz
const tobaccoWeightLimits = {
    consumer: 10 * 16,
    business: 35 * 16
};

const attributesSchema = Joi.object({
    substance: Joi.string().valid(...CONTROLLED_SUBSTANCES),
    delivery_confirmation: Joi.string().valid(...Object.values(DELIVERY_CONFIRMATION_TYPE))
});

const weightSchema = Joi.alternatives().try(
    Joi.string(),
    Joi.number()
).custom((value, helpers) => {
    const number = Number(value);

    if (isNaN(number)) {
        return helpers.message('"weight" must be a number');
    }

    if (number <= 0) {
        return helpers.message('"weight" must be greater than 0');
    }

    return value;
});

const createSchema = (opts = {}) => {
    const {
        businessRecipient = false,
        response = false
    } = opts;

    const limitTobaccoWeight = (value, helpers) => {
        if (response) {
            return value;
        }

        const limit = (businessRecipient)
            ? tobaccoWeightLimits.business
            : tobaccoWeightLimits.consumer;

        if (parseFloat(value) > limit) {
            return helpers.message(`"weight" must be less than or equal to ${limit}`);
        }

        return value;
    };

    let schema = Joi.object({
        description: Joi.string().max(128).allow('', null).required(),
        length: Joi.string().max(128).allow('', null).required(),
        width: Joi.string().max(128).allow('', null).required(),
        height: Joi.string().max(128).allow('', null).required(),
        weight: weightSchema.required()
            .when('attributes.substance', {
                is: 'tobacco',
                then: weightSchema.required().custom(
                    limitTobaccoWeight,
                    'tobacco weight limit validation'
                )
            }),
        value: Joi.string().max(128).allow('', null).required(),
        attributes: attributesSchema,
        reference: Joi.string().max(128).allow('', null).required()
    });

    if (response) {
        schema = schema.keys({
            tracking_num: Joi.string().max(128).required(),
            carrier: Joi.string().valid(...Object.values(CARRIER_NAMES))
        });
    }

    return schema;
};

module.exports = createSchema;
