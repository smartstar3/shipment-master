// services/auth.js -- authentication services and middleware
//
'use strict';
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../config');
const Identites = require('../models/identities');
const users = require('../models/users');
const { hasProp, getProp, setProp } = require('../helpers/utils');

const logger = getLogger(module);

// TODO: please move to db
const tokenList = {};

// GetJWT() - use the supplied User record to create a JWT
//
function GenJWT (userRecord) {
    const expirationTime = gconfig.jwtExpiresSecs + Math.trunc(Date.now() / 1000);
    const token = {
        token: jwt.sign(
            {
                _id: userRecord._id, // We are gonna use this later in middleware
                user: userRecord.email,
                roleId: userRecord.roleId,
                exp: expirationTime
            },
            gconfig.jwtSecret
        ),
        expirationTime: expirationTime
    };

    return token;
}

function GenRefreshJWT (userRecord) {
    return jwt.sign(
        {
            _id: userRecord._id, // We are gonna use this later in middleware
            user: userRecord.email,
            roleId: userRecord.roleId,
            exp: gconfig.jwtRefreshTokenExpiration + Math.trunc(Date.now() / 1000)
        },
        gconfig.jwtRefreshTokenSecret
    );
}

// register() - create a user account based on supplied credentials
// called with {
//    email: string,
//    password: string
// }
//
// side effect: a new user record is written to the DB
//
// returns {
//   user: sanitized database user record
//   jwt: signed token
// }
//
const register = async (email, password) => {
    const log = logger.child({ method: 'register' });
    log.debug('Entering register');

    try {
        const pwHash = await argon2.hash(password);
        log.info('Creating user', { user: email });
        const userRecord = await users.dbset({
            email: email,
            password: pwHash
        });
        if (!userRecord) throw new Error('Cannot create new user');

        // sanitize userRecord for other uses
        Reflect.deleteProperty(userRecord, 'password');

        log.info('User and JWT created');
        return { user: userRecord, token: GenJWT(userRecord) };
    } catch (err) {
        log.error('register error', err);
        throw err;
    }
};

// confirm that received credentials match a valid user account
// called with {
//    email: string,
//    password: string
//    role: string
// }
//
const login = async (email, password) => {
    const log = logger.child({ method: 'login' });
    log.info('Entering login', { user: email });

    const userRecord = await users.dbget({ email });
    if (!userRecord) throw new Error(`Services.login ${email} not registered`);
    // verify password
    const pwdOk = await argon2.verify(userRecord.password, password);

    if (pwdOk) {
        log.info('PWD OK, sending JWT');
        const token = GenJWT(userRecord);
        const refreshToken = GenRefreshJWT(userRecord);

        // prepare userRecord for public consumption
        Reflect.deleteProperty(userRecord, 'password');

        const response = { userRecord, token, refreshToken };

        // save refresh Token
        setProp(tokenList, refreshToken, response);

        return response;
    } else throw new Error('Services.login Invalid password');
};

/**
 *  Get token from refresh token
 *
 * @param email
 * @param refreshToken
 * @param role
 * @returns {Promise<undefined|*>}
 */
const token = async (email, refreshToken) => {
    const log = logger.child({ method: 'token' });
    log.info('Entering token', { user: email });

    if (hasProp(tokenList, refreshToken)) {
        const query = { email };

        const userRecord = await users.dbget(query);
        if (!userRecord) throw new Error(`Services.auth.token ${email} not registered`);

        const token = GenJWT(userRecord);
        getProp(tokenList, refreshToken).token = token;

        return token;
    } else {
        throw new Error('Services.auth.token Invalid refresh token');
    }
};

const doISSRefresh = async (token) => {
    const log = logger.child({ method: 'doISSRefresh' });
    log.debug('Entering doISSRefresh');

    try {
        const decoded = await jwt.verify(token, gconfig.jwtRefreshTokenSecret);
        if (!decoded) {
            return null;
        } else {
            const { jti: refreshJti } = decoded;
            const userRecord = await Identites.dbget({ refreshJti: refreshJti });
            if (userRecord) {
                const { token: newToken, expirationTime } = await genISSJWT(userRecord);
                const { token: refreshToken } = await genISSRefreshJWT(userRecord);
                return {
                    token: {
                        token: newToken,
                        refreshToken,
                        expirationTime
                    }
                };
            } else {
                return null;
            }
        }
    } catch (err) {
        log.error('doISSRefresh error', err);
        return null;
    }
};

const genISSJWT = async (user) => {
    const { _id, email, roleId } = user;
    const expirationTime = gconfig.jwtExpiresSecs + Math.trunc(Date.now() / 1000);
    const jti = uuid.v4();
    await Identites.dbupdate({ _id, jti });
    return {
        token: jwt.sign({
            iss: 'OLX',
            jti,
            _id,
            email,
            roleId,
            exp: expirationTime
        }, gconfig.jwtSecret),
        expirationTime,
        jti
    };
};

const genISSRefreshJWT = async (user) => {
    const { _id, email, roleId } = user;
    const expirationTime = gconfig.jwtRefreshTokenExpiration + Math.trunc(Date.now() / 1000);
    const jti = uuid.v4();
    await Identites.dbupdate({ _id, refreshJti: jti });
    return {
        token: jwt.sign({
            iss: 'OLX',
            jti,
            _id,
            email,
            roleId,
            exp: expirationTime
        }, gconfig.jwtRefreshTokenSecret),
        expirationTime,
        jti
    };
};

module.exports = {
    genISSJWT,
    genISSRefreshJWT,
    doISSRefresh,
    login,
    register,
    token
};
