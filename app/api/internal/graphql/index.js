const cors = require('cors');
const passport = require('passport');

const adminGraphql = require('./admin').adminGraphql;
const auth0JWT = require('./middleware/auth0JWT');
const trackGraphql = require('./track').trackGraphql;
const { authErrorHandler } = require('../../lib/middleware/errorHandlers');
const { nexusGraphql } = require('./nexus');

module.exports = async app => {
    // Load Admin GraphQL service
    app.use(
        '/admin/graphql',
        cors(),
        passport.authenticate('jwt', { session: false, failWithError: true }),
        authErrorHandler,
        adminGraphql()
    );

    app.use('/nexus/graphql', cors(), auth0JWT, authErrorHandler, nexusGraphql());

    // Load Track Site GraphQL
    app.use('/track/graphql', cors(), trackGraphql());
};
