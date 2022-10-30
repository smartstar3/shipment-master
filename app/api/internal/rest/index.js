const cors = require('cors');

const adminRoutes = require('./admin');
const internalApiAuth = require('./middleware/internalApiAuth');
const trackingRoutes = require('./tracking');

module.exports = async app => {
    app.use('/internal', cors(), internalApiAuth);
    app.use('/admin/api', cors(), adminRoutes());
    app.use('/internal/tracking', trackingRoutes());
};
