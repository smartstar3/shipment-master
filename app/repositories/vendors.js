const { CARRIER_NAMES } = require('./../constants/carrierConstants');

const getVendors = () => {
    // TODO: currently we set the carriers by statistics. we will move the carriers to DB in the future.
    //  for now, use key as id because all of front end are working with id and name.
    return Object.entries(CARRIER_NAMES).map(([key, value]) => {
        return { id: key, name: value };
    });
};

module.exports = {
    getVendors
};
