'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'identities',
    index: [[{ oauthId: 1 }, { unique: true }]]
};

// Example document structure
//
// {
//     oauthId: <string>,  -- oauthId for this user
// }

module.exports = new BasicModel(schema);
