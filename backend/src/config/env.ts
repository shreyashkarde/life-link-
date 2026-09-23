import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelink_db',
  JWT_SECRET: process.env.JWT_SECRET || 'lifelink_super_secure_jwt_secret_key_2026',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@prescripto.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  CURRENCY: process.env.CURRENCY || '$',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'b.well Healthcare <no-reply@bwell-healthcare.com>',
};

