/**
 * Gamification Data Constants
 */

// XP needed to reach next level (index = level - 1)
// Level 1 -> 2 needs 100 XP, Level 2 -> 3 needs 200 XP, etc.
export const getLevelFromXP = (xp) => {
    return Math.floor(Math.sqrt(xp / 2)) + 1;
};

export const getNextLevelXP = (level) => {
    return Math.pow(level, 2) * 2;
};

// Pet Definitions
export const MAX_LEVEL = 70;

export const PETS = {
    pet01: { name: "わんこタイプ", id: "pet01" },
    pet02: { name: "にゃんこタイプ", id: "pet02" },
    pet03: { name: "うさぎタイプ", id: "pet03" },
    pet04: { name: "くまタイプ", id: "pet04" },
    pet05: { name: "とりタイプ", id: "pet05" },
};

export const getPetImage = (petId, level) => {
    // 0-9: lv0, 10-19: lv1, ... 70: lv7
    const stage = Math.min(Math.floor(level / 10), 7);
    return `/pet/${petId}/${petId.replace("pet", "pet_")}_lv${stage}.png`;
};

export const PET_MESSAGES = [
    "きょうもげんき？",
    "あそんでくれてありがとう！",
    "おなかすいたなぁ〜",
    "なにしてあそぶ？",
    "だいすきだよ！",
    "もっとおおきくなりたいな",
    "きょうはいい天気？",
    "ニコニコしてる？",
    "おともだちできた？",
    "がんばってえらいね！"
];
