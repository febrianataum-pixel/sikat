import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use the database ID from config, or default to '(default)' if empty or missing
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Test Connection
async function testConnection() {
  try {
    // Attempting a server-side get to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore Error: The client is offline. This usually means the 'firestoreDatabaseId' in firebase-applet-config.json is incorrect or the database does not exist.");
    } else {
      console.warn("Firestore Connectivity: Initial ping failed (this is expected if security rules block it), but client is online.");
    }
  }
}

testConnection();
