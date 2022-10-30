// models/organizations.js -- model for organization collection
'use strict';
const BasicModel = require('./BasicModel');

// example document
//
// {
//     name: 'string',
//     type: enum['customer', 'shipper', 'partner'],
//     description: 'string',
//     address: 'string',
//     city: 'string',
//     state: 'string[2]',
//     zip: 'string',
//     contactName: 'string',
//     contactPhone: 'string',
//     contactEmail: 'string',
//     settings: 'object',
//     createdAt: ISODate - required
//     updatedAt: IsoDate - required
// }
//

// see README, schema is not enfored beyond name and index structure
//
const schema = {
    name: 'organizations',
    index: []
};

module.exports = new BasicModel(schema);
