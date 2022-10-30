const basicAuth = require('express-basic-auth');
const { UnauthorizedError } = require('errors');

const gconfig = require('../../../../config');

module.exports = basicAuth({
    users: { glacier: gconfig.internalApiKey },
    authorizeAsync: false,
    unauthorizedResponse: UnauthorizedError.toJSON()
});
