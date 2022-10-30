const LaserShip = require('laser-ship');
const { getLogger, getModuleContext } = require('@onelive-dev/x-logger');

const gconfig = require('../../config');
const lsSortCenters = require('../../models/lsSortCenters');

const moduleContext = getModuleContext(module);

const createOrder = async (zipZone, params) => {
    const logger = getLogger({ ...moduleContext, method: 'createOrder' });
    logger.debug('Entering createOrder', params);

    const laserShip = new LaserShip(
        gconfig.lasershipApiId,
        gconfig.lasershipApiKey,
        zipZone.options.customerBranch,
        {
            label: true,
            test: gconfig.lasershipTestMode,
            url: gconfig.lasershipUrl
        }
    );

    // Get sort center matched to customer branch
    const sortZipZone = await lsSortCenters.dbget({ CustomerBranch: zipZone.options.customerBranch });
    delete sortZipZone._id;

    try {
        const res = await laserShip.createOrder(sortZipZone, params);
        logger.debug('response', res);

        return res;
    } catch (error) {
        logger.error('error creating order', error);

        throw error;
    }
};

module.exports = {
    createOrder
};
