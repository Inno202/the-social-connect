import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const env = import.meta.env;
export const useEmulators = env.VITE_USE_EMULATORS === 'true';
const hasConfig = Boolean(env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY && !String(env.VITE_FIREBASE_API_KEY).startsWith('your-'));

/** True when the site can talk to Firebase (a real project or the local emulators). */
export const firebaseReady = typeof window !== 'undefined' && (useEmulators || hasConfig);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseReady) {
  app = initializeApp(
    useEmulators
      ? { apiKey: 'demo-key', projectId: 'demo-msb-events', authDomain: 'localhost', appId: 'demo' }
      : {
          apiKey: env.VITE_FIREBASE_API_KEY,
          authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: env.VITE_FIREBASE_PROJECT_ID,
          appId: env.VITE_FIREBASE_APP_ID,
        },
  );
  auth = getAuth(app);
  // Tickets and the scanner's ticket list are kept on the device so they open without signal.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulators) {
    const host = window.location.hostname || '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  } else if (env.VITE_RECAPTCHA_SITE_KEY) {
    // Bot protection: App Check with reCAPTCHA v3, loaded only when a site key is configured.
    void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      initializeAppCheck(app!, { provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
    });
  }
}

export { app, auth, db };
