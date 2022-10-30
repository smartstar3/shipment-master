// subsystems/rulesEngine/targetZip.js -- top-level rule processor to determine eligibility and selection for a zip code
//
// usage:
//
// target_zip( '78701' )
//     .then( carrier => {process carrier order using resolved fact data} )
//     .catch( () => {zip not eligible} )
//
//
'use strict';
const checkEligibility = require('./defaultRules');
const { CARRIER_NAMES: { dhlecommerce, ...activeCarriers } } = require('../../constants/carrierConstants');
const { forceTobaccoShipments } = require('../../config');
const { getProp, setProp } = require('../../helpers/utils');

// runs through an array of carriers in order and compares them against entries in a facts object.
// returns the first carrier that has a value in the facts object.
/* istanbul ignore next */
const checkCarriers = (orderedCarriers = [], facts) => {
    for (const carrier of orderedCarriers) {
        const fact = getProp(facts, carrier);
        if (fact) {
            return fact;
        }
    }
};

module.exports = async (org, {
    controlled_substance: controlledSubstance = null,
    to_address: toAddress,
    parcel
}) => {
    const { settings = {}, terminalProviderOrder } = org;

    const targetZip = {
        zipcode: toAddress.zip,
        weight: parseFloat(parcel.weight),
        shipperId: org.shipperSeqNum
    };

    let tobacco = false;
    if (
        controlledSubstance === 'tobacco' ||
        (forceTobaccoShipments && settings.tobacco)
    ) {
        tobacco = true;
    }

    if (tobacco) {
        targetZip.tobacco = true;
    }

    const terminalProviderFacts = {};
    for (const carrier of Object.values(activeCarriers)) {
        setProp(terminalProviderFacts, carrier, await checkEligibility(carrier, targetZip));
    }

    return checkCarriers(terminalProviderOrder, terminalProviderFacts) || null;
};
