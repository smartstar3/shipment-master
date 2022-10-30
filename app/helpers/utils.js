'use strict';

/**
 * A function intended to perform naive freeze on nested Object, for example a POJO.
 *
 * @param {*} obj
 * @returns {*}
 */
const deepFreeze = (obj) => {
    if (obj instanceof Object === false) return obj;

    Object.values(obj).forEach((value) => {
        // recurse into POJO's
        if (isPojo(value)) {
            deepFreeze(value);
            return;
        }

        // standard freeze for other object types
        // typically, these might be built-in or specific class instances which may not be safe for deep freeze
        if (isObject(value)) {
            Object.freeze(value);
        }
    });

    return Object.freeze(obj);
};

const hasProp = (obj, name) => isObject(obj) && Object.prototype.hasOwnProperty.call(obj, name);

const getProp = (obj, name, missing = undefined) => {
    if (!hasProp(obj, name)) {
        return missing;
    }

    /* eslint-disable-next-line security/detect-object-injection */
    return obj[name];
};

const setProp = (obj, name, value) => {
    if (!isObject(obj)) {
        throw new Error(`Cannot set property ${name} of ${obj}`);
    }

    const objectBuiltins = Object.getOwnPropertyNames(Object.getPrototypeOf(obj));
    if (name in objectBuiltins) {
        throw new Error(`Cannot set builtin property ${name} of ${obj}`);
    }

    /* eslint-disable-next-line security/detect-object-injection */
    obj[name] = value;
};

const isObject = (obj) => {
    if (obj === null) return false;
    return typeof obj === 'function' || typeof obj === 'object';
};

const isPojo = (obj) => isObject(obj) && Object.getPrototypeOf(obj) === Object.prototype;

const toJsonSorted = (opts = {}) => {
    const sorted = Object.fromEntries(
        Object.entries(opts).sort(
            ([keyA], [keyB]) => (keyA < keyB) ? -1 : 1
        )
    );

    return JSON.stringify(sorted);
};

module.exports = {
    deepFreeze,
    hasProp,
    getProp,
    setProp,
    isObject,
    isPojo,
    toJsonSorted
};
