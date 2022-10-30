// api/internal/graphql/types/shipments.js -- manage all shipment GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const organizationController = require('../../../../../controllers/graphql/organization');
const { auth0: { audience } } = require('../../../../../config');

const typeDefs = `

type Settings {
    tobacco: Boolean
    tobaccoShipToBusiness: Boolean
}

type Consent {
    email: String
    timestamp: String
}

type Organization {
   name: String
   type: String
   shipperSeqNum: String 
   description : String
   address : String
   city : String
   state : String
   zip : String
   contactName : String
   contactPhone : String
   contactEmail : String
   apiId : String
   apiKey : String
   settings : Settings
   consent : Consent 
}

type ApiKey { 
    apiId : String!
    apiKey : String!
    shipperSeqNum : String!
}

extend type Query {
    "fetch organization by claim"
    organization: [Organization],
    apiKey(apiId : String ) : ApiKey
}

extend type Mutation {
    recordConsent : Organization
}

`;

const extractOrg = (context) => (
    context[[`${audience}/organizationId`]]
);

const extractEmail = (context) => (
    context[[`${audience}/email`]]
);

const resolvers = {
    Query: {
        organization: (_, _args, context) => {
            return organizationController.getOrganizationsByScope({ ids: extractOrg(context.user) });
        },
        apiKey: (_, args, context) => {
            return organizationController.getApiKey({ ...args, organizationScope: extractOrg(context.user) });
        }
    },
    Mutation: {
        recordConsent: (_, _args, context) => {
            return organizationController.recordConsent({
                email: extractEmail(context.user),
                id: extractOrg(context.user)[0]
            });
        }
    }
};

module.exports = { typeDefs, resolvers };
