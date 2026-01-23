import { db } from "../lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { createAffiliationGroups, initGroups } from "./groupService";

const AFFILIATIONS_COLLECTION = "affiliations";

// Initialize default affiliation if it doesn't exist
export const initAffiliations = async () => {
    const defaultRef = doc(db, AFFILIATIONS_COLLECTION, "default");
    const defaultSnap = await getDoc(defaultRef);
    if (!defaultSnap.exists()) {
        await setDoc(defaultRef, {
            name: "所属なし（共通）",
            isDefault: true,
            createdAt: new Date()
        });
        // Create default groups (legacy/root) only once
        await initGroups();
    }
};

// Get all affiliations (real-time)
export const subscribeToAffiliations = (callback) => {
    // Ensure default exists (fire and forget, suppress error if permission denied)
    initAffiliations().catch(err => console.warn("Init affiliations skipped:", err.code));

    const q = query(collection(db, AFFILIATIONS_COLLECTION), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const affiliations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(affiliations);
    }, (error) => {
        console.error("Affiliations snapshot error:", error);
    });
};

// Get all affiliations (one-time)
export const getAffiliations = async () => {
    await initAffiliations().catch(err => console.warn("Init affiliations skipped:", err.code));
    const q = query(collection(db, AFFILIATIONS_COLLECTION), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Create a new affiliation
export const createAffiliation = async (name) => {
    const newDocRef = doc(collection(db, AFFILIATIONS_COLLECTION));
    await setDoc(newDocRef, {
        name,
        createdAt: serverTimestamp()
    });

    // Auto-create default groups for this affiliation
    await createAffiliationGroups(newDocRef.id);

    return newDocRef.id;
};

// Update an affiliation
export const updateAffiliation = async (id, data) => {
    const ref = doc(db, AFFILIATIONS_COLLECTION, id);
    await updateDoc(ref, data);
};

// Delete an affiliation
export const deleteAffiliation = async (id) => {
    if (id === "default") return; // Prevent deleting default
    await deleteDoc(doc(db, AFFILIATIONS_COLLECTION, id));
};
