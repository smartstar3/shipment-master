const { isPojo, setProp } = require('../../../helpers/utils');

// @todo add more redaction keys
const redactedProps = new Set([
    'label_base64'
]);

const redactResponseBody = (body) => {
    if (Array.isArray(body)) {
        return body.map(redactResponseBody);
    }

    // we can't redact against non-object
    if (!isPojo(body)) return body;

    for (const name in body) {
        if (redactedProps.has(name)) {
            setProp(body, name, '[REDACTED]');
        }
    }

    return body;
};

const loggableResponse = (res) => {
    let responseBody = res.body;
    const responseContentType = res.getHeader('Content-Type');
    if (responseContentType && responseContentType.includes('application/json')) {
        try {
            responseBody = redactResponseBody(
                JSON.parse(responseBody)
            );
        } catch (err) {
            if (!(err instanceof SyntaxError)) {
                throw err;
            }
        }
    }

    // for now, we serialize to string to simplify log indexing
    if (isPojo(responseBody)) {
        responseBody = JSON.stringify(responseBody);
    }

    return {
        body: responseBody,
        status: res.statusCode,
        headers: {
            'X-Request-Id': res.getHeader('X-Request-Id'),
            'Content-Type': res.getHeader('Content-Type'),
            'Content-Length': res.getHeader('Content-Length')
        }
    };
};

const initResponseLogger = (opts = {}) => {
    const { logger: parentLogger } = opts;
    const logger = parentLogger.child(module);

    const getLogger = (req) => {
        const context = {};

        if (req.uuid) {
            context.requestId = req.uuid;
        }

        if (req.org) {
            const { name, shipperSeqNum: shipper } = req.org;
            context.org = { name, shipper };
        }

        if (req.user) {
            const { _id: id, email } = req.user;
            context.user = { id, email };
        }

        return logger.child(context);
    };

    /* Express does not provide a clean interface to response body because of how streaming works.
     * This API will most likely never take advantage of streaming, however if it does we lose some
     * of the benefit of not keeping the response completely in memory here.
     *
     * https://stackoverflow.com/questions/19215042/express-logging-response-body
     */
    const responseLogger = (req, res, next) => {
        const defaultWrite = res.write;
        const defaultEnd = res.end;

        const chunks = [];

        res.write = function (chunk) {
            chunks.push(Buffer.from(chunk));
            return defaultWrite.apply(res, arguments);
        };

        res.end = function (chunk) {
            if (chunk) {
                chunks.push(Buffer.from(chunk));
            }

            res.body = Buffer.concat(chunks).toString('utf8');
            defaultEnd.apply(res, arguments);
        };

        res.on('finish', () => {
            const requestHeaders = Object.fromEntries(
                ['Accept', 'Content-Length', 'Content-Type', 'Host', 'User-Agent'].map(name => {
                    return [name, req.headers[name.toLowerCase()]];
                })
            );

            const logData = {
                // @todo pare this down to only most useful data
                request: {
                    ip: req.ip,
                    uuid: req.uuid,
                    method: req.method,
                    url: req.originalUrl,
                    body: JSON.stringify(req.body),
                    headers: requestHeaders,
                    startedAt: req.startedAt,
                    duration: Date.now() - req.startedAt
                },
                response: loggableResponse(res)
            };

            if (res.error) {
                logData.error = res.error;
            }

            const log = getLogger(req);

            const { request: { method, url }, response: { status } } = logData;
            log.info(`response: ${method} ${url} ${status}`, logData);
        });

        next();
    };

    return responseLogger;
};

module.exports = initResponseLogger;
