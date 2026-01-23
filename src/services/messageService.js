import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "firebase/firestore";

/**
 * Send a message from Admin
 * @param {Object} messageData { title, content, type, targetId, createdBy }
 */
export const sendMessage = async (messageData) => {
    const messagesRef = collection(db, "messages");
    return await addDoc(messagesRef, {
        ...messageData,
        createdAt: serverTimestamp(),
        isSystem: true
    });
};

/**
 * Subscribe to messages for a user
 * @param {Object} userDetails { uid, affiliationIds, groupIds }
 * @param {Function} callback 
 */
export const subscribeToMessages = (userDetails, callback, onError) => {
    const { uid, affiliationIds = [], groupIds = [] } = userDetails;
    const messagesRef = collection(db, "messages");
    const statusRef = collection(db, "users", uid, "messageStatus");

    let messages = [];
    let statuses = {};

    const mergeAndCallback = () => {
        const filtered = messages.filter(msg => {
            if (msg.type === "all") return true;
            if (msg.type === "affiliation" && affiliationIds.includes(msg.targetId)) return true;
            if (msg.type === "group" && groupIds.includes(msg.targetId)) return true;
            if (msg.type === "user" && msg.targetId === uid) return true;
            return false;
        });

        const merged = filtered.map(msg => ({
            ...msg,
            status: statuses[msg.id] || { read: false, deleted: false }
        }));

        // Exclude deleted messages
        callback(merged.filter(m => !m.status.deleted));
    };

    // 1. Listen to messages (global)
    const q = query(messagesRef, orderBy("createdAt", "desc"));
    const unsubMessages = onSnapshot(q, (snapshot) => {
        messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        mergeAndCallback();
    }, (error) => {
        console.error("Messages subscription error:", error);
        if (onError) onError(error);
    });

    // 2. Listen to statuses (user-specific)
    const unsubStatuses = onSnapshot(statusRef, (snapshot) => {
        const newStatuses = {};
        snapshot.docs.forEach(doc => {
            newStatuses[doc.id] = doc.data();
        });
        statuses = newStatuses;
        mergeAndCallback();
    }, (error) => {
        console.error("Statuses subscription error:", error);
        if (onError) onError(error);
    });

    // Return combined unsubscribe
    return () => {
        unsubMessages();
        unsubStatuses();
    };
};

/**
 * Mark a message as read
 */
export const markAsRead = async (userId, messageId) => {
    const statusRef = doc(db, "users", userId, "messageStatus", messageId);
    return await setDoc(statusRef, { read: true }, { merge: true });
};

/**
 * Delete a message for a user (hide from view)
 */
export const deleteUserMessage = async (userId, messageId) => {
    const statusRef = doc(db, "users", userId, "messageStatus", messageId);
    return await setDoc(statusRef, { deleted: true }, { merge: true });
};
