// api/internal/rest/middleware/getAuthToken.js -- Express middleware to detect and verify JWT
//
'use strict';
const expressJwt = require('express-jwt');
const passport = require('passport');
const { celebrate, Joi, Segments: { BODY } } = require('celebrate');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const { getLogger } = require('@onelive-dev/x-logger');
const { UnauthorizedError } = require('errors');

const gconfig = require('./../../../../config');
const IdentitiesModel = require('../../../../models/identities');
const { doISSRefresh } = require('../../../../services/auth');

const logger = getLogger(module);

// configure express-jwt to detect, validate, and store our token in REQ body
//
const getAuthToken = expressJwt({
    secret: gconfig.jwtSecret,
    userProperty: 'token', // will store into req.token
    getToken: (req) => {
        const log = logger.child({ method: 'getAuthToken' });
        // log.debug('auth header', { header: req.headers.authorization });
        // detect Authorization: token in header
        let retVal = null;
        if (req.headers.authorization) {
            const [type, token] = req.headers.authorization.split(' ');

            if (token && (type === 'Bearer' || type === 'Token')) {
                log.debug('token found', { type });
                retVal = token;
            }
        }
        if (!retVal) {
            log.warn('missing or invalid authorization header');
        }
        return retVal;
    }
});

const adminJWT = async (router) => {
    passport.use(new JwtStrategy({
        name: 'jwt',
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: gconfig.jwtSecret,
        issuer: 'OLX'
    }, async (payload, done) => {
        const user = await IdentitiesModel.dbget({ jti: payload.jti });
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    }
    ));

    router.post('/token', celebrate({ // validate POSTed body
        [BODY]: Joi.object({
            refreshToken: Joi.string().required()
        })
    }), async (req, res, next) => {
        const tokenObj = await doISSRefresh(req.body.refreshToken);
        if (tokenObj) {
            res.status(200).send(tokenObj);
        } else {
            next(new UnauthorizedError());
        }
    });
};

module.exports = {
    adminJWT,
    getAuthToken
};
