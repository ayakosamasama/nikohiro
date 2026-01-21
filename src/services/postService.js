import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, deleteDoc } from "firebase/firestore";

const COLLECTION_NAME = "posts";

export const addPost = async (userId, userName, userIcon, mood, text, userGroups = []) => {
    try {
        // 1. Find existing posts by this user
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        // 2. Delete them
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 3. Add new post
        await addDoc(collection(db, COLLECTION_NAME), {
            userId,
            userName,
            userIcon, // Saved in post
            mood, // { emoji: "😊", label: "にこにこ" }
            text,
            userGroups,
            createdAt: serverTimestamp(),
            likes: 0
        });
    } catch (error) {
        console.error("Error adding post: ", error);
        throw error;
    }
};

export const subscribeToPosts = (callback) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(posts);
    });
};
