// repositories/services.js -- repository layer for services collection

'use strict';
const moment = require('moment');

const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../helpers/mongo');
const objectFunc = require('../helpers/objectFuncs');
const Services = require('./../models/services');
const serviceStatus = require('../models/serviceStatus');

const logger = getLogger(module);

const getServices = async (args) => {
    const log = logger.child({ method: 'getServices' });
    log.debug('Entering getServices', { args });

    // we go directly to the collection for this query
    const services = mongo.get().db().collection(Services.name);

    const aggregationPipeline = [];

    if (args.serviceId) {
        aggregationPipeline.push({
            $match: { _id: objectFunc.stringIDToDBObjectID(args.serviceId) }
        });
    }

    aggregationPipeline.push({
        $addFields: { id: '$_id' }
    });

    let startDate = moment().subtract(90, 'days').unix() * 1000;
    let endDate = moment().add(1, 'days').unix() * 1000;

    if (args.year !== undefined && args.startMonth !== undefined) {
        startDate = moment(`${args.year}-${args.startMonth * 3 + 1}-1`, 'YYYY-MM-D').unix() * 1000;
        endDate = moment(`${args.year}-${args.startMonth * 3 + 1}-1`, 'YYYY-MM-D').add(3, 'months').unix() * 1000;
    }

    aggregationPipeline.push({
        $lookup: {
            from: serviceStatus.name,
            let: { id: '$_id' },
            pipeline: [
                {
                    $match: { $expr: { $eq: ['$serviceId', '$$id'] } }
                },
                {
                    $match: { created_at: { $gte: new Date(startDate), $lt: new Date(endDate) } }
                },
                {
                    $project: {
                        status: 1,
                        created_at: 1,
                        updateCnt: 1,
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' },
                        day: { $dayOfMonth: '$created_at' },
                        dayOfYear: { $dayOfYear: '$created_at' }
                    }
                },
                {
                    $group: {
                        _id: '$dayOfYear',
                        status: { $last: '$status.status' },
                        responseMs: { $avg: { $divide: ['$status.responseMs', '$updateCnt'] } },
                        bytesTx: { $avg: { $divide: ['$status.bytesTx', '$updateCnt'] } },
                        bytesRx: { $avg: { $divide: ['$status.bytesRx', '$updateCnt'] } },
                        url: { $last: '$status.url' },
                        created_at: { $last: '$created_at' }
                    }
                },
                {
                    $sort: { created_at: -1 }
                }
            ],
            as: 'statuses'
        }
    });

    return services.aggregate(aggregationPipeline).toArray();
};

module.exports = {
    getServices
};
