'use strict';
const zipZoneController = require('../../../../../controllers/graphql/zipZone');

const typeDefs = `
type PickupAddress {
    address1 : String
    city : String
    state : String
    zip : String
}

type Options {
    accountNumber : String
    pickupAddress : PickupAddress
    vehicle : String
    parcelType : String
    pickupTimezone : String
    bestZone : String
    bestTNT : String
    das : String
    customerBranch : String
    name : String
    zone : String
    tnt : String
}

type ZipZone {
    id: String
    zipcode : String!
    sortcode : String
    carrier : String!
    tobacco : Boolean
    service : String
    max_weight : String
    options : Options!
    commercial : Boolean
    shipper_id : String
}

type CarrierCount {
    id : String!
    count : String!
}

type ZipZoneResults {
    zipzones : [ZipZone]
    hasMore : Boolean
}

extend type Viewrec {
    "fetch by startIndex, count",
     zipZone(id: String = ""): ZipZone
     zipZones(start: Int, count: Int, searchWord: String = "", carrier: [String] = [""]): ZipZoneResults
     zipZoneCarriers : [CarrierCount]
}

`;

const resolvers = {
    Viewrec: {
        zipZone: zipZoneController.getZipZone,
        zipZones: zipZoneController.getZipZones,
        zipZoneCarriers: zipZoneController.getTerminalProviders
    }
};

module.exports = { typeDefs, resolvers };
