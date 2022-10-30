module.exports = {
    createValidator: (schema) => {
        /* istanbul ignore next */
        return (input = {}) => {
            const { error, value } = schema.validate(input);

            if (error) {
                throw error;
            }

            return value;
        };
    }
};
