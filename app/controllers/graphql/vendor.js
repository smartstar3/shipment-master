const { getLogger } = require('@onelive-dev/x-logger');

const vendorRepo = require('../../repositories/vendors');

const logger = getLogger(module);

const getVendors = async () => {
    const log = logger.child({ method: 'getVendors' });
    log.debug('Entering getVendors');
    const res = await vendorRepo.getVendors();
    log.debug('getVendors response created', res);
    return res;
};

module.exports = {
    getVendors
};
