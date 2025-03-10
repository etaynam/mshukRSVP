import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Validate environment variables
const requiredEnvVars = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: requiredEnvVars.VITE_FIREBASE_API_KEY,
  authDomain: requiredEnvVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredEnvVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredEnvVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredEnvVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredEnvVars.VITE_FIREBASE_APP_ID,
  measurementId: requiredEnvVars.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west1');

// Cloud Functions
export const sendOtp = httpsCallable(functions, 'sendOtp');
export const verifyOtp = httpsCallable(functions, 'verifyOtp');

// Helper function to get logo URL
export const getLogoUrl = async () => {
  const logoRef = ref(storage, 'assets/Logo.png');
  return getDownloadURL(logoRef);
};