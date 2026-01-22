import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { getLevelFromXP } from "../data/gameData";

/**
 * Grants rewards for posting.
 * Checks if it's the first post of the day to give bonus XP and items.
 * @param {string} userId 
 * @returns {Promise<{xpGained: number, item: object|null, levelUp: boolean}>}
 */
/**
 * Grants rewards for posting.
 * All XP goes to the pet.
 * Checks for egg drops.
 * @param {string} userId 
 * @param {boolean} forceEgg (Optional admin override)
 * @returns {Promise<{petXPGained: number, eggFound: boolean, potentialPetId: string|null, levelUp: boolean, newLevel: number}>}
 */
export const grantPostRewards = async (userId, forceEgg = false, xpMultiplier = 1) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return { petXPGained: 0, eggFound: false, potentialPetId: null, levelUp: false, newLevel: 0 };

    const userData = userSnap.data();
    const lastPostDate = userData.lastDailyPost ? userData.lastDailyPost.toDate() : null;

    const now = new Date();
    const isToday = lastPostDate &&
        lastPostDate.getDate() === now.getDate() &&
        lastPostDate.getMonth() === now.getMonth() &&
        lastPostDate.getFullYear() === now.getFullYear();

    let petXPGained = 0;

    // Daily Bonus: Once a day (or if forced by admin)
    if (!isToday || forceEgg) {
        petXPGained = 300; // Total daily XP balance
    }

    petXPGained *= xpMultiplier;

    const updates = {
        lastDailyPost: serverTimestamp()
    };

    let levelUp = false;
    let newLevel = 0;

    // Pet XP Logic
    if (userData.pet) {
        const currentXP = userData.pet.xp || 0;
        const currentLevel = userData.pet.level || 0;

        // Cap level at 70
        if (currentLevel < 70) {
            const newXP = currentXP + petXPGained;
            newLevel = getLevelFromXP(newXP);

            // Hard cap at 70
            if (newLevel > 70) newLevel = 70;

            levelUp = (petXPGained > 0) && (newLevel > currentLevel);

            updates["pet.xp"] = newXP;
            updates["pet.level"] = newLevel;

            // Collection Check: If level changed, unlock new image?
            // Actually, let's unlock images based on "highest level reached" or just check on level up.
            // Simplified: Add current stage to unlocked list.
            const stage = Math.min(Math.floor(newLevel / 10), 7);
            const imageId = `${userData.pet.type}_${stage}`; // e.g. pet01_0
            updates.unlockedPetImages = arrayUnion(imageId);
        } else {
            newLevel = 70; // Stay at max
        }
    }

    // Egg Drop Logic
    // Condition: No pet OR Pet Level >= 70
    // Chance: 30% (or forced)
    let eggFound = false;
    let potentialPetId = null;

    const canFindEgg = !userData.pet || (userData.pet.level >= 70);

    if (canFindEgg) {
        const roll = Math.random();
        // 30% chance or forced
        if (roll < 0.3 || forceEgg) {
            eggFound = true;
            // Pick random pet ID (pet01 to pet05)
            const randomId = Math.floor(Math.random() * 5) + 1;
            potentialPetId = `pet0${randomId}`;
        }
    }

    await updateDoc(userRef, updates);

    return {
        petXPGained,
        eggFound,
        potentialPetId,
        levelUp,
        newLevel
    };
};

export const adoptPet = async (userId, petId) => {
    const userRef = doc(db, "users", userId);

    // Initial pet state
    const newPet = {
        type: petId,
        level: 1,
        xp: 0,
        startDate: serverTimestamp() // Track when adopted
    };

    // Unlock the baby image immediately
    const startImageId = `${petId}_0`;

    await updateDoc(userRef, {
        pet: newPet,
        unlockedPetImages: arrayUnion(startImageId)
    });
};
