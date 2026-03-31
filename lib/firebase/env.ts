const clientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  functionsRegion: process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "europe-west1"
};

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

export function getFirebaseClientEnv() {
  return clientEnv;
}

export function isFirebaseClientConfigured() {
  return Boolean(
    clientEnv.apiKey &&
      clientEnv.authDomain &&
      clientEnv.projectId &&
      clientEnv.storageBucket &&
      clientEnv.messagingSenderId &&
      clientEnv.appId
  );
}

export function getFirebaseAdminEnv() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  return {
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? clientEnv.projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? clientEnv.storageBucket,
    serviceAccountJson,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  };
}

export function isFirebaseAdminConfigured() {
  const env = getFirebaseAdminEnv();
  return Boolean(
    env.projectId &&
      env.storageBucket &&
      (
        env.serviceAccountJson ||
        (env.clientEmail && env.privateKey)
      )
  );
}
