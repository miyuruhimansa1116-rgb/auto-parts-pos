import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 1. මෙන්න මේක අලුතින් එකතු කරන්න
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 1. Firebase App එක Initialize කිරීම
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Auth එක Initialize කිරීම (මෙන්න මේ පේළිය අලුතින් එකතු කරන්න)
export const auth = getAuth(app);

// 3. Next.js Hot Reload වලදී දෝෂ ඇති වීම වැළැක්වීමට Safe Firestore Initialization
let db: any;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  // දැනටමත් initialize වී ඇත්නම් දැනට පවතින instance එක ලබා ගනී
  db = getFirestore(app);
}

export { db };
export default app;