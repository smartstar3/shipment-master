const mongo = require('../../helpers/mongo');
const Organizations = require('../../models/organizations');
const Shipment = require('../../models/olxshipment');
const {
    CARRIER_NAMES,
    ORDER_STATUS,
    TRACKING_NUMBER_LOOKUP
} = require('../../constants/carrierConstants');

const getShipmentByTrackingNumber = async (trackingNumber, organizationScope = [], appendEvents) => {
    const shipments = mongo.get().db().collection(Shipment.name);
    const args = { trackingNum: trackingNumber };
    if (organizationScope.length) {
        args.organizationScope = organizationScope;
    }
    let queryPipeline = await createShipmentQueryPipeline(args);
    queryPipeline.push(
        {
            $lookup: {
                from: 'organizations',
                localField: 'shipper',
                foreignField: 'shipperSeqNum',
                as: 'organizations'
            }
        },
        {
            $addFields: {
                'organization.settings': { $arrayElemAt: ['$organizations.settings', 0] },
                'organization.name': { $arrayElemAt: ['$organizations.name', 0] }
            }
        },
        { $unset: 'organizations' }
    );

    if (appendEvents) {
        queryPipeline = [...queryPipeline, ...shipmentEventAggregation];
    }

    const res = await shipments.aggregate([
        ...queryPipeline,
        { $sort: { created_date: -1 } }
    ]).toArray();

    return res[0] || null;
};

const getShipmentVendors = async (organizationScope) => {
    const shipments = mongo.get().db().collection(Shipment.name);
    return shipments.distinct('docs.vendor', { shipper: { $in: [...organizationScope] } });
};

const getShipments = async (args) => {
    const shipments = mongo.get().db().collection(Shipment.name);
    let queryPipeline = await createShipmentQueryPipeline(args);
    const pagination = {
        start: 0,
        count: 100
    };

    // sort by related field
    if (args.sorting && args.sorting.field !== '') {
        if (args.sorting.field === 'recipient') {
            queryPipeline.push({
                $sort: { 'to_address.name': args.sorting.order }
            });
        } else {
            queryPipeline.push({
                $sort: { [args.sorting.field]: args.sorting.order }
            });
        }
    } else {
        queryPipeline.push({
            $sort: { created_date: -1 }
        });
    }

    // pagination
    if (args.start !== undefined && args.count !== undefined) {
        pagination.start = args.start;
        pagination.count = args.count;
    }

    queryPipeline.push({ $skip: pagination.start }, { $limit: pagination.count });

    // get necessary fields from organization
    queryPipeline.push({
        $lookup: {
            from: Organizations.name,
            localField: 'shipper',
            foreignField: 'shipperSeqNum',
            as: 'organizations'
        }
    },
    {
        $addFields: {
            organization: { $arrayElemAt: ['$organizations', 0] },
            vendor: { $arrayElemAt: ['$docs.vendor', 0] },
            organizationName: { $arrayElemAt: ['$organizations.name', 0] },
            labelType: '$label.type'
        }
    },
    { $sort: { created_date: 1 } }
    );

    if (args.appendEvents) {
        queryPipeline = [...queryPipeline, ...shipmentEventAggregation];
    }

    return shipments.aggregate(queryPipeline).toArray();
};

const getTotalShipmentCount = async (args) => {
    const shipments = mongo.get().db().collection(Shipment.name);
    const queryPipeline = await createShipmentQueryPipeline(args);
    queryPipeline.push({
        $count: 'totalCount'
    });
    const res = await shipments.aggregate(queryPipeline).toArray();

    return res[0].totalCount;
};

const createShipmentQueryPipeline = async (args) => {
    const aggregationPipeLine = [];

    if (args.organizationScope) {
        aggregationPipeLine.push({
            $match: { shipper: { $in: [...args.organizationScope] } }
        });
    }

    // search by tracking number
    if (args.trackingNum) {
        const forShipper = args.shipperId !== undefined ? { shipper: args.shipperId } : {};
        const upperTrackingNumber = args.trackingNum.toUpperCase();

        aggregationPipeLine.push({
            $match: {
                ...forShipper,
                $or: [
                    { tn: upperTrackingNumber },
                    ...Object.values(TRACKING_NUMBER_LOOKUP).map((value) => {
                        return { [value]: upperTrackingNumber };
                    })
                ]
            }
        });
    }

    // search by tracking number or shipper name
    if (args.searchWord) {
        const upperSearchWord = args.searchWord.toUpperCase();

        aggregationPipeLine.push({
            $match: {
                $or: [
                    { tn: { $regex: upperSearchWord } },
                    ...TRACKING_NUMBER_LOOKUP.map((value) => {
                        return { [value]: { $regex: upperSearchWord } };
                    }),
                    { 'to_address.name': { $regex: args.searchWord } }
                ]
            }
        });
    }

    // filter by date
    if (args.startDate && args.endDate) {
        const startDate = new Date(parseInt(args.startDate));
        const endDate = new Date(parseInt(args.endDate));

        aggregationPipeLine.push({
            $match: {
                created_date: { $gte: startDate, $lt: endDate }
            }
        });
    }

    // filter by vendor
    if (args.vendor || args.vendorName) {
        aggregationPipeLine.push({
            $match: {
                'docs.vendor': args.vendor ? CARRIER_NAMES[args.vendor] : args.vendorName
            }
        });
    }

    // filter by status
    if (args.status) {
        aggregationPipeLine.push({
            $match: {
                status: ORDER_STATUS[args.status]
            }
        });
    }

    // filter by organization
    if (args.organizationId) {
        const org = await Organizations.dbget({ _id: mongo.ObjectId(args.organizationId) });

        aggregationPipeLine.push({
            $match: {
                shipper: org.shipperSeqNum
            }
        });
    }

    // filter by organization name
    if (args.organizationName) {
        const org = await Organizations.dbget({ name: args.organizationName });

        aggregationPipeLine.push({
            $match: {
                shipper: org.shipperSeqNum
            }
        });
    }

    return aggregationPipeLine;
};

const shipmentEventAggregation = [
    {
        $facet: {
            uds: [
                { $match: { 'docs.vendor': 'UDS' } },
                {
                    $addFields: {
                        carrierTrackingNumber: '$docs.doc.Barcode', vendor: '$docs.vendor'
                    }
                }
            ],
            laserShip: [
                { $match: { 'docs.vendor': 'LaserShip' } },
                {
                    $addFields: { carrierTrackingNumber: '$docs.doc.Pieces.LaserShipBarcode', vendor: '$docs.vendor' }
                },
                { $unwind: '$carrierTrackingNumber' }
            ],
            onTrac: [
                { $match: { 'docs.vendor': 'OnTrac' } },
                { $addFields: { carrierTrackingNumber: '$docs.doc.Tracking', vendor: '$docs.vendor' } }
            ],
            usps: [
                { $match: { 'docs.vendor': 'USPS' } },
                { $addFields: { carrierTrackingNumber: '$docs.doc.uspsTN', vendor: '$docs.vendor' } }
            ],
            other: [
                { $match: { 'docs.vendor': { $nin: ['OnTrac', 'LaserShip', 'UDS', 'USPS'] } } },
                { $addFields: { carrierTrackingNumber: '$docs.doc.trackingNumber', vendor: '$docs.vendor' } }
            ]
        }
    },
    { $project: { shipments: { $setUnion: ['$uds', '$laserShip', '$onTrac', '$other', '$usps'] } } },
    { $unwind: '$shipments' },
    { $replaceRoot: { newRoot: '$shipments' } },
    { $unwind: '$carrierTrackingNumber' },
    {
        $lookup: {
            from: 'events',
            let: {
                carrierTrackingNumber: '$carrierTrackingNumber'
            },
            pipeline: [
                { $match: { $expr: { $eq: ['$trackingNumber', '$$carrierTrackingNumber'] } } },
                { $sort: { timestamp: 1 } }
            ],
            as: 'trackedEvt'
        }
    },
    {
        $addFields: { trackingStatus: { $last: ['$trackedEvt.externalStatus'] } }
    },
    { $addFields: { trackingStatus: { $ifNull: ['$trackingStatus', '--'] } } },
    { $unwind: '$vendor' },
    { $unset: 'trackedEvt' }
];

module.exports = {
    getShipmentByTrackingNumber,
    getShipmentVendors,
    getShipments,
    getTotalShipmentCount
};
