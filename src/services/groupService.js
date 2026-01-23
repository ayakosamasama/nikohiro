import { db } from "../lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, getDoc } from "firebase/firestore";

const GROUPS_COLLECTION = "groups";
const MEMBERS_COLLECTION = "members";

// Initialize default groups if they don't exist
const DEFAULT_GROUPS = [
    { id: "game", name: "ゲーム", emoji: "🎮", color: "#FF6B6B" },
    { id: "drawing", name: "おえかき", emoji: "🎨", color: "#FF9F43" },
    { id: "cooking", name: "おりょうり", emoji: "🍳", color: "#FECA57" },
    { id: "lego", name: "レゴ・ブロック", emoji: "🧱", color: "#1DD1A1" },
    { id: "book", name: "ほん", emoji: "📚", color: "#54A0FF" },
    { id: "music", name: "おんがく", emoji: "🎵", color: "#FF9FF3" },
];

export const initGroups = async () => {
    for (const group of DEFAULT_GROUPS) {
        const groupRef = doc(db, GROUPS_COLLECTION, group.id);
        const docSnap = await getDoc(groupRef);
        if (!docSnap.exists()) {
            await setDoc(groupRef, group);
        }
    }
};

export const subscribeToGroups = (affiliationId = "default", callback) => {
    // Backward compatibility: if first arg is function, treat as callback
    if (typeof affiliationId === "function") {
        callback = affiliationId;
        affiliationId = "default";
    }



    // Note: To support "missing affiliationId = default", we need client-side filtering 
    // or a comprehensive backfill. For a small app, client-side filtering is acceptable.
    // However, to ensure security/privacy scale, we should eventually use server-side 'where'.

    // Strategy: Fetch ALL groups, then filter. 
    // Optimization: If affiliationId is specific (not default), we COULD use 'where', 
    // but then we can't see "Global" groups if we wanted to sharing them (though requirement says strict isolation).

    return onSnapshot(collection(db, GROUPS_COLLECTION), (snapshot) => {
        const groups = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        const filtered = groups.filter(g => {
            if (affiliationId === "all" || affiliationId === null) return true;
            const gAff = g.affiliationId || "default";
            const uAff = affiliationId || "default";
            return gAff === uAff;
        });

        callback(filtered);
    }, (error) => {
        console.error("Groups snapshot error:", error);
    });
};

export const joinGroup = async (userId, groupId) => {
    await setDoc(doc(db, GROUPS_COLLECTION, groupId, MEMBERS_COLLECTION, userId), {
        joinedAt: new Date()
    });
};

export const leaveGroup = async (userId, groupId) => {
    await deleteDoc(doc(db, GROUPS_COLLECTION, groupId, MEMBERS_COLLECTION, userId));
};

export const subscribeToUserGroups = (userId, callback, onError) => {
    // ...
    return onSnapshot(collection(db, "users", userId, "joinedGroups"), (snapshot) => {
        const groupIds = snapshot.docs.map(doc => doc.id);
        callback(groupIds);
    }, (error) => {
        console.error("User groups subscription error:", error);
        if (onError) onError(error);
    });
};

// Updated Join/Leave to update User's subcollection too
export const toggleGroupMembership = async (userId, groupId, isJoining) => {
    if (isJoining) {
        // Add to group's members
        await setDoc(doc(db, GROUPS_COLLECTION, groupId, MEMBERS_COLLECTION, userId), { joinedAt: new Date() });
        // Add to user's joinedGroups
        await setDoc(doc(db, "users", userId, "joinedGroups", groupId), { joinedAt: new Date() });
    } else {
        // Remove from both
        await deleteDoc(doc(db, GROUPS_COLLECTION, groupId, MEMBERS_COLLECTION, userId));
        await deleteDoc(doc(db, "users", userId, "joinedGroups", groupId));
    }
};
// Admin: Create Group
export const createGroup = async (id, name, emoji, color, affiliationId = "default") => {
    await setDoc(doc(db, GROUPS_COLLECTION, id), {
        name,
        emoji,
        color,
        affiliationId
    });
};

// Admin: Update Group
export const updateGroup = async (id, data) => {
    await setDoc(doc(db, GROUPS_COLLECTION, id), data, { merge: true });
};

// Admin: Delete Group
export const deleteGroup = async (id) => {
    await deleteDoc(doc(db, GROUPS_COLLECTION, id));
};

// Admin: Get Group Members
export const getGroupMembers = async (groupId) => {
    const membersSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, MEMBERS_COLLECTION));
    // Ideally we would fetch user details for each member, but for now just returning IDs and joinedAt
    // To make it useful, we should probably fetch the user profiles.

    const memberPromises = membersSnap.docs.map(async (memberDoc) => {
        const uid = memberDoc.id;
        const joinedAt = memberDoc.data().joinedAt;
        // Fetch user profile
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return null; // Filter out if user doesn't exist

        const userData = userSnap.data();
        return {
            uid,
            joinedAt,
            displayName: userData.displayName || "Unknown",
            email: userData.email, // If needed
            photoURL: userData.photoURL
        };
    });

    const results = await Promise.all(memberPromises);
    return results.filter(member => member !== null);
};

// Create default groups for a new affiliation
export const createAffiliationGroups = async (affiliationId) => {
    for (const group of DEFAULT_GROUPS) {
        // Unique Group ID: affiliationId_groupId (e.g., "schoolA_game")
        const newGroupId = `${affiliationId}_${group.id}`;
        const groupRef = doc(db, GROUPS_COLLECTION, newGroupId);
        await setDoc(groupRef, {
            ...group,
            affiliationId // Link to parent affiliation
        });
    }
};
