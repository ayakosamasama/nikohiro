import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";

// Add a new request
export const addRequest = async (userId, userName, email, title, content) => {
    try {
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
export const getAllRequests = async () => {
    try {
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
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

// Delete a request (mark as completed/resolved)
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
        const q = query(collection(db, "requests"), where("userId", "==", userId), orderBy("createdAt", "desc"));
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
