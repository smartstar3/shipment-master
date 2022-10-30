// api/internal/rest/admin.js -- load all subordnate routes from root URL
//
'use strict';
const express = require('express');
const passport = require('passport');
const shipmentRoute = require('./routes/shipment');
const { adminJWT } = require('./middleware/getAuthToken');
const { adminUIRouter } = require('./routes/passportAuth');

module.exports = () => {
    const apiRouter = express.Router(); // get container router for all subordinate routes
    // add individual service providers onto main route
    apiRouter.use(passport.initialize());
    adminUIRouter(apiRouter);
    adminJWT(apiRouter);
    apiRouter.use(passport.authenticate('jwt', { session: false })); // mount the JWT validator after the un-authenticated Auth services
    shipmentRoute(apiRouter);
    return apiRouter;
};
