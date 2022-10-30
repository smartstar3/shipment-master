const Escher = require('escher-auth');
const { ForbiddenError, UnauthorizedError, UnprocessableEntityError } = require('errors');

const Organizations = require('../../../repositories/organizations');

/**
 * @typedef ShippoAuthOptions
 * @type {object}
 * @property {string} credential - The credential identifier to be used for
 * @propert {boolean} [requireAccountToken=true] - Boolean indicating whether AccountToken header is to be used for authorization.
 * @property {string[]} [requiredHeaders] - By default, `content-type`, `host`, and `x-shippo-date` are set.
 * @property {string} [scope=olx/shippo] - The scope value to be used along with credential value to determine full
 *  Credential expected in Authorization header
 * @property {string} secret - The secret key value associated to the credential to be used in calculating signature hash
 * @property {string} [urlPrefix=null] - If set, this URL prefix will be added to to `req.url` temporarily for purposes of
 *  authentication based on `req.originalUrl`. This allows use of nested routers where path prefix has been stripped from `req`.
 */

/**
 * * @param {ShippoAuthOptions} opts
 * @returns {Function}
 * @throws {Error}
 */
const initShippoAuth = (opts = {}) => {
    const {
        credential,
        requireAccountToken = true,
        requiredHeaders = ['content-type', 'host', 'x-shippo-date'],
        scope = 'olx/shippo',
        secret,
        urlPrefix = null
    } = opts;

    if (!credential || !secret) {
        throw new Error('shippoAuth middleware initialization requires both credential and secret');
    }

    /**
     * @type {ShippoAuthOptions}
     */
    const escherCfg = {
        accessKeyId: credential,
        algoPrefix: 'SHIPPO',
        vendorKey: 'SHIPPO',
        hashAlgo: 'SHA256',
        credentialScope: scope,
        authHeaderName: 'Authorization',
        dateHeaderName: 'X-Shippo-Date',
        clockSkew: 300
    };
    const escher = new Escher(escherCfg);

    const getSecret = (credId) => (credId === credential) ? secret : null;

    const validateAuthHeader = (req) => {
        let foundCredential;
        try {
            foundCredential = escher.authenticate(req, getSecret, requiredHeaders);
        } catch (err) {
            foundCredential = false;
        }
        return foundCredential;
    };

    const validateAccountToken = (req) => {
        const token = req.get('AccountToken');

        return (token?.length > 0) ? token : false;
    };

    /**
     * Authentication middleware function
     *
     * @param {object} req
     * @param {object} res
     * @param {function} next
     * @returns void
     */
    const authentication = (req, res, next) => {
        // the escher validator needs req.url to be the full URL for validation
        // use urlPrefix to temporarily override req.url with mounting route prefix
        let urlToRestore = null;
        if (urlPrefix) {
            urlToRestore = req.url;
            req.url = req.originalUrl;
        }

        const foundCredential = validateAuthHeader(req);
        if (!foundCredential) {
            return next(new UnauthorizedError());
        }

        if (urlPrefix) {
            req.url = urlToRestore;
        }

        // now that we are done with the validation, we need to parse the req.body Buffer to JSON
        try {
            const json = req.body.toString('utf8');
            req.body = JSON.parse(json);
        } catch (err) {
            return next(new UnprocessableEntityError({
                errors: [{
                    name: 'json',
                    message: 'request body could not be parsed as JSON'
                }]
            }));
        }

        req.shippo = {
            auth: {
                credential: foundCredential
            }
        };

        next();
    };

    /**
     * Authorization middleware function to lookup organization passed on passed AccountToken
     * header and account id.
     *
     * @param {object} req
     * @param {object} res
     * @param {function} next
     * @returns void
     */
    const authorization = async (req, res, next) => {
        const auth = req?.shippo?.auth;
        const body = req.body;

        // make sure authentication middleware has already been run
        if (!auth) {
            return next(new ForbiddenError());
        }

        // do we find account token (org.apiKey) in headers
        const foundAccountToken = validateAccountToken(req);
        if (foundAccountToken === false) {
            return next(new ForbiddenError());
        }

        // do we find the organization accountId (org.apiId) in request body?
        const accountId = body?.account?.account_id;
        if (!accountId) {
            return next(new ForbiddenError());
        }

        const org = await Organizations.getOrganizationByApiId(accountId);

        if (!org || org.apiKey !== foundAccountToken) {
            return next(new ForbiddenError());
        }

        req.org = org;
        auth.accountId = accountId;
        next();
    };

    /**
     * A dummy no authorization middleware function to be used for cases where
     * `requireAccountToken` is set to false.
     *
     * @param {object} req
     * @param {object} res
     * @param {function} next
     * @returns void
     */
    const noAuthorization = async (req, res, next) => next();

    return {
        authentication,
        authorization: (requireAccountToken) ? authorization : noAuthorization
    };
};

module.exports = initShippoAuth;
