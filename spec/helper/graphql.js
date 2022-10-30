const { parse, validate, specifiedRules } = require('graphql');

const GOOD_RESPONSE = 'Ok: validate to graphQL query';
const BAD_RESPONSE = 'Query did not validate';

const checkGraphQL = (text, schema) => {
    const ast = parse(text);
    const validationErrors = validate(schema, ast, specifiedRules);

    if (validationErrors && validationErrors.length > 0) {
        const messages = validationErrors.map(e => e.message).join('\n');
        return {
            message: BAD_RESPONSE,
            errors: messages
        };
    }
    return {
        message: GOOD_RESPONSE,
        errors: ''
    };
};

module.exports = {
    checkGraphQL,
    GOOD_RESPONSE,
    BAD_RESPONSE
};
