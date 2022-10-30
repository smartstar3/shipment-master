const { Joi } = require('celebrate');

const { createValidator } = require('../../../validation');

module.exports = createValidator(
    Joi.object({
        email: Joi.string().max(128).required(),
        password: Joi.string().max(128).required()
    })
);
