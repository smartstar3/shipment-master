const vcr = require('vcr');

vcr.configure({
    sensitiveElements: [
        'AccountNumber',
        'client_id',
        'client_key',
        'client_secret',
        'Key',
        'MeterNumber',
        'password',
        'Password',
        'refreshToken',
        'token'
    ],
    uniqueElements: [
        'appId',
        'barcodeTemplate',
        'dropoff_earliest_ts',
        'dropoff_latest_ts',
        'Date',
        'DeliveryTargetFrom',
        'DeliveryTargetTo',
        'estimatedDeliveryDate',
        'id',
        'lastUpdateDate',
        'packageId',
        'PickupTargetFrom',
        'PickupTargetTo',
        'ReadyAt',
        'reference',
        'RefNo',
        'shipDate',
        'ShipDate',
        'ShipTimestamp',
        'TimeUpToWhichShipmentsAreToBeClosed',
        'trackingNo',
        'UTCExpectedDeliveryBy',
        'UTCExpectedDeparture',
        'UTCExpectedInjection',
        'UTCExpectedReadyForPickupBy'
    ],
    sensitivePaths: [
        /\/Method\/PlaceOrder\/v2\/json\/(.*?)\/(.*?)\/1\/1\/[ZP]4x6/,
        /\/OnTracWebServices\/OnTracServices\.svc\/V4\/(.*?)\/shipments\?pw=(.*)/
    ],
    unrecordedScopes: [
    ]
});
