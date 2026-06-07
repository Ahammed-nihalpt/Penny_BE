import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().default(7),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(), // set to enable Google sign-in
  GEMINI_API_KEY: Joi.string().allow('').optional(), // required for vision/chat/copilot
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash-lite'), // highest free RPD
});
