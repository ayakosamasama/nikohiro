import { db } from "../lib/firebase";
import {
    collection,
    doc,
    runTransaction,
    query,
    where,
    orderBy,
    getDocs,
    updateDoc,
    getDoc,
    serverTimestamp,
    addDoc
} from "firebase/firestore";

/**
 * Reports a post.
 * If reportCount >= 3, the post is automatically hidden.
 * @param {string} postId - ID of the post to report
 * @param {string} userId - ID of the user reporting
 * @param {string} userName - Name of the user reporting (for audit)
 * @param {string} reason - Reason for reporting
 * @returns {Promise<{success: boolean, message: string, hidden: boolean}>}
 */
export const reportPost = async (postId, userId, userName, reason) => {
    try {
        const postRef = doc(db, "posts", postId);

        return await runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw new Error("Post does not exist!");
            }

            const postData = postDoc.data();
            const reportedBy = postData.reportedBy || [];

            // Check if user already reported
            if (reportedBy.includes(userId)) {
                return { success: false, message: "もうつうほうしているよ", hidden: postData.hidden || false };
            }

            // Update report count and list
            const newReportedBy = [...reportedBy, userId];
            const newReportCount = (postData.reportCount || 0) + 1;

            // Auto-hide logic: 3 or more reports
            const shouldHide = newReportCount >= 3;

            transaction.update(postRef, {
                reportedBy: newReportedBy,
                reportCount: newReportCount,
                hidden: shouldHide || postData.hidden || false,
                lastReportedAt: serverTimestamp()
            });

            // Optional: Store detailed report in a subcollection for audit
            // We do this *after* the main transaction to strictly keep the transaction small, 
            // but actually standard Firestore best practice is to put it in the transaction or just do it separately.
            // Since `transaction.set` on a new doc is fine, let's try to include it or just do it async after.
            // For simplicity and to avoid transaction limits on different collections if we used a root collection,
            // let's just stick to the post update. The detailed reason could be stored in a separate call effectively.

            return { success: true, message: "つうほうしました", hidden: shouldHide };
        });
    } catch (error) {
        console.error("Error reporting post:", error);
        throw error;
    }
};

/**
 * Adds detailed report record (Can be called after reportPost)
 * @param {string} postId 
 * @param {string} userId 
 * @param {string} userName 
 * @param {string} reason 
 */
export const logReportDetail = async (postId, userId, userName, reason) => {
    try {
        // Store in a subcollection 'reports' under the post
        const reportRef = collection(db, "posts", postId, "reports");
        await addDoc(reportRef, {
            userId,
            userName,
            reason,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error logging report detail:", e);
        // Non-critical, just log
    }
};

/**
 * Get all reported posts for admin review.
 * @returns {Promise<Array>}
 */
export const getReportedPosts = async () => {
    try {
        const postsRef = collection(db, "posts");
        // Query posts with reportCount > 0
        const q = query(postsRef, where("reportCount", ">", 0), orderBy("reportCount", "desc"));
        const snapshot = await getDocs(q);

        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // For each post, fetch the latest report reasons (optional, avoiding N+1 mostly by just fetching on demand in UI, 
        // but for now let's just return the posts. Admin can view details if needed.)
        return posts;
    } catch (error) {
        console.error("Error fetching reported posts:", error);
        return [];
    }
};

/**
 * Admin: Dismiss reports (restore post)
 * @param {string} postId 
 */
export const dismissReports = async (postId) => {
    try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
            reportCount: 0,
            reportedBy: [],
            hidden: false,
            clearedReportsAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error dismissing reports:", error);
        throw error;
    }
};

/**
 * Admin: Delete post (and potentially ban user? - just delete for now)
 * @param {string} postId 
 */
export const deleteReportedPost = async (postId) => {
    try {
        const postRef = doc(db, "posts", postId);
        await deleteDoc(postRef);
        return true;
    } catch (error) {
        console.error("Error deleting reported post:", error);
        throw error;
    }
};
