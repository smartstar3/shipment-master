// api/internal/graphql/types/shipments.js -- manage all shipment GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const shipmentController = require('../../../../../controllers/graphql/shipment');
const vendorController = require('../../../../../controllers/graphql/vendor');

const typeDefs = `

""" 
Individual shipment record containing either address or +/- Lat/Lon
"""
type Tracking {
    expectedDeliveryDate: String
    events: [Event]
    status: String
}

type Event { 
    timestamp: String
    status: String
    message: String
    location: Location
    expectedDeliveryDate: String
}


type Location {
    city: String
    state: String
    zip: String
    lat: Float
    lng : Float
    timezone : String
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
    name: String
    address1: String
    address2: String
    city: String
    state: String
    zip: String
    country: String
    phone: String
}

input ShipmentSort {
    field: String,
    order: Int,
}

type Parcel {
    description: String
    length: String
    width: String
    height: String
    weight: String
    value: String
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
    parcel: Parcel
    shipperName: String
    label: Label
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
    "fetch by trackingNum"
    shipments(
        trackingNum: String,
        searchWord: String, 
        startDate: String, 
        endDate: String,
        sorting: ShipmentSort, 
        start: Int, 
        count: Int, 
        vendor: String,
        status: String,
    ): [Shipment]
    "fetched Shipment count"
    totalShipmentCount(
        trackingNum: String,
        searchWord: String, 
        startDate: String, 
        endDate: String, 
        organizationId: String,
        vendor: String,
        status: String,
    ): Int
    "fetch vendors"
    vendors: [Vendor]
}
`;

// for now, resovers just return stub data
//
const resolvers = {
    Viewrec: {
        shipment: (parent, args) => shipmentController.getShipmentByTrackingNumber(args),
        shipments: (parent, args, context) => shipmentController.getShipmentsByUser(args, context),
        totalShipmentCount: (parent, args, context) => shipmentController.getTotalShipmentCountByUser(args, context),
        vendors: () => vendorController.getVendors()
    }
};

module.exports = { typeDefs, resolvers };
