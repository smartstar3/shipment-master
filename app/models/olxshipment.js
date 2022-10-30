// models/olxshipment.js -- model for consolidated OLX shipment information
//
const BasicModel = require('./BasicModel');
const mongo = require('../helpers/mongo');

// Mongo collection model
//
// {
//     tn: string - unqiue indexed OLX tracking number,
//     link: ObjectId of another olxshipment doc that "contains" this document
//     shipper: coded shipper ID (as per OLX tracking number)
//     status: enumeration - current tracker status,
//     label: {
//        type: enum [pdf, png, jpeg]
//        base64: label image or null
//     },
//     tracking: [ {}, {}, ...] Array of normalized tracking documents {LastUpdate: ISO datetime, Address: string, Lat: float, Lon float}
//     docs: [ {}, {}, ...] Array of vendor specific order, booking, tracking, AWB, etc. documents {vendor: ,type: , doc: raw document (typically an API response)}
// }
//

// see README, schema is not enforced beyond name and index structure
//
const schema = {
    name: 'olxshipment',
    index: [
        [{ tn: 1 }],
        [{ 'docs.doc.Barcode': 1 }],
        [{ 'docs.doc.uspsTN': 1 }],
        [{ 'docs.doc.Pieces.LaserShipBarcode': 1 }],
        [{ 'docs.doc.masterTrackingNumber': 1 }],
        [{ 'docs.doc.Tracking': 1 }],
        [{ 'docs.doc.trackingNumber': 1 }]
    ]
};

class OlxShipment extends BasicModel {
    /**
     * return records by query
     * @param query
     * @returns {Promise<void>}
     */
    async dball (query) {
        this.logger.debug({ message: `models.${this.name}.dbget`, query: query });
        const uc = mongo.get().db().collection(this.name);
        const res = await uc.find(query).toArray();
        return res;
    }

    /**
     * @function dbgets -- fetch multple records based on $find query parms
     * @param {object} $find query
     * @retuns {array} olxshipment
     *
     */
    async dbgets (query) {
        this.logger.debug({ message: `models.${this.name}.dbgets`, query: query });
        const uc = mongo.get().db().collection(this.name);
        const resIt = await uc.find(query);
        const retVal = [];
        while (await resIt.hasNext()) {
            const nextRec = await resIt.next();
            retVal.push(nextRec);
        }
        return retVal;
    }

    /**
     * @function dbreplace -- replace indexed document
     * @param {object} previously fetched and updated document with valid _id
     * @returns void
     */
    async dbreplace (rdoc) {
        this.logger.debug({ message: `models.${this.name}.dbreplace`, id: rdoc._id });
        const uc = mongo.get().db().collection(this.name);
        await uc.findOneAndReplace({ _id: rdoc._id }, rdoc);
    }
}

module.exports = new OlxShipment(schema);
