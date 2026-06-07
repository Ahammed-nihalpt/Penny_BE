import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_SECRET: Joi.string().allow('').optional(), // required in Part 2 (Auth)
  GEMINI_API_KEY: Joi.string().allow('').optional(), // required in Part 5 (Vision)
});
