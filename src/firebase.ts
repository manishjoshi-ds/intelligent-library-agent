/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as fbSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);
export const auth = getAuth(app);

// Authentication Provider
const googleProvider = new GoogleAuthProvider();

// Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation Test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // A permission-denied response also confirms server connectivity
    return true;
  }
}

// Auth Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    // Sync profile
    if (cred.user) {
      const userRef = doc(db, 'users', cred.user.uid);
      try {
        await setDoc(
          userRef,
          {
            uid: cred.user.uid,
            email: cred.user.email || '',
            displayName: cred.user.displayName || 'Library Member',
            hasSpecialPermission: false,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${cred.user.uid}`);
      }
    }
    return cred.user;
  } catch (err: any) {
    console.error('Sign-in error:', err);
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Saved Routes in Firestore
export interface SavedRouteDoc {
  id: string;
  userId: string;
  title: string;
  algorithm: string;
  startNode: string;
  goalOrCheckoutNode: string;
  path: string[];
  totalCost: number;
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  bookTitles: string[];
  createdAt: string;
}

export async function saveRouteToFirestore(
  routeData: Omit<SavedRouteDoc, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('User must be signed in to save routes to Firebase.');
  }

  const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const pathForWrite = `saved_routes/${routeId}`;

  const payload: SavedRouteDoc = {
    ...routeData,
    id: routeId,
    userId: auth.currentUser.uid,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'saved_routes', routeId), payload);
    return routeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

export async function fetchUserSavedRoutes(): Promise<SavedRouteDoc[]> {
  if (!auth.currentUser) return [];

  const pathForList = 'saved_routes';
  try {
    const q = query(
      collection(db, pathForList),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const routes: SavedRouteDoc[] = [];
    snap.forEach((d) => {
      routes.push(d.data() as SavedRouteDoc);
    });
    // Sort descending by creation date
    return routes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathForList);
  }
}

export async function deleteUserSavedRoute(routeId: string): Promise<void> {
  if (!auth.currentUser) return;
  const pathForDelete = `saved_routes/${routeId}`;
  try {
    await deleteDoc(doc(db, 'saved_routes', routeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
}
