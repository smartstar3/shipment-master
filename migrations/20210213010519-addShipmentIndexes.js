// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');

const indicies = [
    { tn: 1 },
    { 'docs.doc.Barcode': 1 },
    { 'docs.doc.uspsTN': 1 },
    { 'docs.doc.Pieces.0.LaserShipBarcode': 1 },
    { 'docs.doc.masterTrackingNumber': 1 },
    { 'docs.doc.Tracking': 1 },
    { 'docs.doc.trackingNumber': 1 }
];

module.exports = {
    async up () {
        await mongo.connect();

        const collection = mongo.get().db().collection('olxshipment');

        for (const index of indicies) {
            logger.info('adding index to olxshipment', { index });
            await collection.createIndex(index);
        }
    },

    async down () {
        await mongo.connect();

        const collection = mongo.get().db().collection('olxshipment');

        for (const index of indicies) {
            logger.info('dropping index from olxshipment', { index });
            await collection.dropIndex(index);
        }
    }
};
