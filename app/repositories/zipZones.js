const escape = require('regexp.escape');
const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../helpers/mongo');
const { name: collectionName } = require('../models/zipZones');

const logger = getLogger(module);

const getZipZones = async ({ count = 100, start = 0, searchWord, carrier = [] }) => {
    const log = logger.child({ method: 'getZipZones' });
    log.debug('Entering getZipZones', { count, start, searchWord, carrier });

    const mdb = mongo.get().db().collection(collectionName);

    /* eslint-disable-next-line security/detect-non-literal-regexp */
    const searchWordRegExp = new RegExp(escape(searchWord), 'i');

    let zipZones = [];

    zipZones = await mdb.find(
        { zipcode: { $in: [searchWordRegExp] }, carrier: { $in: carrier } },
        { _id: 0, id: '$_id' }
    )
        .limit(count)
        .skip(start)
        .toArray();

    for (const zone of zipZones) {
        zone.id = zone._id;
        delete zone._id;
    }

    log.debug('getZipZones result', { res: zipZones });
    return zipZones;
};

const getZipCodesByShipperId = async (shipperId = null) => {
    const log = logger.child({ method: 'getZipCodesByShipperId' });
    log.debug('Entering getZipCodesByShipperId', { shipperId });

    const mdb = mongo.get().db().collection(collectionName);

    let zipZones = [];

    if (shipperId !== null) {
        zipZones = await mdb.distinct('zipcode', { shipper_id: { $eq: shipperId } });
        for (const zone of zipZones) {
            zone.id = zone._id;
            delete zone._id;
        }
    }

    log.debug('getZipCodesByShipperId result', { res: zipZones });

    return zipZones;
};

const getZipZone = async ({ id, _id, ...args }) => {
    const log = logger.child({ method: 'getZipZone' });
    log.debug('Entering getZipZone', { id, _id });

    if (id || _id) {
        args._id = new mongo.ObjectId(id || _id);
    }

    const mdb = mongo.get().db().collection(collectionName);
    const res = await mdb.findOne(args, { _id: 0, id: '$_id' });

    log.debug('getZipZone result', { res });
    return res;
};

const getTerminalProviders = async () => {
    const log = logger.child({ method: 'getTerminalProviders' });
    log.debug('Entering getTerminalProviders');

    const mdb = mongo.get().db().collection(collectionName);
    const res = await mdb.aggregate([
        {
            $match: {
                carrier: { $not: { $size: 0 } }
            }
        },
        { $unwind: '$carrier' },
        {
            $group: {
                _id: '$carrier',
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gte: 2 }
            }
        },
        {
            $project: { _id: 0, id: '$_id', count: 1 }
        },
        { $sort: { count: -1 } },
        { $limit: 100 }
    ]).toArray();

    log.debug('getTerminalProviders result', { res });
    return res;
};

module.exports = {
    getZipZones,
    getZipZone,
    getTerminalProviders,
    getZipCodesByShipperId
};
