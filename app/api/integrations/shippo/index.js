const express = require('express');

const initShippoAuth = require('./shippoAuth');
const ServiceRoute = require('../../lib/serviceRoute');
const serviceRouter = require('../../lib/serviceRouter');
const {
    cancelMiddleware,
    labelsMiddleware,
    ratingMiddleware,
    trackingMiddleware
} = require('./middleware');
const { shippo } = require('../../../config');

const baseUrl = '/services/carrier';

const { authentication, authorization } = initShippoAuth({ ...shippo, urlPrefix: baseUrl });

// these routes do not provide account id information in request body for us to perform customer
// token validation.  We will install these on router before the authorization middleware.
const noAuthorizationRoutes = ServiceRoute.fromOpts([
    {
        label: 'tracking',
        path: baseUrl + '/tracks',
        post: trackingMiddleware
    },
    {
        label: 'cancel',
        path: baseUrl + '/cancellations',
        post: cancelMiddleware
    }
]);

const routes = ServiceRoute.fromOpts([
    {
        label: 'rating',
        path: baseUrl + '/rates',
        post: ratingMiddleware
    },
    {
        label: 'labels',
        path: baseUrl + '/labels',
        post: labelsMiddleware
    }

]);

const config = {
    label: 'shippo',
    description: 'router for shippo integration API endpoints',
    path: '/shippo',
    hooks: {
        // we need the body as a string or buffer for the authentication middleware :)
        preAuthentication: [express.raw({ type: 'application/json' })],
        // the authentication step also parses req.body to JSON
        authentication: [authentication],
        // install routes that don't use authorization
        preAuthorization: [...noAuthorizationRoutes],
        authorization: [authorization],
        // clear out default body parsing middleware here
        preRoute: [],
        routes
    }
};

const shippoRouter = serviceRouter(config);

module.exports = shippoRouter;
