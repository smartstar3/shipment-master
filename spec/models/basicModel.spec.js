const { expect } = require('chai');

const BasicModel = require('../../app/models/BasicModel');
const mongo = require('../../app/helpers/mongo');

describe('BasicModel', () => {
    describe('dbget', () => {
        it('returns null if nothing found', async () => {
            const model = new BasicModel({ name: 'test' });
            const record = await model.dbget();
            expect(record).to.eq(null);
        });

        it('fetchs a single record', async () => {
            const model = new BasicModel({ name: 'test' });
            await mongo.get().db().collection('test').insertOne({ foo: 'bar' });
            const record = await model.dbget();
            expect(record.foo).to.eq('bar');
        });

        it('uses query to filter result', async () => {
            const model = new BasicModel({ name: 'test' });
            await mongo.get().db().collection('test').insertOne({ foo: 'spam' });
            await mongo.get().db().collection('test').insertOne({ foo: 'bar' });

            const record = await model.dbget({ foo: 'bar' });
            expect(record.foo).to.eq('bar');
        });

        it('can sort results', async () => {
            const model = new BasicModel({ name: 'test' });
            await mongo.get().db().collection('test').insertOne({ foo: 1 });
            await mongo.get().db().collection('test').insertOne({ foo: 2 });
            await mongo.get().db().collection('test').insertOne({ foo: 3 });

            const record = await model.dbget({ foo: { $gte: 2 } }, { foo: -1 });
            expect(record.foo).to.eq(3);
        });
    });
});
