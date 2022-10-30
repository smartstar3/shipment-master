const { DocumentNotFoundError } = require('gateway');
const { NotFoundError, UnprocessableEntityError } = require('errors');
const { ObjectId } = require('mongodb');
const { Segments: { BODY } } = require('celebrate');

const {
    createWebhook,
    findWebhook,
    updateWebhook,
    deleteWebhook
} = require('../../repositories/webhooks');
const { present } = require('../../presenters/webhook');

const invalidHostNames = new Set(['127.0.0.1', '::1', 'localhost', 'api.xdelivery.ai']);
const validateUrl = (url) => {
    url = new URL(url);

    if (invalidHostNames.has(url.hostname)) {
        throw new UnprocessableEntityError({
            errors: [{ name: 'url', message: 'invalid hostname', segment: BODY }]
        });
    }
};

const createWebhookMiddleware = async (req, res) => {
    validateUrl(req.body.url);
    const webhook = await createWebhook({ shipper: req.org.shipperSeqNum, ...req.body });
    res.status(201).json(present(webhook));
};

const getWebhookMiddleware = async (req, res) => {
    const webhook = await findWebhook({
        _id: ObjectId(req.params.id),
        shipper: req.org.shipperSeqNum
    });

    if (!webhook) {
        throw new NotFoundError();
    }

    res.status(200).json(present(webhook));
};

const updateWebhookMiddleware = async (req, res) => {
    validateUrl(req.body.url);

    const webhook = await findWebhook({
        _id: ObjectId(req.params.id),
        shipper: req.org.shipperSeqNum
    });

    if (!webhook) {
        throw new NotFoundError();
    }

    const updated = await updateWebhook({ _id: webhook._id }, req.body);
    res.status(200).json(present({ ...webhook, ...updated }));
};

const deleteWebhookMiddleware = async (req, res) => {
    return deleteWebhook({ _id: ObjectId(req.params.id), shipper: req.org.shipperSeqNum })
        .then(() => res.status(204).send())
        .catch((err) => {
            if (err instanceof DocumentNotFoundError) {
                throw new NotFoundError();
            } else {
                throw err;
            }
        });
};

module.exports = {
    createWebhookMiddleware,
    getWebhookMiddleware,
    updateWebhookMiddleware,
    deleteWebhookMiddleware
};
