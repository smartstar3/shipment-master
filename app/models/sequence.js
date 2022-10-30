// models/sequence.js -- maintain and serve an incrementing list of system-wide sequence numbers
//
const BasicModel = require('./BasicModel');
const mongo = require('../helpers/mongo');

const schema = {
    name: 'sequence',
    index: [] // we will rely on the _id field being our index and name
};

// example document
//
// {
//     seq: 'int',  // current number in the sequence
//     max: 'int',  //The upper limit allowed for this counter'
//     seqlist: 'array' // 'ordered list of saved tags for this sequenc
//     description: // notes for counter
// }
//

class Sequence extends BasicModel {
    // newseq() -- create a new sequence counter
    //
    // called with: {
    //    name: string,
    //    start: int,
    //    end: int (+1 above last valid number)
    //    description: string
    //  }
    //
    async newseq (obj) {
        this.logger.debug({ message: `Models.${this.name}.newseq`, obj: obj });
        const mdb = mongo.get().db();
        try {
            const seqrec = {};
            seqrec._id = obj.name;
            seqrec.seq = obj.start;
            seqrec.max = obj.end;
            seqrec.seqlist = [];
            seqrec.description = obj.description;
            const res = await mdb.collection(this.name).insertOne(seqrec);
            return res.insertedId;
        } catch (e) {
            throw new Error(`Models.${schema.name}.newseq Invalid obj`);
        }
    }

    // nextseq() -- fetch the next sequence for the given counter
    //
    async nextseq (id, saveid = null) {
        this.logger.debug({ message: `Models.${this.name}.nextseq`, id: id });
        const mdb = mongo.get().db();
        const updateq = { $inc: { seq: 1 } };
        // if we are passed a value in saveid, that is a request to save this tag in the sequence such that the document contains the series
        if (saveid) updateq.$push = { seqlist: saveid };
        const seqrec = await mdb.collection(this.name).findOneAndUpdate({ _id: id }, updateq);
        if (seqrec.value == null) throw new Error(`Models.${this.name}.newseq Unknown counter ${id}`);
        if (seqrec.value.seq >= seqrec.value.max) throw new Error(`Models.${this.name}.newseq ${id} counter overflow`);
        return seqrec.value.seq;
    }
}

module.exports = new Sequence(schema);
