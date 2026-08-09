import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI must be defined in server/.env');
}

export const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => console.log('[DATABASE] Connected to MongoDB locally.'));
    mongoose.connection.on('error', (err) => console.error('[DATABASE] Connection error:', err.message));
    mongoose.connection.on('disconnected', () => console.warn('[DATABASE] Disconnected from MongoDB.'));

    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.error('[DATABASE] Startup connection error:', error.message);
    throw error;
  }
};
