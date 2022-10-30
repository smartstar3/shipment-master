const { Joi } = require('celebrate');

const getAddressSchema = require('./addressSchema');
const getParcelSchema = require('./parcelSchema');
const rateSchema = require('./rateSchema');
const { createValidator } = require('../../../validation');
const { getProp, setProp } = require('../../../helpers/utils');
const { OLX_LABEL_FORMATS } = require('../../../constants/olxConstants');
const { toJsonSorted } = require('../../../helpers/utils');

const addedResponseKeys = {
    rate: rateSchema,
    tracking_number: Joi.string().max(17).required(),
    tracking_url: Joi.string().max(1000).required(),
    label_base64: Joi.string().allow('', null).required(),
    create_time: Joi.string().max(128).allow('', null).required(),
    cancelled_time: Joi.string().max(128).allow('', null).required()
};

const createOrderValidator = (opts) => {
    const {
        controlledSubstance = null,
        businessRecipient = false,
        response = false
    } = opts;

    const toAddressOpts = (controlledSubstance) ? { signatureRequired: true } : {};

    const parcelOpts = {
        businessRecipient,
        response
    };

    let schema = Joi.object({
        shipper_name: Joi.string().max(128).allow('', null).required(),
        shipper_phone: Joi.string().max(128).allow('', null).required(),
        reference_id: Joi.string().max(128).allow('', null).required(),
        reference_data: Joi.string().max(128).allow('', null).required(),
        to_address: getAddressSchema('to', toAddressOpts).required(),
        from_address: getAddressSchema('from').required(),
        return_address: getAddressSchema('return'),
        parcel: getParcelSchema(parcelOpts).required(),
        label_format: Joi.string().valid(...OLX_LABEL_FORMATS).required()
    });

    if (response) {
        schema = schema.keys(addedResponseKeys);
    }

    return createValidator(schema);
};

const validators = {};

const getValidator = (opts = {}) => {
    const memoKey = toJsonSorted(opts);
    const cached = getProp(validators, memoKey);

    if (cached) {
        return cached;
    }

    const validator = createOrderValidator(opts);
    setProp(validators, memoKey, validator);

    return validator;
};

module.exports = getValidator;
