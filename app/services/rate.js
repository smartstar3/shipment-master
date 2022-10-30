const ZoneMatrix = require('../models/zoneMatrix');
const { DIM_DIVISOR } = require('../constants/olxConstants');
const { getCost } = require('../repositories/rateCards');
const { getProp } = require('../helpers/utils');

const zipToPrefix = zip => zip.slice(0, 3);

// converts the zip to an index (matrix idx zero === 001)
const zipToIdx = zip => parseInt(zip) - 1;

// ensures that the zone string contains only zone, not USPS special char
const parseZone = zone => parseInt(zone.split(0, 1));

const decorateResponse = cost => {
    if (!cost) {
        return ({ cost: null, dollar_cost: null });
    } else {
        return ({ cost: parseFloat(cost).toFixed(2), dollar_cost: `$${parseFloat(cost).toFixed(2)}` });
    }
};

// rounds up to largest int (weights in the db are arrayIdx ints );
const normalizeWeight = weight => Math.ceil(parseFloat(weight));

const getDimWeight = (length, width, height) => {
    return ((parseFloat(length) * parseFloat(width) * parseFloat(height)) / DIM_DIVISOR);
};

const getZoneFromZips = async (fromZip, toZip) => {
    fromZip = zipToPrefix(fromZip);
    toZip = zipToPrefix(toZip);
    const zoneIndex = zipToIdx(toZip);
    const zoneMatrix = await ZoneMatrix.dbget({ prefix: fromZip });

    if (zoneMatrix) {
        const { matrix } = zoneMatrix;
        return parseZone(getProp(matrix, zoneIndex));
    }

    return null;
};

const getRateValue = async (org, body) => {
    const {
        to_address: toAddress,
        from_address: fromAddress,
        parcel
    } = body;
    const { shipperSeqNum } = org;
    const zone = await getZoneFromZips(toAddress.zip, fromAddress.zip);

    const { weight, length, width, height } = parcel;

    const dimWeight = getDimWeight(length, width, height);
    const largerWeight = dimWeight > weight ? dimWeight : weight;
    const normalWeight = normalizeWeight(largerWeight);

    const cost = await getCost(shipperSeqNum, normalWeight, zone);

    return {
        ...decorateResponse(cost),
        billable_weight: normalWeight,
        zone,
        use_dim_weight: dimWeight > weight
    };
};

module.exports = {
    getRateValue
};
