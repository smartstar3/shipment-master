// api/internal/graphql/types/shipments.js -- manage all shipment GQL types, adding them onto the top "viewer" object in the root query
//
'use strict';
const shipmentController = require('../../../../../controllers/graphql/shipment');
const { auth0: { audience } } = require('../../../../../config');

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
    trackingStatus: String
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
    carrierTrackingNumber : String
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

type ShipmentFilters {
    carriers : [String]
    organizations : [String]
    status : [String]
}

extend type Query {
    shipments(
        searchWord: String
        startDate: String
        endDate: String
        organizationName: String
        sorting: ShipmentSort
        start: Int 
        count: Int
        vendorName: String
        eventStatus: String
    ): ShipmentResults
    "fetch possible filters for shipments"
    shipmentFilters : ShipmentFilters
    shipment(trackingNum: String): Shipment
}

`;

const extractOrg = (context) => (
    context[[`${audience}/organizationId`]]
);

const resolvers = {
    Query: {
        shipments: (_, args, context) => {
            return shipmentController.getShipmentsByAdmin({ ...args, organizationScope: extractOrg(context.user) });
        },
        shipmentFilters: (_, args, context) => {
            return shipmentController.getShipmentFilters({ ...args, organizationScope: extractOrg(context.user) });
        },
        shipment: (_, args, context) => {
            return shipmentController.getShipmentByTrackingNumber({ ...args, organizationScope: extractOrg(context.user) });
        }
    }
};

module.exports = { typeDefs, resolvers };
