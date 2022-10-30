const { Joi } = require('celebrate');

module.exports = Joi.object({
    cost: Joi.string().max(128).allow('', null).required(),
    dollar_cost: Joi.string().max(128).allow('', null).required(),
    billable_weight: Joi.number().required(),
    zone: Joi.number().max(8).min(1).allow(null, '').required(),
    use_dim_weight: Joi.boolean().required()
});
