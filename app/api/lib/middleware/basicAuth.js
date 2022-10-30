const auth = require('basic-auth');
const { timingSafeEqual } = require('crypto');
const { UnauthorizedError } = require('errors');

const Organizations = require('../../../repositories/organizations');

const safeCompare = (userInput, secret) => {
    const userInputLength = Buffer.byteLength(userInput);
    const secretLength = Buffer.byteLength(secret);

    const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    userInputBuffer.write(userInput);
    const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    secretBuffer.write(secret);

    return !!(timingSafeEqual(userInputBuffer, secretBuffer) & userInputLength === secretLength);
};

const basicAuth = async (req, _res, next) => {
    const authentication = auth(req);

    if (!authentication) {
        return next(new UnauthorizedError());
    }

    const org = await Organizations.getOrganizationByApiId(authentication.name);
    if (org && safeCompare(authentication.pass, org.apiKey)) {
        req.org = org;
    } else {
        return next(new UnauthorizedError());
    }

    next();
};

module.exports = basicAuth;
