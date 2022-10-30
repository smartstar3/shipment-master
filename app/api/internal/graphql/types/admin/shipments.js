// api/internal/graphql/types/shipments.js -- manage all shipment GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const shipmentController = require('../../../../../controllers/graphql/shipment');
const vendorController = require('../../../../../controllers/graphql/vendor');

const typeDefs = `

""" 
Individual Tracker record containing either address or +/- Lat/Lon
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

type Parcel {
    description: String
    length: String
    width: String
    height: String
    weight: String
    value: String
    tracking_num: String
}

type Rate {
    billable_weight: String
    cost: String
    dollar_cost: String
    zone: Int
    use_dim_weight: Boolean
}

type Shipment {
    "Tracking Number"
    tn: String!
    status: String!
    date: String
    organization: Shipper
    vendor: String
    label: Label
    tracking: Tracking
    referenceId: String,
    referenceData: String,
    toAddress: Address
    fromAddress: Address
    shipperName: String
    parcel: Parcel
    rate: Rate
}    

type Vendor {
    id: String
    name: String
}

input ShipmentSort {
    field: String,
    order: Int,
}

type ShipmentResults {
    shipments : [Shipment]
    hasMore : Boolean
}

extend type Viewrec {
    "get shipment by matched trackingNum"
    shipment(trackingNum: String!): Shipment
    "fetch by trackingNum or shipperName, date, status, vendor and organization"
    shipments(
        searchWord: String, 
        startDate: String, 
        endDate: String, 
        organizationId: String, 
        sorting: ShipmentSort, 
        start: Int, 
        count: Int, 
        vendor: String,
        status: String,
    ): ShipmentResults
    "fetch vendors"
    vendors: [Vendor]
}

`;

// for now, resovers just return stub data
//
const resolvers = {
    Viewrec: {
        shipment: (parent, args) => shipmentController.getShipmentByTrackingNumber(args),
        shipments: (parent, args) => shipmentController.getShipmentsByAdmin(args),
        vendors: () => vendorController.getVendors()
    }
};

module.exports = { typeDefs, resolvers };
