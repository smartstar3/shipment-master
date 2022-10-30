// models/Basic model -- basic model for collections of OLX
//
//
'use strict';
const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../config');
const mongo = require('../helpers/mongo');

const logger = getLogger(module);

class BasicModel {
    constructor (schema) {
        this.name = schema.name;
        this.index = schema.index;
        this.logger = logger.child({ schema });
    }

    get collection () {
        return mongo.get().db(gconfig.mongoDBName).collection(this.name);
    }

    // create() -- drop current collection and re-create
    //
    async create () {
        this.logger.debug('create called');
        const mdb = mongo.get().db(gconfig.mongoDBName);
        await this.drop();
        await mdb.createCollection(this.name);
        for (const iList of this.index) {
            await mdb.collection(this.name).createIndex(...iList);
        }
    }

    // drop() -- drop this collection
    //
    async drop () {
        this.logger.debug('drop called');
        try {
            await this.collection.drop();
        } catch (e) { if (e.code !== 26) throw e; } // allow NS not found for missing collection
    }

    // dbget() -- fetch single record based on $findOne query parms
    //
    async dbget (query = null, sort = null) {
        this.logger.debug('dbget called', { query });
        const result = await this.collection.find(query).sort(sort).limit(1).toArray();
        return result.length === 0 ? null : result[0];
    }

    // dbgets() -- fetch array of user documents based on query
    // @returns[obj]
    //
    async dbgets (query = {}) { // default to "all"
        this.logger.debug('dbgets called', { query });
        const retRec = await this.collection.find(query).toArray();
        return retRec;
    }

    // dbset() -- insert a new record based upon parameter document
    //
    async dbset (rec) {
        this.logger.debug('dbset called', { rec });
        const res = await this.collection.insertOne(rec);
        return res.ops[0];
    }

    // dbdel() -- delete the record specfified by id argument
    async dbdel (id) {
        this.logger.debug('dbdel called', { id });
        const res = await this.collection.deleteOne({ _id: mongo.ObjectId(id) });
        return res.deletedCount;
    }

    async dbupdate (rec) {
        this.logger.debug('dbupdate called', { rec });
        const collection = mongo.get().db().collection(this.name);
        const { id, _id, ...rest } = rec;
        await collection.updateOne({ _id: new mongo.ObjectId(id || _id) }, { $set: rest });
        return rec;
    }

    // count records based upon query argument
    // @returns number
    //
    async dbcount (query = {}) { // default to 'all'
        this.logger.debug('dbcount called', { query });
        const result = await this.collection.find(query).count();
        return result;
    }
}

module.exports = BasicModel;
