import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";

const COLLECTION_NAME = "posts";

export const addPost = async (userId, userName, userIcon, mood, text, userGroups = [], affiliationId = "default", file = null, onProgress = null) => {
    try {
        // In Base64 mode, 'file' is the base64 string
        let mediaBase64 = file;
        // Limit: One post per user PER AFFILIATION
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId), where("affiliationId", "==", affiliationId));
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
            mediaUrl: mediaBase64, // Save Base64 string directly
            mediaType: mediaBase64 ? 'image' : null,
            createdAt: serverTimestamp(),
            likes: 0
        });
    } catch (error) {
        console.error("Error adding post: ", error);
        throw error;
    }
};

export const subscribeToPosts = (callback) => {
    const postsRef = collection(db, COLLECTION_NAME);
    const q = query(postsRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(posts);
    }, (error) => {
        console.error("Posts subscription error:", error);
    });
};

export const toggleReaction = async (postId, userId, reactionType) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) return;

    const post = postSnap.data();
    const reactions = post.reactions || {};
    const userIds = reactions[reactionType] || [];

    const isReacted = userIds.includes(userId);

    const updatedUserIds = isReacted
        ? userIds.filter(id => id !== userId)
        : [...userIds, userId];

    await updateDoc(postRef, {
        [`reactions.${reactionType}`]: updatedUserIds
    });
};
