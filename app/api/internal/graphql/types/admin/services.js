// graphql/types/services.js -- manage all services types, adding them onto the top "viewer" object in the root query
//
'use strict';
const serviceController = require('../../../../../controllers/graphql/service');

const typeDefs = `

type Status {
    status: String,
    responseMs: Int,
    bytesTx: Int,
    bytesRx: Int,
    url: String,
    created_at: String
}

type Service {
    id: String!
    name: String!
    statuses: [Status]
}

extend type Viewrec {
    "fetch services",
     services(serviceId: String, year: Int, startMonth: Int): [Service]
}

`;

// for now, resolvers just return stub data
//

const resolvers = {
    Viewrec: {
        services: serviceController.getServices
    }
};

module.exports = { typeDefs, resolvers };
