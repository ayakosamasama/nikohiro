export const NG_WORDS = [
    "ばか", "バカ", "馬鹿",
    "あほ", "アホ", "阿呆",
    "しね", "シネ", "死ね",
    "ころす", "殺す",
    "うざい", "ウザい",
    "きもい", "キモい",
    "でぶ", "デブ",
    "ぶす", "ブス",
    "くず", "クズ"
];

export const containsNgWord = (text, customList = null) => {
    if (!text) return false;
    const listToCheck = customList && customList.length > 0 ? customList : NG_WORDS;
    return listToCheck.some(word => text.includes(word));
};
