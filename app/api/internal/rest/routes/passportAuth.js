const IdentitiesRepo = require('../../../../repositories/identities');
const passport = require('passport');
const RolesModel = require('../../../../models/roles');
const { genISSJWT, genISSRefreshJWT } = require('../../../../services/auth');
const { nodeEnv, google, jwtRefreshTokenExpiration, adminUI: { redirectURL } } = require('../../../../config');

/* eslint-disable-next-line security/detect-non-literal-require */
const { Strategy: GoogleStrategy } = require(nodeEnv === 'test' ? 'passport-mocked' : 'passport-google-oauth20');

const googleConfig = { name: 'google', ...google };

const doGoogleLogin = function (accessToken, refreshToken, profile, done) {
    const { name, emails = [], displayName, photos = [] } = profile;
    return RolesModel.dbget({ authLevel: 2 }).then(({ _id: roleId }) => {
        return IdentitiesRepo.findOrCreate({ googleId: profile.id }, {
            name,
            roleId,
            email: (emails.length && emails[0].value) || null,
            profilePicture: (photos.length && photos[0].value) || null,
            displayName
        }).then(({ value, error }) => {
            return done(error, value);
        });
    }).catch((e) => {
        return done(e, null);
    });
};

const adminUIRouter = (router) => {
    passport.use(new GoogleStrategy(googleConfig, doGoogleLogin));

    router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    router.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login', session: false }),
        async (req, res) => {
        // Successful authentication, redirect home.
            const { expirationTime, token } = await genISSJWT(req.user);
            const { token: refreshToken } = await genISSRefreshJWT(req.user);
            res.cookie('x-refresh', refreshToken, { maxAge: jwtRefreshTokenExpiration * 1000 });
            res.redirect(`${redirectURL}?jwt=${token}&exp=${expirationTime}`);
        });
};

module.exports = {
    adminUIRouter
};
