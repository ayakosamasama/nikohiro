import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";

const COLLECTION_NAME = "posts";

export const addPost = async (userId, userName, userIcon, mood, text, userGroups = [], affiliationId = "default") => {
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
            affiliationId, // Save affiliation
            createdAt: serverTimestamp(),
            likes: 0
        });
    } catch (error) {
        console.error("Error adding post: ", error);
        throw error;
    }
};

export const subscribeToPosts = (affiliationId = "default", callback) => {
    // Backward compatibility
    if (typeof affiliationId === "function") {
        callback = affiliationId;
        affiliationId = "default";
    }

    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const allPosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side isolation filter
        const filtered = allPosts.filter(p => {
            const pAff = p.affiliationId || "default";
            const uAff = affiliationId || "default";
            return pAff === uAff;
        });

        callback(filtered);
    }, (error) => {
        console.error("Posts snapshot error:", error);
    });
};

export const toggleReaction = async (postId, userId, reactionType) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) return;

    const postData = postSnap.data();
    const reactions = postData.reactions || {};
    const users = reactions[reactionType] || [];

    let newUsers;
    if (users.includes(userId)) {
        newUsers = users.filter(id => id !== userId);
    } else {
        newUsers = [...users, userId];
    }

    await updateDoc(postRef, {
        [`reactions.${reactionType}`]: newUsers
    });
};
