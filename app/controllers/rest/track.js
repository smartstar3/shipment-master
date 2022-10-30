const { NotFoundError } = require('errors');

const eventsPresenter = require('../../presenters/events');
const shipmentRepo = require('../../repositories/shipments');
const { edd, eddTobacco } = require('../../config/index');
const { getTrackingForShipment } = require('../../repositories/transport');

const defaultPresenter = async (data) => eventsPresenter.present(data);

const getTracking = async (org = {}, trackingNumber, presenter = defaultPresenter) => {
    const { settings = {}, shipperSeqNum } = org;
    const shipment = await shipmentRepo.getShipmentById(
        trackingNumber,
        shipperSeqNum
    );

    if (!shipment) {
        throw new NotFoundError();
    }

    const tracking = await getTrackingForShipment(shipment);

    const timezone = await shipmentRepo.getDestinationTimezone(shipment) || 'America/Chicago';
    const presenterOpts = {
        deliveryDays: settings.tobacco ? eddTobacco : edd,
        destinationTimezone: timezone,
        shipment
    };
    return presenter(tracking, presenterOpts);
};

const getTrackingMiddleware = async (req, res) => {
    const trackingNumber = req.params.trackingNumber;
    const org = req.org;

    const events = await getTracking(org, trackingNumber);

    return res.status(200).send({
        tracking_number: req.params.trackingNumber,
        ...events
    });
};

module.exports = {
    getTracking,
    getTrackingMiddleware
};
