const gconfig = require('./../../../../config');
const jwt = require('express-jwt');

module.exports = jwt({
    secret: gconfig.jwtSecret,
    credentialsRequired: false
});
