'use strict';
const express = require('express');
const { Joi, Segments: { BODY, PARAMS } } = require('celebrate');

const basicAuth = require('../lib/middleware/basicAuth');
const consent = require('../lib/middleware/consent');
const cors = require('../lib/middleware/cors');
const ServiceRoute = require('../lib/serviceRoute');
const serviceRouter = require('../lib/serviceRouter');
const {
    cancelOrderMiddleware,
    createOrderMiddleware,
    getOrderMiddleware,
    validateOrderMiddleware
} = require('../../controllers/rest/order');
const {
    createWebhookMiddleware,
    getWebhookMiddleware,
    updateWebhookMiddleware,
    deleteWebhookMiddleware
} = require('../../controllers/rest/webhook');
const { getRateMiddleware } = require('../../controllers/rest/rate');
const { getTrackingMiddleware } = require('../../controllers/rest/track');

const { getZipCodesMiddleware } = require('../../controllers/rest/zipcode');

const routes = ServiceRoute.fromOpts([
    {
        label: 'verify',
        path: '/verify',
        get: (req, res) => res.status(200).send({ status: 'ok' })
    },
    {
        label: 'trackByTrackingNumber',
        path: '/track/:trackingNumber',
        get: getTrackingMiddleware
    },
    {
        label: 'order',
        path: '/order',
        post: [
            validateOrderMiddleware,
            createOrderMiddleware
        ]
    },
    {
        label: 'orderById',
        path: '/order/:id',
        get: getOrderMiddleware,
        delete: cancelOrderMiddleware
    },
    {
        label: 'rate',
        path: '/rate',
        post: [
            validateOrderMiddleware,
            getRateMiddleware
        ]
    },
    {
        label: 'webhook',
        path: '/webhook',
        post: createWebhookMiddleware,
        validator: {
            [BODY]: Joi.object({ url: Joi.string().uri({ scheme: 'https' }) })
        }
    },
    {
        label: 'webhookById',
        path: '/webhook/:id',
        get: getWebhookMiddleware,
        delete: deleteWebhookMiddleware,
        validator: {
            [PARAMS]: Joi.object({ id: Joi.string().length(24) })
        }
    },
    {
        label: 'updateWebhookById',
        path: '/webhook/:id',
        put: updateWebhookMiddleware,
        validator: {
            [BODY]: Joi.object({ url: Joi.string().uri({ scheme: 'https' }) }),
            [PARAMS]: Joi.object({ id: Joi.string().length(24) })
        }
    },
    {
        label: 'serviceArea',
        path: '/serviceArea',
        get: getZipCodesMiddleware
    }
]);

const config = {
    label: 'externalV1',
    description: 'router for external v1 REST API endpoints',
    path: '/service/v1',
    hooks: {
        ...serviceRouter.defaultHooks,
        preAuthentication: [],
        authentication: [basicAuth],
        authorization: [consent],
        preRoute: [
            express.json(),
            cors
        ],
        routes
    }
};

const externalV1Router = serviceRouter(config);

module.exports = externalV1Router;
