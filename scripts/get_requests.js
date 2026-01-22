const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach(line => {
        const [key, ...values] = line.split("=");
        if (key && values) {
            process.env[key.trim()] = values.join("=").trim().replace(/"/g, ''); // remove quotes
        }
    });
}

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error("Missing environment variables for Firebase Admin");
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function getPendingRequests() {
    const snapshot = await db.collection("requests").where("status", "==", "pending").get();
    if (snapshot.empty) {
        console.log("No pending requests found.");
        return;
    }

    const requests = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        requests.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            title: data.title,
            content: data.content,
            createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : "Unknown"
        });
    });

    console.log(JSON.stringify(requests, null, 2));
}

getPendingRequests().catch(console.error);
