// api/internal/rest/routes/shipment.js -- mount URL route handlers for export functions
//
'use strict';
const { getLogger } = require('@onelive-dev/x-logger');

const { exportShipments } = require('../../../../controllers/rest/shipment');

const logger = getLogger(module);

module.exports = (router) => {
    router.post('/shipments/exports', // URL to service
        async (req, res) => {
            const log = logger.child({ method: 'POST exports' });

            try {
                await exportShipments(req, res);
            } catch (err) {
                log.error('error on POST /shipments/exports', err);
                res.sendStatus(404);
            }
        }
    );
};
