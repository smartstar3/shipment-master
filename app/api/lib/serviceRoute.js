const { celebrate, Joi, Segments: { BODY } } = require('celebrate');

const { getLogger } = require('@onelive-dev/x-logger');

const { isObject, getProp } = require('../../helpers/utils');
const { wrapAsyncMiddleware } = require('./utils');

// method to to verify that all handlers are valid function and that at least one handler is set in opts
const validateOpts = (opts = {}) => {
    let handlerFound = false;

    const validate = (fn) => {
        if (typeof fn !== 'function') {
            throw new TypeError('ServiceRoute handler is not function');
        }
        handlerFound = true;
    };

    for (const method of ServiceRoute.attachMethods) {
        const fnOrFns = getProp(opts, method);
        if (!fnOrFns) continue;

        if (Array.isArray(fnOrFns)) {
            fnOrFns.forEach(validate);
        } else {
            validate(fnOrFns);
        }
    }

    if (!handlerFound) {
        throw new TypeError('ServiceRoute requires at least one handler configuration to be present');
    }
};

/**
 * The standard options object passed at `ServiceRoute` class instantiation.
 *
 * @typedef ServiceRouteOptions
 * @property {string} [label=unknown] - Optional label for route.
 * @property {string} [description] - Optional description of the route. Useful for logging and such.
 * @property {string} [path=/] - Optional string path (relative to router on which `ServiceRoute` is
 *   to be installed. Defaults to `/`.
 * @property {object} [logger] - Optional logger to be used by ServiceRoute instance.
 *   x-logger is used by default.
 * @property {function|function[]} [all] - Handler(s) for `all` router attachment method.
 * @property {function|function[]} [delete] - Handler(s) for `delete` router attachment method.
 * @property {function|function[]} [get] - Handler(s) for `get` router attachment method.
 * @property {function|function[]} [head] - Handler(s) for `head` router attachment method.
 * @property {function|function[]} [post] - Handler(s) for `post` router attachment method.
 * @property {function|function[]} [put] - Handler(s) for `put` router attachment method.
 * @property {function|function[]} [router] - Handler(s) for `router` router attachment method.
 */

/**
 * The `ServiceRoute` class represents a route that can be installed into an Express-compatible Application or Router.
 * The intent is for the ServiceRoute object to represent a portable means of defining route
 * mappings to middleware handler functions for any sort of compatible router implementation.
 * The middleware handler functions set on handler properties are expected to be Express-compatible middleware.
 * Either regular or async middleware handlers can be passed, without the need to pre-wrap the async functions.
 * This class will automatically wrap any async functions to provide proper rejection handling.
 *
 * @class
 * @param {ServiceRouteOptions} [opts] - Optional `ServiceRoute` options object.
 *
 */
class ServiceRoute {
    /**
     * List of all supported Express App/Router methods that can be used with this class when installTo is called.
     * The order here reflects the order in which handler methods will be attached to the router and thus order for route
     * processing.
     *
     * @type {string[]}
     */
    static attachMethods = Object.freeze([
        'use',
        'all',
        'delete',
        // it is important that head is listed before get as we iterate through ServiceRoute's methods
        'head',
        'get',
        'post',
        'put'
    ]);

    /**
     * Default `ServiceRoute` options.
     *
     * @type {ServiceRouteOptions}
     */
    static defaultOpts = Object.freeze({
        label: 'unknown',
        path: '/',
        logger: getLogger(module),
        validator: { [BODY]: Joi.any() },
        // below hold route handler middleware functions
        use: null,
        all: null,
        delete: null,
        get: null,
        head: null,
        post: null,
        put: null
    });

    /**
     * Method to instantiate ServiceRoute objects from an ServiceRoute options object or array of options objects.
     *
     * @param {ServiceRouteOptions|ServiceRouteOptions[]} optsObjOrArray - options object or array of options objects
     * @returns {ServiceRoute|ServiceRoute[]}
     * @throws {TypeError}
     */
    static fromOpts (optsObjOrArray) {
        if (Array.isArray(optsObjOrArray)) {
            return optsObjOrArray.map((opts) => new this(opts));
        }
        if (isObject(optsObjOrArray)) {
            return new this(optsObjOrArray);
        }
        throw new TypeError(`${this.name}.fromOpts expects an options object or array`);
    }

    constructor (opts = {}) {
        validateOpts(opts);
        Object.assign(this, this.constructor.defaultOpts, opts);
        Object.freeze(this);
    }

    /**
     * Method to install the route handler onto passed Express App or Router (or compatible) target object.
     *
     * @param {*} target - The target router object
     */
    installTo (target) {
        const label = this.label;
        const path = this.path;

        for (const method of this.constructor.attachMethods) {
            const fnOrFns = getProp(this, method);
            if (!fnOrFns) continue;

            const fns = (Array.isArray(fnOrFns)) ? fnOrFns : [fnOrFns];

            fns.forEach((fn) => {
                const name = fn.name || 'unknown';
                this.logger.info(`[${label}] Installing '${name}' to '${method.toUpperCase()} ${path}'`);
                /* eslint-disable-next-line security/detect-object-injection */
                target[method](path, celebrate(this.validator), wrapAsyncMiddleware(fn));
            });
        }
    }
}

module.exports = ServiceRoute;
