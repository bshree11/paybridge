import dotenv from "dotenv";

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-jwt-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  HF_API_TOKEN: process.env.HF_API_TOKEN || '',
};