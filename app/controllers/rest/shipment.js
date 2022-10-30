const { getLogger } = require('@onelive-dev/x-logger');

const exportService = require('../../services/export');
const shipmentRepo = require('../../repositories/graphql/shipments');

const logger = getLogger(module);

const exportShipments = async (req, res) => {
    const log = logger.child({ method: 'exportShipments' });
    log.debug('Entering exportShipments', {
        headers: req.headers,
        params: req.body
    });

    const shipments = await shipmentRepo.getShipments(req.body);

    try {
        if (req.headers.accept === 'application/pdf') {
            const pdf = await exportService.shipmentsToPDF(shipments);
            pdf.pipe(res);
            pdf.end();
        } else {
            const csvData = exportService.shipmentsToCSV(shipments);

            res.status(200).json({
                message: 'CSV File created successfully.',
                csvData: csvData
            });
        }
    } catch (err) {
        log.error('Error in exportShipments', err);
        res.sendStatus(404);
    }
};

module.exports = {
    exportShipments
};
