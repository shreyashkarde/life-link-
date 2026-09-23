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
};

