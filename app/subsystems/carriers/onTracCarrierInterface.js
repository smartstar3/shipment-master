const OnTrac = require('on-trac');
const { getLogger } = require('@onelive-dev/x-logger');

const { hasProp, getProp } = require('../../helpers/utils');
const { onTrac } = require('../../config');

const logger = getLogger(module);

function getOnTracConnection (injectionName) {
    if (!hasProp(onTrac.credential, injectionName)) {
        throw new Error(`Invalid OnTrac injection name: '${injectionName}'.`);
    }

    const credentials = getProp(onTrac.credential, injectionName);
    return new OnTrac(
        credentials.accountNumber,
        credentials.password,
        {
            logger,
            url: onTrac.apiUrl
        }
    );
}

module.exports = {
    createOrder: async (zipZone, params) => {
        logger.debug({ message: 'Subsystems.carriers.OnTracCarrierInterface.createOrder', params });

        const onTrac = getOnTracConnection(zipZone.options.injectionName);
        const res = await onTrac.createOrder(zipZone, params);
        logger.debug({ message: 'Subsystems.carriers.OnTracCarrierInterface.createOrder', res });

        return res;
    }
};
