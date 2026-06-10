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
  // Public base URL used to build email links (e.g. verification). Falls back to
  // FRONTEND_URL if unset. Set this to your deployed domain in production.
  APP_URL: Joi.string().uri().optional(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(), // set to enable Google sign-in
  GEMINI_API_KEY: Joi.string().allow('').optional(), // required for vision/chat/copilot
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash-lite'), // highest free RPD
  // SMTP (verification emails). Leave empty to disable real sending (links are logged).
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false), // true for port 465 (SSL)
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().allow('').optional(),
});
