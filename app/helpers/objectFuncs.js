const _ = require('lodash');
const mongodb = require('mongodb');

const updateKey = (obj, keyArr) => {
    const newObj = _.mapKeys(obj, function (value, key) {
        let newKey = key;

        _.map(keyArr, (item) => {
            if (item.oldKey === key) {
                newKey = item.newKey;
            }
        });

        return newKey;
    });

    return newObj;
};

const stringIDToDBObjectID = (id) => {
    return new mongodb.ObjectID(id);
};

module.exports = {
    updateKey,
    stringIDToDBObjectID
};
