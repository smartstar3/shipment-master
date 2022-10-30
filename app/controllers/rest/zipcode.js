const { getZipCodesByShipperId } = require('../../repositories/zipZones');

const getZipCodesMiddleware = async (req, res) => {
    const { org: { shipperSeqNum: shipperId } } = req;
    const response = await getZipCodesByShipperId(shipperId);
    return res.status(200).send({ zipcodes: response });
};

module.exports = {
    getZipCodesMiddleware
};
