// models/services.js -- model for services collection
'use strict';
const BasicModel = require('./BasicModel');

// example document
//
// {
//     name: 'string',
// }
//

// see README, schema is not enfored beyond name and index structure
//
const schema = {
    name: 'services',
    index: []
};

module.exports = new BasicModel(schema);
