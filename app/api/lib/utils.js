const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * A utility function to wrap passed async functions with wrapper to properly handle rejections.
 * Functions that are not async or have already been wrapped will be returned without modification.
 *
 * @param {function} fn
 * @returns {function}
 */
const wrapAsyncMiddleware = (fn) => {
    if (fn instanceof AsyncFunction === false) return fn;

    const asyncMiddlewareWrapper = (req, res, next) => {
        fn(req, res, next)
            .catch((err) => {
                next(err);
            });
    };

    const label = fn.label || fn.name;

    asyncMiddlewareWrapper.label = label;

    return asyncMiddlewareWrapper;
};

module.exports = {
    AsyncFunction,
    wrapAsyncMiddleware
};
