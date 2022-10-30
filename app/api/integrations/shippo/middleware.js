/* eslint-disable camelcase */
const uuid = require('uuid');
const { NotFoundError, UnprocessableEntityError } = require('errors');

const {
    cancelOrder,
    createOrder,
    STATUS_ERROR_MESSAGES: ORDER_MESSAGES
} = require('../../../controllers/rest/order');
const { DELIVERY_CONFIRMATION_TYPE } = require('../../../constants/olxConstants');
const { externalStatusMap, internalStatusMap } = require('./statusCodes');
const { getProp, setProp } = require('../../../helpers/utils');
const { getRate } = require('../../../controllers/rest/rate');
const { getTracking } = require('../../../controllers/rest/track');
const { present } = require('../../../presenters/events');

// @todo what is our service level going to be called?
const SERVICE_LEVEL = 'Expedited';

const validationMsgs = {
    'account.account_id': () => 'no account id specified',
    image_format: (format) => `unknown image_format '${format}'`,
    'shipment.parcels': () => 'only a single parcel is supported per shipment',
    'shipment.parcels.dimensions': (unit) => `unrecognized dimensional unit '${unit}'`,
    'shipment.parcels.weight': (unit) => `unrecognized weight unit '${unit}'`,
    tracking_numbers: () => 'No tracking numbers specified'
};

const throwValidationError = (key, ...args) => {
    const msgFn = getProp(validationMsgs, key, 'validation error');
    throw new UnprocessableEntityError({
        errors: [{
            name: key,
            message: msgFn(...args)
        }]
    });
};

const dimToIn = {
    ft: 12,
    mm: 0.0393701,
    cm: 0.393701,
    m: 39.3701
};

// normalize all dimensions to in
const normalizeDimensions = (opts = {}) => {
    const { height, length, width, unit } = opts;

    const normalized = {
        height,
        length,
        width
    };

    if (unit === 'in') return normalized;

    const multiplier = getProp(dimToIn, unit);

    if (!multiplier) {
        return null;
    }

    Object.entries(normalized).forEach(([key, value]) => {
        const numValue = parseFloat(value) * multiplier;
        setProp(normalized, key, numValue.toString());
    });

    return normalized;
};

const weightToOz = {
    lb: 16,
    g: 0.035274,
    kg: 35.274
};

// normalize all weight to oz
const normalizeWeight = ({ value, unit } = {}) => {
    if (unit === 'oz') return value;

    const multiplier = getProp(weightToOz, unit);

    if (!multiplier) {
        return null;
    }

    const numValue = parseFloat(value) * multiplier;
    return numValue.toString();
};

const imageToLabel = {
    PDF_4x6: 'P4x6',
    ZPLII: 'Z4x6'
    // PNG: '???'
};

const labelToImage = {
    p4x6: 'PDF_4x6',
    Z4x6: 'ZPLII'
    // ???: 'PNG'
};

const requestTransforms = {
    address: (address = {}) => {
        const {
            name,
            phone,
            // email,
            street1,
            street2,
            city,
            state,
            zip,
            country
        } = address;

        return {
            name,
            phone,
            address1: street1,
            address2: street2,
            city,
            state,
            zip,
            country
        };
    },
    label: (obj = {}) => {
        const {
            // account: { account_id },
            shipment: {
                shipment_id,
                // shipment_date,
                sender_address,
                // @todo seems like these should go somewhere
                // delivery_instructions,
                recipient_address,
                // customs_declaration,
                parcels = [],
                is_signature_required = false
            } = {},
            image_format
            // following are ignored for now as awe are not set up for rate_ids
            // or multiple service levels
            // rate_id,
            // service
        } = obj;

        const to_address = requestTransforms.address(recipient_address);
        const from_address = requestTransforms.address(sender_address);

        const label_format = getProp(imageToLabel, image_format);
        if (!label_format) {
            throwValidationError('image_format');
        }

        // @todo it looks like our API interface could be made to support multiple pieces

        if (parcels.length > 1) {
            throwValidationError('shipment.parcels');
        }

        const parcel = requestTransforms.parcel(parcels[0], is_signature_required);

        return {
            shipper_name: to_address.name,
            shipper_phone: from_address.phone,
            reference_id: shipment_id,
            reference_data: shipment_id,
            to_address,
            from_address,
            return_address: from_address,
            parcel,
            label_format
        };
    },
    parcel: (parcels, isSignatureRequired = false) => {
        const { dimensions, weight: weightObj, items = [] } = parcels;

        const normalizedDims = normalizeDimensions(dimensions);
        if (!normalizedDims) {
            throwValidationError('shipment.parcels.dimensions', dimensions.unit);
        }
        const { height, length, width } = normalizedDims;

        const weight = normalizeWeight(weightObj);
        if (!weight) {
            throwValidationError('shipment.parcels.weight', weight.unit);
        }

        let description = '';

        if (Array.isArray(items) && items.length > 0) {
            description = items.reduce(
                (str, { description, quantity }) => {
                    if (!description) return str;

                    if (str.length > 0) {
                        str += ' | ';
                    }
                    if (quantity && quantity > 0) {
                        str += `(${quantity}) `;
                    }
                    str += description;
                    return str;
                },
                ''
            );
        }

        return {
            description,
            height,
            length,
            width,
            weight,
            attributes: {
                delivery_confirmation: (isSignatureRequired)
                    ? DELIVERY_CONFIRMATION_TYPE.signatureRequired
                    : DELIVERY_CONFIRMATION_TYPE.none
            }
        };
    },
    rate: (obj = {}) => {
        const {
            // account: { account_id },
            shipment: {
                shipment_id,
                // shipment_date,
                sender_address,
                // delivery_instructions,
                recipient_address,
                // customs_declaration,
                parcels = [],
                is_signature_required = false
            } = {}
            // service
        } = obj;

        const to_address = requestTransforms.address(recipient_address);
        const from_address = requestTransforms.address(sender_address);

        if (parcels.length > 1) {
            throwValidationError('shipment.parcels');
        }

        const parcel = requestTransforms.parcel(parcels[0], is_signature_required);

        return {
            reference_id: shipment_id,
            reference_data: shipment_id,
            to_address,
            from_address,
            parcel
        };
    }
};

const responseTransforms = {
    label: (response, account_id) => {
        const {
            tn: tracking_number,
            reference_id,
            label: { type, base64 }
        } = response;

        return {
            account_id,
            label_id: uuid.v4(),
            shipment_id: reference_id,
            rate_id: uuid.v4(),
            service: SERVICE_LEVEL,
            tracking_number,
            amount: '',
            currency: 'USD',
            // @todo should we leave this empty? put 3 business days out?
            eta_date: '',
            image: {
                format: getProp(labelToImage, type),
                content: base64
            },
            messages: []
        };
    },
    rate: (response = {}, account_id) => {
        const {
            reference_id,
            rate: {
                cost
            } = {}
        } = response;

        return {
            account_id,
            shipment_id: reference_id,
            rates: [{
                amount: cost,
                currency: 'USD',
                eta_date: '',
                rate_id: uuid.v4(),
                service: SERVICE_LEVEL
            }],
            messages: []
        };
    },
    // this is usd as a presenter function, so has that same interface
    track: async (events = [], opts = {}) => {
        const { shipment } = opts;
        const {
            tn,
            to_address: {
                city,
                state,
                zip,
                country
            }
        } = shipment;

        const presented = await present(events, opts);
        const {
            expectedDeliveryDate: eta = '',
            status: externalStatus
        } = presented;

        const status = getProp(externalStatusMap, externalStatus);

        if (!status) {
            throw new Error(`Unexpected status '${externalStatus}' returned from internal tracking API`);
        }

        const tracking_events = presented.events.map(responseTransforms.trackingEvent);

        return {
            tracking_number: tn.toString(),
            eta,
            status,
            recipient_location: {
                city,
                state,
                zip,
                country
            },
            tracking_events,
            messages: []
        };
    },
    trackingEvent: (event) => {
        const {
            timestamp: status_date,
            status: internalStatus,
            message: status_details,
            location: {
                city,
                state,
                zip
            }
        } = event;

        const statusObj = getProp(internalStatusMap, internalStatus);

        if (!statusObj) {
            throw new Error(`Unexpected status '${internalStatus}' returned from internal tracking API`);
        }

        const status_code = statusObj.statusCode;

        return {
            status_date,
            status_code,
            status_details,
            location: {
                city,
                state,
                zip,
                country: 'US'
            }
        };
    }
};

const getAccountId = (req) => {
    const accountId = req?.body?.account?.account_id;

    if (!accountId) {
        throwValidationError('account.account_id');
    }

    return accountId;
};

const getTrackingNumbers = (req) => {
    const trackingNumbers = req?.body?.tracking_numbers;

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        throwValidationError('tracking_numbers');
    }

    return trackingNumbers;
};

const cancelMiddleware = async (req, res) => {
    const org = req.org;
    const trackingNumbers = getTrackingNumbers(req);

    const promises = trackingNumbers.map(
        (tracking_number) => cancelOrder(org, tracking_number)
            .then((data) => {
                const { cancelled_time: received_date } = data;
                return {
                    tracking_number,
                    received_date,
                    approved: true,
                    status_code: 'approved'
                };
            })
            .catch((err) => {
                let statusCode = (err instanceof NotFoundError) ? 'label_not_found' : 'cancellation_failed';
                if (err instanceof UnprocessableEntityError) {
                    const errMsg = (Array.isArray(err.errors) && err.errors[0]?.message) ? err.errors[0].message : null;
                    if (errMsg === ORDER_MESSAGES.delivered) {
                        statusCode = 'label_already_used';
                    }
                }

                return {
                    tracking_number,
                    received_date: (new Date()).toISOString(),
                    approved: false,
                    status_code: statusCode
                };
            })
    );

    const response = await Promise.all(promises);
    res.status(201).json(response);
};

const labelsMiddleware = async (req, res) => {
    const { body, org } = req;

    const accountId = getAccountId(req);

    // currently we only support the instalabel use case in that we
    // do not store rate_id and simply ignore any passed value
    const isInstalabel = true;

    // future use for rate_id / service level support
    // const { rate_id, service } = body;
    //
    // let isInstalabel = false;
    // if (rate_id === null && service) {
    //     isInstalabel = true;
    // }

    const labelPresenter = (data) => responseTransforms.label(data, accountId);

    const labelRequest = requestTransforms.label(body);
    const response = await createOrder(org, labelRequest, labelPresenter);

    if (isInstalabel) {
        const rateRequest = requestTransforms.rate(body);
        const rate = await getRate(org, rateRequest, (data) => data.rate.cost);

        response.amount = rate;
    }

    res.status(201).json(response);
};

const ratingMiddleware = async (req, res) => {
    const { body, org } = req;

    const accountId = getAccountId(req);
    const ratingPresenter = (data) => responseTransforms.rate(data, accountId);

    const rateRequest = requestTransforms.rate(body);
    const rate = await getRate(org, rateRequest, ratingPresenter);

    res.status(201).json(rate);
};

const trackingMiddleware = async (req, res) => {
    const org = req.org;
    const trackingNumbers = getTrackingNumbers(req);

    const promises = trackingNumbers.map(
        (tracking_number) => getTracking(org, tracking_number, responseTransforms.track)
            /* eslint-disable-next-line handle-callback-err */
            .catch(() => {
                return {
                    tracking_number,
                    status: 'unknown',
                    tracking_events: [],
                    messages: []
                };
            })
    );

    const response = await Promise.all(promises);
    res.status(201).json(response);
};

module.exports = {
    cancelMiddleware,
    labelsMiddleware,
    ratingMiddleware,
    trackingMiddleware
};
