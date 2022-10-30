// repositories/organizations.js -- repository layer for organizations collection
//

const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../../helpers/mongo');
const Organizations = require('../../models/organizations');
const RateCards = require('../../models/rateCards');

const logger = getLogger(module);

const getApiKey = async ({ apiId, organizationScope = [] }) => {
    logger.debug('Entering getApiKey');
    const mdb = mongo.get().db().collection(Organizations.name);
    const res = await mdb.findOne({
        apiId: apiId,
        shipperSeqNum: { $in: organizationScope }
    });
    logger.debug('getApiKey successful', res);
    return res;
};

const getRateCard = async ({ shipperId }) => {
    logger.debug('Entering getRateCard');
    const mdb = mongo.get().db().collection(RateCards.name);
    const res = await mdb.aggregate([
        { $match: { shipperId: shipperId } },
        {
            $group: {
                _id: '$weight',
                zones: { $push: '$$ROOT' }
            }
        },
        { $project: { 'zones.cost': 1, 'zones.zone': 1, weight: '$_id' } },
        {
            $project: {
                _id: 0,
                weight: 1,
                rates: {
                    $arrayToObject: {
                        $map: {
                            input: '$zones',
                            as: 'el',
                            in: {
                                k: { $concat: ['zone', { $toString: '$$el.zone' }] },
                                v: '$$el.cost'
                            }
                        }

                    }
                }
            }
        },
        { $sort: { weight: 1 } }
    ]).toArray();
    logger.debug('getRateCard successful');
    return res;
};

const getTerminalProviders = async ({ shipperSeqNum = null }) => {
    logger.debug('Entering getTerminalProviders');
    const mdb = mongo.get().db().collection(Organizations.name);
    const res = await mdb.findOne({ shipperSeqNum: shipperSeqNum }, { _id: 0, terminalProviderOrder: 1 });
    return res ? res.terminalProviderOrder : [];
};

module.exports = {
    getApiKey,
    getRateCard,
    getTerminalProviders
};
