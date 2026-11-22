const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;
let localDevWarningLogged = false;

// Attempt to initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Initialize from env var (can be a JSON string or a file path)
    let credential;
    try {
      // Try parsing as inline JSON first
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(parsed);
    } catch (_parseErr) {
      // Treat as a file path
      if (fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT)) {
        const fileContent = JSON.parse(
          fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, 'utf-8')
        );
        credential = admin.credential.cert(fileContent);
      } else {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT is set but is neither valid JSON nor a valid file path.'
        );
      }
    }

    admin.initializeApp({ credential });
    firebaseInitialized = true;
    console.log('[Auth] Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env var.');
  } else if (fs.existsSync(serviceAccountPath)) {
    // Initialize from local service account file
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[Auth] Firebase Admin initialized from firebase-service-account.json.');
  }
} catch (err) {
  console.warn('[Auth] Firebase Admin initialization failed:', err.message);
  console.warn('[Auth] Falling back to local dev mode.');
}

/**
 * Express middleware that verifies Firebase ID tokens.
 * Falls back to a local dev user when Firebase is not configured.
 */
async function authMiddleware(req, res, next) {
  // ── Firebase path ──
  if (firebaseInitialized) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
      };
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired Firebase token.',
      });
    }
  }

  // ── Local dev fallback ──
  if (!localDevWarningLogged) {
    console.warn(
      '[Auth] ⚠️  Firebase is NOT configured. Using local dev fallback user for all requests.'
    );
    localDevWarningLogged = true;
  }

  req.user = {
    uid: 'local-dev',
    email: 'dev@folia.local',
    name: 'Local Developer',
  };
  return next();
}

module.exports = authMiddleware;
