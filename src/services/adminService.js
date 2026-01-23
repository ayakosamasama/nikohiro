import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";

export const getAllUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- NG Word Management ---

const SAFETY_DOC_REF = doc(db, "system", "safety");

export const getNgWords = async () => {
    const d = await getDoc(SAFETY_DOC_REF);
    if (d.exists()) {
        return d.data().ngWords || [];
    }
    return [];
};

export const subscribeToNgWords = (callback) => {
    return onSnapshot(SAFETY_DOC_REF, (doc) => {
        if (doc.exists()) {
            callback(doc.data().ngWords || []);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error("NG Words subscription error:", error);
    });
};

export const addNgWord = async (word) => {
    if (!word) return;
    // Ensure document exists first
    const d = await getDoc(SAFETY_DOC_REF);
    if (!d.exists()) {
        await setDoc(SAFETY_DOC_REF, { ngWords: [word] });
    } else {
        await updateDoc(SAFETY_DOC_REF, {
            ngWords: arrayUnion(word)
        });
    }
};

export const removeNgWord = async (word) => {
    if (!word) return;
    await updateDoc(SAFETY_DOC_REF, {
        ngWords: arrayRemove(word)
    });
};

// --- User-Affiliation Assignment ---

export const assignUserToAffiliation = async (userId, affiliationId) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        affiliations: arrayUnion(affiliationId),
        // If they don't have a primary affiliation set, or it's default, set this as primary
        affiliationId: affiliationId
    });
};

export const removeUserFromAffiliation = async (userId, affiliationId) => {
    if (affiliationId === "default") return; // Keep default
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        affiliations: arrayRemove(affiliationId)
    });
};

export const getUsersByAffiliation = async (affiliationId) => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const allUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (affiliationId === "all") return allUsers;

    return allUsers.filter(u =>
        (u.affiliations && u.affiliations.includes(affiliationId)) ||
        u.affiliationId === affiliationId ||
        (affiliationId === "default" && (!u.affiliationId || u.affiliationId === "default"))
    );
};
// --- System Config & Maintenance ---

const CONFIG_DOC_REF = doc(db, "system", "config");

export const subscribeToSystemConfig = (callback) => {
    return onSnapshot(CONFIG_DOC_REF, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback({ maintenanceMode: false });
        }
    }, (error) => {
        console.error("System Config subscription error:", error);
    });
};

export const updateMaintenanceMode = async (enabled) => {
    const d = await getDoc(CONFIG_DOC_REF);
    if (!d.exists()) {
        await setDoc(CONFIG_DOC_REF, { maintenanceMode: enabled, lastUpdated: new Date() });
    } else {
        await updateDoc(CONFIG_DOC_REF, {
            maintenanceMode: enabled,
            lastUpdated: new Date()
        });
    }
};
