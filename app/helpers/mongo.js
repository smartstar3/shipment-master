// shell to manage MongoDB connection pool
//
'use strict';
const { MongoClient, ObjectId } = require('mongodb');

const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../config');

const logger = getLogger(module);

// DB connection object
let connection = null;

module.exports = {
    name: 'MongoDB',
    ObjectId,

    connect: async () => {
        const log = logger.child({ method: 'connect' });
        log.debug('starting connect');

        if (!connection || connection.isConnected() === false) {
            connection = await MongoClient.connect(gconfig.mongoUri, {
                useUnifiedTopology: true,
                useNewUrlParser: true
            });
            log.debug('connect successful');
        }
    },

    get: () => {
        if (!connection) {
            throw new Error('helpers.mongo.get: Call connect first!');
        }
        return connection;
    }
};
