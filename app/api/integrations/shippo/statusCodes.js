const { deepFreeze, getProp, setProp } = require('../../../helpers/utils');
const { STATUSES, EXTERNAL_STATUSES } = require('@onelive-dev/transport');
const { STATUSES: { LABEL_CREATED } } = require('../../../constants/trackingConstants');

/**
 * Map of external event codes to status code.
 * This is used for shipment-level status code mapping.
 */
const externalStatusMap = EXTERNAL_STATUSES.reduce(
    (map, externalStatus) => {
        let status = null;

        switch (externalStatus) {
        case 'Unknown':
        case 'Not Received':
            status = 'unknown';
            break;
        case 'Label Created':
            status = 'pre-transit';
            break;
        case 'In-Transit':
        case 'Out for Delivery':
        case 'Delivery Attempted':
        case 'Hold for Pickup':
        case 'Delayed':
        case 'Exception':
            status = 'transit';
            break;
        case 'Delivered':
            status = 'delivered';
            break;
        case 'Return to Sender': {
            status = 'returned';
            break;
        }
        case 'Undeliverable':
            status = 'failure';
            break;
        default:
            throw new Error(`Unexpected external status code of '${externalStatus}'`);
        }

        setProp(map, externalStatus, status);
        return map;
    },
    {}
);

deepFreeze(externalStatusMap);

/**
 * Mapping of internal status code to shippo status codes.
 * Commented out properties indicate those that are either hidden by default in normal tracking API
 * or might not be meaningful here.
 *
 *  @see https://shippo-carrier-framework.readme.io/docs/tracking-event-codes
 */
const internalToShippoStatus = {
    [LABEL_CREATED]: 'information_received',
    // 'Label Created: Manifested': 'information_received',
    'In-Transit': 'delivery_scheduled',
    'In-Transit: Arrived at Facility': 'package_arrived',
    'In-Transit: Received at Facility': 'package_arrived',
    'In-Transit: Processing at Facility': 'package_processing',
    'In-Transit: Departed Facility': 'package_processed',
    'In-Transit: Tendered to carrier': 'package_accepted',
    // 'In-Transit: Converted to different service level': 'delivery_rescheduled',
    'In-Transit: Misroute': 'delayed',
    // 'In-Transit: Meaningless update': 'delivery_scheduled',
    'Out for Delivery': 'out_for_delivery',
    Attempted: 'delivery_attempted',
    'Attempted: Inaccessible': 'location_inaccessible',
    'Attempted: Pick-up Required': 'package_held',
    'Attempted: Redelivery Required': 'delivery_rescheduled',
    'Attempted: Additional Information Needed': 'delivery_attempted',
    'Attempted: Mailbox Full': 'delivery_attempted',
    'Attempted: Signature not available': 'delivery_attempted',
    'Attempted: No one home ': 'delivery_attempted',
    'Attempted: Business closed': 'delivery_rescheduled',
    'Attempted: Notice Left': 'notice_left',
    Delivered: 'delivered',
    'Delivered: Potential Issue': 'delivered',
    'Delivered: With Neighbor': 'delivered',
    'Delivered: Front desk': 'delivered',
    'Delivered: Backdoor': 'delivered',
    'Delivered: Mailroom': 'delivered',
    'Delivered: Garage': 'delivered',
    'Delivered: Porch': 'delivered',
    'Hold for Pickup': 'package_held',
    Delayed: 'delayed',
    'Delayed: Weather': 'delayed',
    'Delayed: Mechanical Issues': 'delayed',
    'Delayed: Truck Issues': 'delayed',
    'Delayed: Route Closed': 'delayed',
    'Delayed: Customer Request': 'delayed',
    'Delayed: Delivered at Incorrect Address': 'package_disposed',
    'Delayed: Holiday/Non-Working Day': 'delayed',
    // @todo should we support this code?
    'Exception: Missing Update': 'delivery_scheduled',
    'Exception: Change of Address': 'delivery_rescheduled',
    'Exception: Customer Requested New Delivery Date': 'delivery_rescheduled',
    // @todo should we support this code?
    'Exception: Incorrect Status Update': 'delivery_scheduled',
    'Exception: Partial Delivery': 'out_for_delivery',
    'Exception: Package being held': 'package_held',
    Undeliverable: 'package_undeliverable',
    'Undeliverable: Insufficient Address': 'package_undeliverable',
    'Undeliverable: Bad Address': 'package_undeliverable',
    'Undeliverable: Damaged / Destroyed': 'package_undeliverable',
    'Undeliverable: Dangerous Goods': 'package_undeliverable',
    // @todo is this right code for this case?
    'Undeliverable: Package Refused': 'reschedule_delivery',
    'Undeliverable: Package Lost': 'package_lost',
    'Undeliverable: Misc Package Issue': 'package_undeliverable',
    'Undeliverable: Location not secure': 'delivery_attempted',
    'Undeliverable: Improper Packaging': 'package_undeliverable',
    'Return to Sender': 'return_to_sender',
    Unknown: 'unknown',
    'Unknown: No Scans': 'unknown'
};

/**
 * Map of internal event codes to status code object including both Shippo and externalStatus values.
 * This is used for event-level status code mapping.
 */
const internalStatusMap = Object.entries(internalToShippoStatus).reduce(
    (map, [key, statusCode]) => {
        const merged = {
            ...getProp(STATUSES, key),
            statusCode
        };
        merged.status = externalStatusMap[merged.externalStatus];

        setProp(map, key, merged);
        return map;
    },
    {}
);

deepFreeze(internalStatusMap);

module.exports = {
    externalStatusMap,
    internalStatusMap
};
