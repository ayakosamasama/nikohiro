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
