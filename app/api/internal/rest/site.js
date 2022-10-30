// api/internal/rest/site.js -- load all subordnate routes from root URL
//
const auth = require('./routes/auth');
const express = require('express');
const shipmentRoute = require('./routes/shipment');
const { getAuthToken } = require('./middleware/getAuthToken');

module.exports = () => {
    const router = express.Router();

    auth(router);
    shipmentRoute(router);
    router.use(getAuthToken); // mount the JWT validator after the un-authenticated Auth services

    return router;
};
