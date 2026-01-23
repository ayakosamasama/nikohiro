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
    // Direct set with merge is cleaner and safer (no read needed)
    await setDoc(docRef, data, { merge: true });
};
