const { celebrate, Joi, Segments: { BODY } } = require('celebrate');
const { ConflictError } = require('errors');
const { MongoError } = require('mongodb');

const kobayashi = require('../../../../repositories/kobayashi');

const CustomJoi = Joi.extend((_joi) => {
    return {
        type: 'unencodedUri',
        base: Joi.string().uri(),
        prepare: (value) => {
            return { value: encodeURI(value) };
        }
    };
});

const s3URISchema = CustomJoi.unencodedUri({ scheme: 's3' }).required();

module.exports = (router) => {
    router.post(
        '/v1/source',
        celebrate(
            {
                [BODY]: Joi.object({
                    location: s3URISchema,
                    data: Joi.object({
                        provider: Joi.string(),
                        transfer: Joi.boolean()
                    }).xor('client', 'provider').required()
                })
            },
            { abortEarly: false }
        ),
        async (req, res, next) => {
            try {
                await kobayashi.getClient().createSource(req.body.location, req.body.data);
                res.status(202).json({});
            } catch (err) {
                if (err instanceof MongoError && err.code === 11000) {
                    next(new ConflictError());
                }

                next(err);
            }
        }
    );
};
