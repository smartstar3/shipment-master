const { getLogger } = require('@onelive-dev/x-logger');

const ZipZone = require('../../models/zipZones');
const { CARRIER_NAMES } = require('../../constants/carrierConstants');

const logger = getLogger(module);

module.exports = async function checkEligibility (carrier, targetZip) {
    const log = logger.child({ method: 'checkEligibility', carrier, targetZip });

    log.debug('Entering checkEligibility');

    if (!Object.values(CARRIER_NAMES).includes(carrier)) {
        throw new Error(`Invalid carrier: ${carrier}`);
    }

    if (!targetZip || typeof targetZip !== 'object') {
        log.debug('invalid targetZip');
        return null;
    }

    const query = {
        carrier,
        zipcode: targetZip.zipcode,
        max_weight: { $gte: targetZip.weight },
        tobacco: targetZip.tobacco || null
    };

    const sort = { max_weight: 1 };

    let zipZone = await ZipZone.dbget(
        { shipper_id: targetZip.shipperId, ...query },
        sort
    );
    if (!zipZone) {
        zipZone = await ZipZone.dbget({ shipper_id: null, ...query }, sort);
    }

    log.debug('zipZone determined', { zipZone });

    return zipZone;
};
