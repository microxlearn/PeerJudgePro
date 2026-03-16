'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

// A type assertion to allow attaching our custom property
type FirebaseAppWithFirestore = FirebaseApp & { _firestore?: Firestore };

export function getSdks(firebaseApp: FirebaseApp) {
  const app = firebaseApp as FirebaseAppWithFirestore;

  // Initialize Firestore with persistence if it hasn't been already.
  // We attach it to the app object to make it a true singleton across hot-reloads.
  if (!app._firestore) {
    try {
      app._firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({})
      });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: string}).code === 'failed-precondition') {
            console.warn('Firebase persistence failed to initialize. This can happen with multiple tabs open. Using in-memory cache.');
            // Fallback to non-persistent Firestore instance
            app._firestore = getFirestore(app);
        } else {
            console.error('Error initializing Firestore with persistence:', error);
            // Fallback for other errors
            app._firestore = getFirestore(app);
        }
    }
  }

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: app._firestore
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
