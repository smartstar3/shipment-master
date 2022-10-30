const STATUSES = Object.freeze({
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    LABEL_CREATED: 'Label Created',
    DELAYED: 'Delayed',
    EXCEPTION: 'Exception',
    UNDELIVERABLE: 'Undeliverable',
    RETURN_TO_SENDER: 'Return to Sender',
    HOLD_FOR_PICKUP: 'Hold for Pickup',
    DELIVERY_ATTEMPTED: 'Delivery Attempted',
    IN_TRANSIT: 'In-Transit'
});

const statusHierarchy = {
    Unknown: 1,
    'Label Created': 1,
    'In-Transit': 2,
    'Out for Delivery': 3,
    Delayed: 3,
    Exception: 3,
    'Delivery Attempted': 4,
    'Hold for Pickup': 4,
    Undeliverable: 5,
    Delivered: 6,
    'Return to Sender': 7
};

module.exports = {
    STATUSES,
    statusHierarchy
};
