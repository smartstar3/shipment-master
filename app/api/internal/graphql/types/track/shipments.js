// api/internal/graphql/types/shipment.js -- manage all shipment GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const shipmentController = require('../../../../../controllers/graphql/shipment');

const typeDefs = `

""" 
Individual shipment record containing either address or +/- Lat/Lon
"""
type Tracking {
    expectedDeliveryDate: String
    events: [Event]
    status: String
}

type Location {
    city: String
    state: String
    zip: String
    lat: Float
    lng : Float
    timezone : String
}

type Event { 
    timestamp: String
    status: String
    message: String
    location: Location
    expectedDeliveryDate: String
}

type Shipper {
    id: String
    name: String
    shipperSeqNum: Int
}

type Label {
    type: String
    base64: String
}

type Address {
    city: String
    state: String
}

type Shipment {
    "Tracking Number"
    tn: String!
    status: String!
    date: String
    vendor: String
    tracking: Tracking
    toAddress: Address
    fromAddress: Address
}    

type Vendor {
    id: String
    name: String
}

extend type Viewrec {
    "fetch by trackingNum"
    shipment(
        trackingNum: String,
    ): Shipment
}
`;

// for now, resovers just return stub data
//
const resolvers = {
    Viewrec: {
        shipment: (parent, args) => shipmentController.getShipmentByTrackingNumber(args)
    }
};

module.exports = { typeDefs, resolvers };
