// api/internal/graphql/types/organizations.js -- manage all organizations GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const organizationController = require('./../../../../../controllers/graphql/organization');

const typeDefs = `

""" 
Individual Tracker record containing either address or +/- Lat/Lon
"""
type Organization {
    id: String!
    name: String!
    type: String!
    description: String
    address: String
    contactName: String
    contactPhone: String
    contactEmail:String!
    apiId: String
    apiKey: String
}

extend type Mutation {
  updateApiKey(
      id: String!
  ): String!
}  

`;

// for now, resolvers just return stub data
//

const resolvers = {
    Mutation: {
        updateApiKey: organizationController.updateOrganizationapiKey
    }
};

module.exports = { typeDefs, resolvers };
