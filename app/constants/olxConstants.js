// OLX constants

const CONTROLLED_SUBSTANCES = Object.freeze([
    'tobacco'
]);

const DELIVERY_CONFIRMATION_TYPE = Object.freeze({
    none: 'none',
    signatureRequired: 'signature_required',
    signatureRequiredBy21: '21_signature_required'
});

const OLX_LABEL_FORMATS = Object.freeze([
    'P4x6',
    'Z4x6'
]);

const DIM_DIVISOR = 166.00;

module.exports = {
    CONTROLLED_SUBSTANCES,
    DELIVERY_CONFIRMATION_TYPE,
    OLX_LABEL_FORMATS,
    DIM_DIVISOR
};
