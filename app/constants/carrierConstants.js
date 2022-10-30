// Carrier name array
const CARRIER_NAMES = Object.freeze({
    axlehire: 'Axlehire',
    capitalExpress: 'CAPE',
    cSLogistics: 'CSL',
    deliverIt: 'DI',
    dhlecommerce: 'DHLeCommerce',
    expeditedDelivery: 'EXP-01',
    hackbarth: 'HKB',
    jet: 'JTL',
    jst: 'JST',
    laserShip: 'LaserShip',
    lso: 'LSO',
    mercury: 'MERC',
    michaelsMessengerService: 'MMES',
    nextDayExpress: 'NXDY',
    ontrac: 'OnTrac',
    parcelPrep: 'ParcelPrep',
    pillowLogistics: 'PIL',
    promed: 'PRMD',
    quickCourier: 'QUICK',
    sonic: 'SONIC',
    uds: 'UDS',
    veterans: 'VET',
    zipExpress: 'ZIP',
    stat: 'STAT'
});

const ORDER_STATUS = Object.freeze({
    tracking: 'tracking',
    delivered: 'delivered',
    cancelled: 'cancelled'
});

// tracking number lookup
const TRACKING_NUMBER_LOOKUP = Object.freeze([
    'docs.doc.trackingNumber',
    'docs.doc.masterTrackingNumber',
    'docs.doc.Pieces.0.LaserShipBarcode',
    'docs.doc.Tracking',
    'docs.doc.Barcode'
]);

module.exports = {
    CARRIER_NAMES,
    ORDER_STATUS,
    TRACKING_NUMBER_LOOKUP
};
