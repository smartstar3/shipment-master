const jwks = require('jwks-rsa');
const jwt = require('express-jwt');

const { auth0: { domain, audience } } = require('../../../../config');

module.exports = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${domain}.well-known/jwks.json`
    }),
    audience: audience,
    issuer: domain,
    algorithms: ['RS256']
});
