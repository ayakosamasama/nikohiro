import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, where } from "firebase/firestore";


// Check if user has a pending request
export const hasPendingRequest = async (userId) => {
    try {
        const q = query(
            collection(db, "requests"),
            where("userId", "==", userId),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking pending requests: ", error);
        return false;
    }
};

// Add a new request
export const addRequest = async (userId, userName, email, title, content) => {
    try {
        // Enforce 1 pending request limit
        const hasPending = await hasPendingRequest(userId);
        if (hasPending) {
            throw new Error("You already have a pending request.");
        }

        await addDoc(collection(db, "requests"), {
            userId,
            userName,
            email,
            title,
            content,
            createdAt: serverTimestamp(),
            status: "pending"
        });
        return true;
    } catch (error) {
        console.error("Error adding request: ", error);
        throw error;
    }
};


// Get all requests (for admin)
// Modified to only return pending requests by default, or all if specified
export const getAllRequests = async (includeCompleted = false) => {
    try {
        let q;
        if (includeCompleted) {
            q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        } else {
            q = query(collection(db, "requests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting requests: ", error);
        throw error;
    }
};

// Resolve a request (mark as completed and optionally add gameUrl)
export const resolveRequest = async (requestId, gameUrl = null) => {
    try {
        const updates = {
            status: "completed",
            resolvedAt: serverTimestamp()
        };
        if (gameUrl) {
            updates.gameUrl = gameUrl;
        }
        await updateDoc(doc(db, "requests", requestId), updates);
        return true;
    } catch (error) {
        console.error("Error resolving request: ", error);
        throw error;
    }
};

// Delete a request (actually delete)
export const deleteRequest = async (requestId) => {
    try {
        await deleteDoc(doc(db, "requests", requestId));
        return true;
    } catch (error) {
        console.error("Error deleting request: ", error);
        throw error;
    }
};
// Get requests for a specific user
export const getUserRequests = async (userId) => {
    try {
        const q = query(collection(db, "requests"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting user requests: ", error);
        throw error;
    }
};
