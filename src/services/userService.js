import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const getUserProfile = async (userId) => {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null;
    }
};

export const updateUserProfile = async (userId, data) => {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    // Create if doesn't exist (using setDoc with merge), otherwise update
    if (!docSnap.exists()) {
        await setDoc(docRef, data, { merge: true });
    } else {
        await updateDoc(docRef, data);
    }
};
