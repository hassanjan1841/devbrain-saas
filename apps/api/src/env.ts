import dotenv from 'dotenv';

dotenv.config();

export const apiEnv = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  corsOrigin: process.env.CORS_ORIGIN ?? '*'
};
