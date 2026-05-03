import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-jwt-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',

};
