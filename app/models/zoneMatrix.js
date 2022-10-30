'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'zoneMatrix',
    index: [[{ prefix: 1 }, { unique: true }]]
};

module.exports = new BasicModel(schema);
