'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'zip_zone',
    index: [[{ zipcode: 1, shipper_id: 1 }]]
};

// Example document structure
//
// {
//     zipcode: <string>,  -- target zip code
//     sortcode: <string>  -- the sort code for this zipcode and carrier combination
//     carrier: <string>,  -- the carrier used to deliver to this zip code
//     service: <string>,  -- the service to purchase
//     max_weight: <int>   -- the maximum weight (in ounces) that this rule should be used for
//     shipper_id: <int>   -- shipper_id is present if this is an override
//     options: {          -- freeform carrier specific options
//         ...
//     }
// }

module.exports = new BasicModel(schema);
