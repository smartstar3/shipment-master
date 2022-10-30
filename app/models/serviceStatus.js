// models/service_status.js -- model for organization collection
'use strict';
const BasicModel = require('./BasicModel');
const mongo = require('../helpers/mongo');

// example document
//
// {
//     _id: ObjectId - unqiue indexed history Id,
//     serviceId: ObjectId - db_id of service - required
//     status: string - the service status - required
//     created_at: ISODate - required
//     updated_at: IsoDate - required
// }
//

// see README, schema is not enforced beyond name and index structure
//
const schema = {
    name: 'service_statuses',
    index: []
};

class ServiceStatus extends BasicModel {
    async dbgetlast (query) {
        this.logger.debug({ message: `Models.${this.name}.dbgetlast`, query: query });
        const serviceStatuses = mongo.get().db().collection(this.name);
        const result = await serviceStatuses.find(query).sort({ updated_at: -1 }).limit(1).toArray();
        return result.length ? result[0] : null;
    }
}

module.exports = new ServiceStatus(schema);
