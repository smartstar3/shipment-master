// api/internal/graphql/types/organizations.js -- manage all organizations GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const organizationController = require('../../../../../controllers/graphql/organization');

const typeDefs = `

""" 
Individual Tracker record containing either address or +/- Lat/Lon
"""

type Settings {
  tobacco: Boolean
  tobaccoShipToBusiness: Boolean
}

input SettingsInput { 
  tobacco: Boolean
  tobaccoShipToBusiness: Boolean
}


type Rates {
  zone1: Float
  zone2: Float
  zone3: Float
  zone4: Float
  zone5: Float
  zone6: Float
  zone7: Float
  zone8: Float
}

type RateCard {
  weight : Int
  rates : Rates
}

type Organization {
    id: String!
    name: String!
    type: String!
    shipperSeqNum: Int
    description: String
    address: String
    city: String
    contactName: String
    contactPhone: String
    contactEmail:String!
    apiId: String
    apiKey: String
    settings : Settings
    createdAt: String
    updatedAt: String
    terminalProviderOrder : [String]
}

type TerminalProviders {
    activeProviders : [String]
    disabledProviders : [String]
}

extend type Mutation {
  createOrganization(
    name: String!
    type: String!
    description: String
    address: String
    city: String
    contactName: String
    contactPhone: String
    contactEmail: String!
    settings: SettingsInput
  ): Organization
  
  updateOrganization(
    id: String!, 
    name: String!
    type: String!
    description: String
    address: String
    contactName: String
    city: String
    contactPhone: String
    contactEmail:String!
    settings: SettingsInput
    terminalProviderOrder: [String]
  ): Organization
  
  deleteOrganization(
    id: String!
  ): String!
  
  updateApiKey(
    id: String!
   ): String!
}  

extend type Viewrec {
    "fetch by startIndex, count",
     totalOrganizations(searchWord: String = ""): Int
     organizations(start: Int, count: Int, searchWord: String = ""): [Organization]
     organization(id: String = ""): Organization
     rateCard(shipperId : Int ): [RateCard]
     terminalProviders(shipperSeqNum : Int) : TerminalProviders 
}

`;

// for now, resolvers just return stub data
//

const resolvers = {
    Viewrec: {
        organization: organizationController.getOrganization,
        organizations: organizationController.getOrganizations,
        totalOrganizations: organizationController.getTotalOrganizations,
        rateCard: organizationController.getOrganizationRates,
        terminalProviders: organizationController.getTerminalProviders
    },
    Mutation: {
        createOrganization: organizationController.createOrganization,
        updateOrganization: organizationController.updateOrganization,
        deleteOrganization: organizationController.deleteOrganization,
        updateApiKey: organizationController.updateOrganizationapiKey
    }
};

module.exports = { typeDefs, resolvers };
