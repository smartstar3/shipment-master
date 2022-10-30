'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'rateCards',
    index: [[{ shipperId: 1, effectiveAt: 1 }]]
};

// Example document structure
//
// {
//     shipperId : <int>,      -- the shipper_id of the org that this rate table is owned by
//     effectiveAt : <date>,   -- the date that this rate table comes into effect
//     expiresAt : <date>,     -- the date that this rate table is no longer in effect
//     weight : <int>        -- the weight in oz of the item shipped
//     zone : <int>            -- the zone (1-8) associated with this cost
//     cost : <float>          -- the price of this weight zone combination
// }

module.exports = new BasicModel(schema);
