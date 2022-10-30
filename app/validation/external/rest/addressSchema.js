const { Joi } = require('celebrate');

const { hasProp, getProp } = require('../../../helpers/utils');

const PHONE_REGEX = /^(\+1|1)?\D?\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$/;
const PO_BOX_REGEX = /\b(?:p\.?\s*o\.?|post\s*office)\s*(?:b|box|drawer|lockbox|bin)\s+(?:[#-]?[a-z0-9]*)\b/i;

const baseSchema = Joi.object({
    name: Joi.string().max(128).allow('', null),
    address1: Joi.string().max(128).allow('', null).required(),
    address2: Joi.string().max(128).allow('', null),
    city: Joi.string().max(128).allow('', null).required(),
    state: Joi.string().max(128).allow('', null).required(),
    zip: Joi.string().max(5).truncate().allow('', null).required(),
    country: Joi.string().max(128).allow('', null).required(),
    phone: Joi.string().max(128).allow('', null),
    company_name: Joi.string().max(128).allow('', null)
}).or('name', 'company_name');

const schema = {
    base: baseSchema,
    to: baseSchema.keys({
        address1: Joi.string()
            .max(128)
            .default(null)
            .pattern(PO_BOX_REGEX, { invert: true })
            .message('Ineligible address. PO Boxes are not supported in primary address line.'),
        business: Joi.boolean()
    }),
    from: baseSchema,
    return: baseSchema
};

const createSchema = (type = 'base', opts = {}) => {
    const { signatureRequired = false } = opts;

    if (!hasProp(schema, type)) {
        throw new TypeError(`Unsupported address type '${type}'`);
    }

    if (type === 'to' && signatureRequired) {
        return schema.to.keys({
            phone: Joi.string()
                .max(128)
                .required()
                .pattern(PHONE_REGEX)
                .message('A valid phone number is required for this shipment')
        });
    }

    return getProp(schema, type);
};

module.exports = createSchema;
