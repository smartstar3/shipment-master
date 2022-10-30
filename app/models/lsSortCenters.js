// models/lsSortCenters -- model for collection of LaserShip Sorting Center information
//
//
'use strict';
const BasicModel = require('./BasicModel');

// see README - there is no enforcement of schema beyond name and index structure
//
const schema = {
    // collection name
    name: 'ls_sort_centers',

    // index config
    index: [[{ CustomerBranch: 1 }, { unique: true }]]
};

// Example document structure
//
// {
//     CustomerBranch: 'string',
//     PickupType: enum ['LaserShip', 'None'],
//     ServiceCode: bsonType: 'string',
//     Origin: {
//         LocationType: enum ['Business', 'Residence'],
//         CustomerClientID: 'string'
//         Contact: 'string',
//         Organization: 'string',
//         Address: 'string',
//         Address2: 'string',
//         PostalCode: 'string',
//         City: 'string',
//         State: 'string[2]',
//         Country: 'string[2]' -- ISO 3166-1 using Alpha-2 code
//         Phone: 'string',
//         PhoneExtension: 'string',
//         Email: 'string',
//         Instruction: 'string',
//         Note: 'string',
//         UTCExpectedReadyForPickupBy: 'string', // ISO 8601 - 2014-02-17T08:22:10Z
//         UTCExpectedDeparture: 'string' // ISO 8601 - 2014-02-17T08:22:10Z
//     },
//     Injection: {
//         LocationType: enum ['Business', 'Residence'],
//         CustomerClientID: 'string'
//         Contact: 'string',
//         Organization: 'string',
//         Address: 'string',
//         Address2: 'string',
//         PostalCode: 'string',
//         City: 'string',
//         State: 'string[2]',
//         Country: 'string[2]' -- ISO 3166-1 using Alpha-2 code
//         Phone: 'string',
//         PhoneExtension: 'string',
//         Email: 'string',
//         Instruction: 'string',
//         Note: 'string',
//         UTCExpectedInjection: 'string', // ISO 8601 - 2014-02-17T08:22:10Z
//     },
//     Return: {
//         LocationType: enum ['Business', 'Residence'],
//         CustomerClientID: 'string'
//         Contact: 'string',
//         Organization: 'string',
//         Address: 'string',
//         Address2: 'string',
//         PostalCode: 'string',
//         City: 'string',
//         State: 'string[2]',
//         Country: 'string[2]' -- ISO 3166-1 using Alpha-2 code
//         Phone: 'string',
//         PhoneExtension: 'string',
//         Email: 'string',
//         Instruction: 'string',
//         Note: 'string',
//     }
// }
//

module.exports = new BasicModel(schema);
