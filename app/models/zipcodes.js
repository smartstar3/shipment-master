'use strict';
const BasicModel = require('./BasicModel');

const schema = {
    name: 'zipcodes',
    index: [[{ zipcode: 1 }, { unique: true }]]
};

// Example document structure
//
// {
//     zipcode: <string>,  -- target zip code
//     city: <string>,
//     state: <string>,
//     coordinates: { lat: <number>, lng: <number> },
//     geolocation: { type: 'Point', coordinates: [ <number>, <number> ] }, -- mongo DB GeoJSON Object, coordinates are ordered as [ <long>, <lat> ]
//     timezone: <string>
// }

module.exports = new BasicModel(schema);
