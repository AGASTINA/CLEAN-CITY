const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  try {
    const resolvedPath = serviceAccountPath
      ? path.resolve(process.cwd(), serviceAccountPath)
      : null;

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id
      });
      console.log(`✅ Firebase initialized using service account: ${resolvedPath}`);
    } else {
      if (serviceAccountPath) {
        // Prevent google-auth-library from repeatedly trying to read a missing file path
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId
      });
      console.log('✅ Firebase initialized using application default credentials');
    }
  } catch (error) {
    console.warn('⚠️ Firebase credentials not found. Starting in local dev mode without verified credentials.');
    console.warn(`⚠️ Reason: ${error.message}`);
    if (serviceAccountPath) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    admin.initializeApp({ projectId });
  }
}

let db;
try {
  db = admin.firestore();
} catch (error) {
  console.warn('⚠️ Firestore client not ready at startup. The server will run, but DB routes may fail until credentials are configured.');
  console.warn(`⚠️ Reason: ${error.message}`);
  db = {
    collection: () => {
      throw new Error('Firestore is not configured. Add a valid serviceAccountKey.json or set Application Default Credentials.');
    }
  };
}

module.exports = {
  admin,
  db
};
