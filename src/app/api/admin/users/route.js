import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

// Helper to verify admin token
async function verifyAdmin(request) {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return null;
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Check if user is actually admin in Firestore
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data().isAdmin) {
            return decodedToken;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// UPDATE User (Email/Password)
export async function PUT(request) {
    console.log("PUT request received");
    if (!adminAuth) {
        console.error("Admin Auth is not initialized.");
        return NextResponse.json({ error: "Server Misconfiguration: Firebase Admin not initialized" }, { status: 500 });
    }

    const requester = await verifyAdmin(request);
    if (!requester) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { uid, email, password } = body;

    try {
        const updateData = {};
        if (email) updateData.email = email;
        if (password && password.length >= 6) updateData.password = password;

        await adminAuth.updateUser(uid, updateData);

        // Also update Firestore if needed (e.g., email sync)
        if (email) {
            await adminDb.collection("users").doc(uid).update({ email });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE User
export async function DELETE(request) {
    console.log("DELETE request received");
    if (!adminAuth) {
        console.error("Admin Auth is not initialized.");
        return NextResponse.json({ error: "Server Misconfiguration: Firebase Admin not initialized" }, { status: 500 });
    }

    const requester = await verifyAdmin(request);
    if (!requester) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({ error: "UID required" }, { status: 400 });
    }

    try {
        // Delete from Auth
        await adminAuth.deleteUser(uid);
        // Delete from Firestore
        await adminDb.collection("users").doc(uid).delete();

        // Delete posts by user
        const postsQuery = await adminDb.collection("posts").where("userId", "==", uid).get();
        if (!postsQuery.empty) {
            const batch = adminDb.batch();
            postsQuery.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Deleted ${postsQuery.size} posts for user ${uid}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
