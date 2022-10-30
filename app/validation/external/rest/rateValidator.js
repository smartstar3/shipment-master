const { Joi } = require('celebrate');

const getAddressSchema = require('./addressSchema');
const getParcelSchema = require('./parcelSchema');
const rateSchema = require('./rateSchema');
const { createValidator } = require('../../../validation');
const { OLX_LABEL_FORMATS } = require('../../../constants/olxConstants');

const rateValidator = () => {
    const schema = Joi.object({
        shipper_name: Joi.string().max(128).allow('', null).required(),
        shipper_phone: Joi.string().max(128).allow('', null).required(),
        reference_id: Joi.string().max(128).allow('', null).required(),
        reference_data: Joi.string().max(128).allow('', null).required(),
        to_address: getAddressSchema('to'),
        from_address: getAddressSchema('from'),
        parcel: getParcelSchema({ response: false }),
        label_format: Joi.string().valid(...OLX_LABEL_FORMATS).required(),
        rate: rateSchema.required()
    });

    return createValidator(schema);
};

const getValidator = (opts = {}) => {
    // currently ratings endpoints use same request signature as order, so we only expect this to be used for responses
    if (!opts.response) {
        throw new Error('unexpected use of rateValidator.getValidator()');
    }

    return rateValidator(opts);
};

module.exports = getValidator;
