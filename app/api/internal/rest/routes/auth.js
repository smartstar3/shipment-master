// api/internal/rest/routes/auth.js -- mount URL route handlers for Auth functions
//
'use strict';
const argon2 = require('argon2');
const moment = require('moment');
const uuid = require('uuid');
const { celebrate, Joi, Segments: { BODY } } = require('celebrate');

const { getLogger } = require('@onelive-dev/x-logger');

const auth = require('./../../../../services/auth');
const users = require('./../../../../models/users');
const { sendNotificationEmail } = require('./../../../../helpers/sendgrid');

const logger = getLogger(module);

module.exports = (router) => {
    // set JWT login route
    router.post('/login', // URL to service
        celebrate({ // validate POSTed body
            [BODY]: Joi.object({
                email: Joi.string().max(128).required(),
                password: Joi.string().max(128).required()
            })
        }),
        async (req, res) => { // process request
            const log = logger.child({ method: 'login' });
            const email = req?.body?.email;
            log.debug('login requested', { email });

            try {
                const authres = await auth.login(email, req?.body?.password);
                log.debug('login successful'/*, { token: authres } */);
                res.send(authres);
            } catch (err) {
                log.warn('login failed', err);
                res.sendStatus(401);
            }
        }
    );

    // get token from refresh token
    router.post('/token', // URL to service
        celebrate({ // validate POSTed body
            [BODY]: Joi.object({
                email: Joi.string().max(128).required(),
                refreshToken: Joi.string().required()
            })
        }),
        async (req, res) => { // process request
            const log = logger.child({ method: 'token' });
            const email = req?.body?.email;
            log.debug('token requested', { email });

            try {
                const token = await auth.token(email, req?.body?.refreshToken);
                log.debug('token request successful'/*, { token } */);
                res.send({ token: token });
            } catch (err) {
                log.warn('token request failed', err);
                res.sendStatus(404);
            }
        }
    );

    // register
    router.post('/register', // URL to service
        celebrate({ // validate POSTed body
            [BODY]: Joi.object({
                email: Joi.string().max(128).required(),
                password: Joi.string().max(128).required()
            })
        }),
        async (req, res) => { // process request
            const log = logger.child({ method: 'register' });
            const email = req?.body?.email;
            log.debug('register requested', { email });

            try {
                const uData = await auth.register(email, req?.body?.password);
                log.debug('register request successful'/*, { token: uData } */);
                res.send(uData);
            } catch (err) {
                log.warn('register request failed', err);
                res.sendStatus(400);
            }
        }
    );

    /**
     * Please get if user is logged in or logged out.
     */
    router.get('/me',
        async (req, res) => {
            if (req.user) {
                res.send(req.user);
            } else {
                res.sendStatus(401);
            }
        }
    );

    router.post('/forgot-password',
        celebrate({
            [BODY]: Joi.object({
                email: Joi.string().max(128).required()
            })
        }),
        async (req, res) => { // process request
            const log = logger.child({ method: 'forgot-password' });
            const email = req?.body?.email;
            log.debug('forgot password requested', { email });

            const user = await users.dbget({ email });

            if (user) {
                const token = uuid.v4();
                const expires = moment().add(1, 'hours').toDate();
                user.passwordResetToken = token;
                user.passwordResetExpires = expires;
                await users.dbupdate(user);

                const link = `${process.env.FRONTEND_URL}/forgot/${token}`;
                const toUser = user.email;
                await sendNotificationEmail({
                    to: toUser,
                    subject: 'Password Reset',
                    title: 'OLX',
                    email: user.email,
                    confirmUrl: link
                });

                log.debug('forgot password successful', { email });
                res.status(200).json({ message: 'We have just sent instructions to your email' });
            } else {
                log.warn('forgot password failed - unknown user', { email });
                res.sendStatus(401);
            }
        }
    );

    router.post('/reset',
        celebrate({
            [BODY]: Joi.object({
                password: Joi.string().max(128).required(),
                reset_token: Joi.string().max(128).required()
            })
        }),
        async (req, res) => {
            const log = logger.child({ method: 'reset' });
            const user = await users.dbget({ passwordResetToken: req.body.reset_token });
            log.debug('password reset requested');

            if (user) {
                user.password = argon2.hash(req.body.password);
                await users.dbsave(user);
                log.debug('password reset successful');
                res.send(user.password);
            } else {
                log.warn('password reset failed - unknown user');
                res.sendStatus(401);
            }
        }
    );
};
