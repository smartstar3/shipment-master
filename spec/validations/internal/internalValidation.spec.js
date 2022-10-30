const { expect } = require('chai');
const { ValidationError } = require('joi');

const loginRequestValidator = require('../../../app/validation/internal/rest/loginRequestValidator');
const registerRequestValidator = require('../../../app/validation/internal/rest/registerRequestValidator');
const tokenRequestValidator = require('../../../app/validation/internal/rest/tokenRequestValidator');

describe('LoginRequestValidator', () => {
    it('login request validation', () => {
        expect(
            loginRequestValidator({ email: 'test@test.com', password: 'tespassword' })
        ).to.eql({ email: 'test@test.com', password: 'tespassword' });
    });

    it('should fail with invalid arguments', () => {
        expect(() => loginRequestValidator({})).to.throw(ValidationError);
    });
});

describe('registerRequestValidator', () => {
    it('regsiter request validation', () => {
        expect(
            registerRequestValidator({ email: 'test@test.com', password: 'tespassword' })
        ).to.eql({ email: 'test@test.com', password: 'tespassword' });
    });

    it('should fail with invalid arguments', () => {
        expect(() => registerRequestValidator({})).to.throw(ValidationError);
    });
});

describe('tokenRequestValidator', () => {
    it('regsiter request validation', () => {
        expect(
            tokenRequestValidator({ email: 'test@test.com', refreshToken: 'tespassword' })
        ).to.eql({ email: 'test@test.com', refreshToken: 'tespassword' });
    });

    it('should fail with invalid arguments', () => {
        expect(() => tokenRequestValidator({})).to.throw(ValidationError);
    });
});
