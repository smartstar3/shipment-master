const express = require('express');
const trackingRoutes = require('./routes/tracking');

module.exports = () => {
    const router = express.Router();
    trackingRoutes(router);
    return router;
};
