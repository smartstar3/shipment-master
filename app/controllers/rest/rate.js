const getRateValidator = require('../../validation/external/rest/rateValidator');
const { getRateValue } = require('../../services/rate');

const responseValidator = getRateValidator({ response: true });

const defaultRatePresenter = (data) => responseValidator(data);

const getRate = async (org, body, presenter = defaultRatePresenter) => {
    const rate = await getRateValue(org, body);

    const response = {
        ...body,
        rate
    };

    return presenter(response);
};

const getRateMiddleware = async (req, res) => {
    const { body, org } = req;
    const response = await getRate(org, body);

    res.status(200).send(response);
};

module.exports = {
    getRate,
    getRateMiddleware
};
