const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_PATH in .env');
  }
}

const auth = admin.auth();
const db = admin.database();

module.exports = {
  admin,
  auth,
  db,
};
