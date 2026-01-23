import { db } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, setDoc, deleteDoc, orderBy, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "invitations";

// Generate a random 6-digit alphanumeric code
const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Create a new invitation info
export const createInvitation = async (affiliationId, createdBy) => {
    // Ensure uniqueness by checking if ID exists
    let code = generateCode();
    let isUnique = false;

    // Retry loop for collision (rare)
    while (!isUnique) {
        const docRef = doc(db, COLLECTION_NAME, code);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            isUnique = true;
            // Create with Code as ID
            await setDoc(docRef, {
                code, // Redundant but useful
                affiliationId,
                createdBy,
                createdAt: serverTimestamp(),
                isActive: true
            });
        } else {
            code = generateCode();
        }
    }

    return code;
};

// Validate invitation code
// Returns object { isValid, affiliationId, error }
export const validateInvitation = async (code) => {
    if (!code) return { isValid: false, error: "コードを入力してください" };

    const normalizedCode = code.toUpperCase().trim();
    if (normalizedCode.length !== 6) {
        return { isValid: false, error: "コードは6桁です" };
    }

    try {
        const docRef = doc(db, COLLECTION_NAME, normalizedCode);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { isValid: false, error: "招待コードが見つかりません" };
        }

        const inviteData = docSnap.data();
        if (!inviteData.isActive) {
            return { isValid: false, error: "この招待コードは無効です" };
        }

        // --- Expiration Check (24 Hours) ---
        const createdAt = inviteData.createdAt?.toDate();
        if (createdAt) {
            const now = new Date();
            const diff = now - createdAt;
            const hours = diff / (1000 * 60 * 60);
            if (hours > 24) {
                return { isValid: false, error: "招待コードの期限（24時間）が切れています" };
            }
        }

        return { isValid: true, affiliationId: inviteData.affiliationId };
    } catch (error) {
        console.error("Invitation check error:", error);
        return { isValid: false, error: "確認中にエラーが発生しました" };
    }
};

// --- Admin Functions ---

// Get all invitations (real-time)
export const subscribeToInvitations = (callback) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const invitations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(invitations);
    }, (error) => {
        console.error("Invitations subscription error:", error);
    });
};

// Get all invitations (one-time)
export const getAllInvitations = async () => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Delete an invitation
export const deleteInvitation = async (code) => {
    await deleteDoc(doc(db, COLLECTION_NAME, code));
};

// Get affiliation name by ID (Helper)
export const getAffiliationName = async (affiliationId) => {
    if (affiliationId === "default") return "所属なし（共通）";

    const ref = doc(db, "affiliations", affiliationId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data().name;
    }
    return "不明な所属";
};
