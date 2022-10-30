// repositories/rateCards.js -- repository layer for rateCard collection
//
const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../helpers/mongo');
const RateCards = require('../models/rateCards');

const logger = getLogger(module);

const getCost = async (shipperId, weight, zone) => {
    const log = logger.child({ method: 'getCost', shipperId });
    log.debug('Entering getCost');

    const rateCards = mongo.get().db().collection(RateCards.name);

    const aggregationPipeline = [
        {
            $match: {
                $or: [{ expiresAt: { $not: { $lt: new Date() } } }, { expiresAt: null }],
                effectiveAt: { $not: { $gte: new Date() } },
                shipperId,
                zone,
                weight: { $gte: weight }
            }
        },
        // Project a diff field that's the absolute difference along with the original doc.
        { $project: { diff: { $subtract: ['$weight', weight] }, doc: '$$ROOT' } },
        // Order the docs by diff
        { $sort: { diff: 1 } },
        // Take the first one
        { $limit: 1 }
    ];

    // try to find the nearest rate
    const nearestVal = await rateCards.aggregate(aggregationPipeline).toArray();

    if (!nearestVal.length) {
        log.debug('No rate cards found');
        // get default rate
        if (shipperId) {
            log.debug('Attempting to retrieve default rate cards');
            return getCost(null, weight, zone);
        } else {
            log.warn('Unexpectedly hit extreme default rate');
            return null;
        }
    } else {
        const cost = nearestVal[0].doc.cost;
        log.debug('Rate card found', { cost });
        return cost;
    }
};

module.exports = {
    getCost
};
