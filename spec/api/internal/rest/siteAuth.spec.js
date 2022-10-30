const { expect, factory, request } = require('chai');

describe.skip('Site Auth Test', () => {
    given('user', async () => {
        return factory.create('user', { password: 'password1' });
    });

    describe('/POST login', () => {
        it('it should GET token', async () => {
            const { email, password } = given.user;

            const res = await request(global.server)
                .post('/site/api/login')
                .send({ email, password });

            expect(res.status).to.eq(200);
            expect(res.body.token).to.eq('asdf');
        });

        it('it should fail with invalid arguments', async () => {
            const { email } = given.user;

            const res = await request(global.server)
                .post('/site/api/login')
                .send({ email, password: 'invalid' });

            expect(res.status).to.eq(401);
        });
    });

    describe('/GET me', () => {
        const token = null;

        it('should GET token', async () => {
            const { email, password } = given.user;

            const res = await request(global.server)
                .post('/site/api/login')
                .send({ email, password });

            expect(res.status).to.eq(200);
            expect(res.body.token).to.eq('asdf');
        });

        it('it should get a 200 with a valid token', async () => {
            const res = await request(global.server)
                .get('/site/api/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).to.eq(200);
            expect(res.body.user).to.eq('asdf');
        });

        it('it should get a 401 with a invalid token', async () => {
            const res = await request(global.server)
                .get('/site/api/me')
                .set('Authorization', 'Bearer invalid token');

            expect(res.body).to.eql({
                error_code: 401,
                error_msg: 'Authentication is required and failed or was not yet been provided.',
                error_fields: []
            });
        });
    });
});
