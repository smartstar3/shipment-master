const { nodeEnv, consentWhitelistCutoff } = require('../../../config');
const { UnauthorizedError } = require('errors');

const CONSENT_MESSAGE = `Please log into the X Delivery Dashboard to accept the Terms of Service :  https://account.${nodeEnv !== 'production' ? 'staging.' : ''}xdelivery.ai`;

const consent = async (req, _res, next) => {
    const { org } = req;
    const { consent, createdAt } = org;

    if (new Date(createdAt) < new Date(consentWhitelistCutoff)) {
        next();
    } else {
        if (!consent || !consent.email) {
            return next(new UnauthorizedError(CONSENT_MESSAGE));
        } else {
            next();
        }
    }
};

module.exports = consent;
