import mongoose from 'mongoose';
import { config } from './config.js';

let isConnected = false;
let connectionAttempted = false;

export async function connectDatabase() {
  if (!config.mongoUri) {
    console.warn('[MongoDB] MONGODB_URI is not defined in environment variables. Database persistence is currently offline.');
    isConnected = false;
    connectionAttempted = true;
    return false;
  }

  try {
    // Mongoose connection options
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    connectionAttempted = true;
    console.log('[MongoDB] Connected successfully to MongoDB Atlas.');

    // Listeners for disconnections / reconnects
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error occurred:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database. Attempting reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Successfully reconnected to MongoDB Atlas.');
      isConnected = true;
    });

    return true;
  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error.message);
    isConnected = false;
    connectionAttempted = true;
    return false;
  }
}

export function getDatabaseStatus() {
  if (!config.mongoUri) return 'unconfigured';
  if (mongoose.connection.readyState === 1) return 'connected';
  if (mongoose.connection.readyState === 2) return 'connecting';
  return 'disconnected';
}
