'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'provider'
};

// Example document structure
//
// {
//     carrier : <string> name of the carrier that these credentials map to (should match zipzone carrier)
//     credentials : <object> hashed credentials to pass to the integration
// }

module.exports = new BasicModel(schema);
