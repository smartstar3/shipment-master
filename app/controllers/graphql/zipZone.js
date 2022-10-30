const { getLogger } = require('@onelive-dev/x-logger');

const ZipZoneRepo = require('../../repositories/zipZones');

const logger = getLogger(module);

const getZipZone = async (parent, args) => {
    logger.debug('Entering getZipZone', { parent, args });
    const res = await ZipZoneRepo.getZipZone({ id: args.id });
    logger.debug('getZipZone result', { res });
    return res;
};

const getZipZones = async (parent, args) => {
    logger.debug('Entering getZipZones', { parent, args });

    let originalCount;

    if (args.count) {
        originalCount = parseInt(args.count);
    }

    const zipZoneArgs = { ...args };
    if (originalCount) {
        zipZoneArgs.count = originalCount + 1;
    }

    const res = await ZipZoneRepo.getZipZones(zipZoneArgs);
    const paginated = { zipzones: res.slice(0, originalCount), hasMore: (res.length > originalCount) };

    logger.debug('getZipZones result', { res: paginated });
    return paginated;
};

const getTerminalProviders = async (parent) => {
    logger.debug('Entering terminalProviders', { parent });
    const res = await ZipZoneRepo.getTerminalProviders();
    logger.debug('terminalProviders result', { res });
    return res;
};
module.exports = {
    getZipZone,
    getZipZones,
    getTerminalProviders
};
