const { getLogger } = require('@onelive-dev/x-logger');

const serviceRepo = require('../../repositories/services');

const logger = getLogger(module);

const getServices = async (parent, args) => {
    logger.debug('Entering getUsers', { parent, args });
    const res = serviceRepo.getServices(args);
    logger.debug('getUsers result', { res });
    return res;
};

module.exports = {
    getServices
};
