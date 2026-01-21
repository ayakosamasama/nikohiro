import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (!getApps().length) {
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        try {
            initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (error) {
            console.error("Firebase Admin Initialization Error:", error);
        }
    } else {
        const missing = [];
        if (!serviceAccount.projectId) missing.push("FIREBASE_PROJECT_ID");
        if (!serviceAccount.clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
        if (!serviceAccount.privateKey) missing.push("FIREBASE_PRIVATE_KEY");
        console.warn("Firebase Admin Env Vars not set. Missing:", missing.join(", "));
    }
}

let adminAuth = null;
let adminDb = null;

// Only attempt to get instances if an app is initialized (either just now or previously)
if (getApps().length > 0) {
    try {
        adminAuth = getAuth();
        adminDb = getFirestore();
    } catch (e) {
        console.warn("Firebase Admin functionality unavailable:", e.message);
    }
}

export { adminAuth, adminDb };
