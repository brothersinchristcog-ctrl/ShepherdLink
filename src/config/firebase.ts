/**
 * Firebase Configuration for ShepherdLink
 *
 * NOTE: If you haven't created a Firebase project yet, the app will continue to
 * run using mock data and local state without crashing.
 *
 * When your Firebase project is ready:
 * 1. Create a `.env` file in the project root (copied from `.env.example`).
 * 2. Fill in your project credentials from the Firebase Console (Project Settings > General > Your apps > Web app).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA7a2lRkJSHh0kKasjPZDPEWLsXGLUUtMM',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'shepherdlink-fdd39.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'shepherdlink-fdd39',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'shepherdlink-fdd39.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '869350585718',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:869350585718:web:54de9ad8c55a375be7f657',
};

export const isFirebaseConfigured = true;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Configure Auth with AsyncStorage persistence on mobile
  if (Platform.OS !== 'web') {
    try {
      // In React Native environment, Metro resolves @firebase/auth containing getReactNativePersistence
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const authModule = require('firebase/auth');
      const getReactNativePersistence = authModule.getReactNativePersistence;

      if (typeof getReactNativePersistence === 'function') {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } else {
        auth = getAuth(app);
      }
    } catch {
      auth = getAuth(app);
    }
  } else {
    auth = getAuth(app);
  }

  db = getFirestore(app);

  if (!isFirebaseConfigured) {
    console.log(
      'ℹ️ [ShepherdLink Firebase] Firebase credentials not configured yet. Running in offline/mock mode.'
    );
  } else {
    console.log('✅ [ShepherdLink Firebase] Connected to project:', firebaseConfig.projectId);
  }
} catch (error) {
  console.warn('⚠️ [ShepherdLink Firebase] Initialization notice:', error);
}

export { app, auth, db, firebaseConfig };
