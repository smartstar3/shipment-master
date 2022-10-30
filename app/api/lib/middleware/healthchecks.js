const errors = require('errors');

const healthcheck = (req, res) => {
    res.status(200).end();
};

const healthcheckError = (req, res, next) => {
    next(new errors.InternalServerError());
};

module.exports = {
    healthcheck,
    healthcheckError
};
