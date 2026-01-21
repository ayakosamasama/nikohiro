"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { PETS, getLevelFromXP } from "../data/gameData";
import PetDisplay from "./PetDisplay";

const THEME_COLORS = [
    { id: "red", value: "#FF6B6B", name: "あか" },
    { id: "orange", value: "#FF9F43", name: "オレンジ" },
    { id: "yellow", value: "#FECA57", name: "きいろ" },
    { id: "green", value: "#1DD1A1", name: "みどり" },
    { id: "teal", value: "#48DBFB", name: "みずいろ" },
    { id: "blue", value: "#54A0FF", name: "あお" },
    { id: "purple", value: "#5F27CD", name: "むらさき" },
    { id: "pink", value: "#FF9FF3", name: "ピンク" },
    { id: "brown", value: "#834c32", name: "ちゃいろ" },
];

// Categories for "Cute" icons (using Twemoji for consistent, kid-friendly look)
const ICON_CATEGORIES = {
    "かお": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃"],
    "おともだち": ["👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👵", "🧓", "👴", "👮", "👷", "👸", "🤴", "🦸", "🧚", "🧜", "🧞", "🧟", "🧛", "👽", "🤖"],
    "いきもの": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "ox", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀"],
    "のりもの": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🛴", "🚲", "🛵", "🏍", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "🚁", "🛩", "✈️", "🛫", "🛬", "🚀", "🛸", "🛶", "⛵", "🚤", "Motorboat", "🛳", "⛴", "🚢"],
    "たべもの": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🍍", "🥭", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶", "🥒", "🥬", "🥦", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"]
};

// Helper to convert emoji to Twemoji URL
const getEmojiUrl = (emoji) => {
    const codePoint = emoji.codePointAt(0).toString(16);
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`;
};

export default function ProfileSettings({ isOpen, onClose }) {
    const { user, refreshProfile } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [themeColor, setThemeColor] = useState("orange"); // default
    const [photoURL, setPhotoURL] = useState(null);
    const [saving, setSaving] = useState(false);


    // Gamification State
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [pet, setPet] = useState(null);
    const [unlockedPetImages, setUnlockedPetImages] = useState([]);
    const [showPets, setShowPets] = useState(true);

    const [mainTab, setMainTab] = useState("profile"); // Deprecated: Only "profile" remains
    const [activeTab, setActiveTab] = useState("かお"); // Icon tab

    useEffect(() => {
        const loadProfile = async () => {
            if (user && isOpen) {
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile) {
                        setDisplayName(profile.displayName || "");
                        setThemeColor(profile.themeColor || "orange");
                        if (profile.photoURL) {
                            setPhotoURL(profile.photoURL);
                        }
                        // Game Data
                        setXp(profile.experience || 0);
                        setLevel(profile.level || 1);
                        setPet(profile.pet || null);
                        setUnlockedPetImages(profile.unlockedPetImages || []);
                        if (profile.settings?.showPets !== undefined) {
                            setShowPets(profile.settings.showPets);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load profile", error);
                }
            }
        };
        loadProfile();
    }, [user, isOpen]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUserProfile(user.uid, {
                displayName,
                themeColor,
                photoURL
            });

            // Also update Firebase Auth profile for immediate access in other components
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: displayName,
                    photoURL: photoURL
                });
            }

            // Update local CSS variable immediately
            document.documentElement.style.setProperty("--primary", `var(--color-${themeColor})`);

            alert("ほぞん したよ！");
            await refreshProfile(); // Refresh context
            onClose();
        } catch (error) {
            console.error(error);
            alert("しっぱい しちゃった...");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
            display: "flex", justifyContent: "center", alignItems: "center"
        }}>
            <div style={{
                backgroundColor: "white", padding: "30px", borderRadius: "20px",
                width: "90%", maxWidth: "500px",
                border: "4px solid var(--primary)",
                maxHeight: "90vh", overflowY: "auto"
            }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px", color: "var(--primary)" }}>
                    {mainTab === "profile" ? "⚙️ せってい" : "ペット"}
                </h2>

                <h3 style={{ textAlign: "center", marginBottom: "20px", color: "var(--primary)" }}>プロフィール</h3>

                {mainTab === "profile" && (
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            おなまえ
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                style={{
                                    width: "100%", padding: "10px", fontSize: "1.2rem",
                                    borderRadius: "10px", border: "2px solid #ccc"
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                            アイコン

                            <div style={{ display: "flex", gap: "5px", marginBottom: "10px", flexWrap: "wrap" }}>
                                {Object.keys(ICON_CATEGORIES).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveTab(cat)}
                                        style={{
                                            padding: "5px 10px", borderRadius: "15px", border: "none",
                                            backgroundColor: activeTab === cat ? "var(--primary)" : "#eee",
                                            color: activeTab === cat ? "white" : "#555",
                                            fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem"
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                {showPets && (
                                    <button
                                        onClick={() => setActiveTab("collection")}
                                        style={{
                                            padding: "5px 10px", borderRadius: "15px", border: "none",
                                            backgroundColor: activeTab === "collection" ? "var(--primary)" : "#eee",
                                            color: activeTab === "collection" ? "white" : "#555",
                                            fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem"
                                        }}
                                    >
                                        コレクション
                                    </button>
                                )}
                            </div>

                            <div style={{
                                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px",
                                maxHeight: "200px", overflowY: "auto", padding: "5px"
                            }}>
                                {activeTab === "collection" ? (
                                    unlockedPetImages.length > 0 ? (
                                        unlockedPetImages.map((imageId) => {
                                            // imageId format: pet01_0 -> /pet/pet01/pet_01_lv0.png
                                            // Need to reconstruct path.
                                            // pet01_0 -> split -> id=pet01, stage=0
                                            const parts = imageId.split("_");
                                            const pId = parts[0];
                                            const stage = parts[1];
                                            const url = `/pet/${pId}/${pId.replace("pet", "pet_")}_lv${stage}.png`;

                                            return (
                                                <img
                                                    key={imageId}
                                                    src={url}
                                                    onClick={() => setPhotoURL(url)}
                                                    style={{
                                                        width: "100%", aspectRatio: "1/1", cursor: "pointer",
                                                        border: photoURL === url ? "4px solid var(--primary)" : "2px solid transparent",
                                                        borderRadius: "10px", padding: "2px", objectFit: "contain",
                                                        backgroundColor: "#f9f9f9"
                                                    }}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "#888" }}>
                                            まだコレクションがありません。<br />ペットをそだててみよう！
                                        </div>
                                    )
                                ) : (
                                    ICON_CATEGORIES[activeTab].map((emoji) => {
                                        const url = getEmojiUrl(emoji);
                                        return (
                                            <img
                                                key={emoji}
                                                src={url}
                                                onClick={() => setPhotoURL(url)}
                                                style={{
                                                    width: "100%", aspectRatio: "1/1", cursor: "pointer",
                                                    border: photoURL === url ? "4px solid var(--primary)" : "2px solid transparent",
                                                    borderRadius: "10px", padding: "2px"
                                                }}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: "30px" }}>
                            いろ
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setThemeColor(c.id)}
                                        style={{
                                            width: "40px", height: "40px", borderRadius: "50%",
                                            backgroundColor: c.value,
                                            border: themeColor === c.id ? "4px solid #333" : "none",
                                            cursor: "pointer", transform: themeColor === c.id ? "scale(1.1)" : "scale(1)"
                                        }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}





                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                    <button id="tutorial-settings-close-btn" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#ccc", fontWeight: "bold", cursor: "pointer" }}>やめる</button>
                    <button id="tutorial-settings-save-btn" onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "var(--primary)", color: "white", fontWeight: "bold", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                        {saving ? "ほぞんしてるよ..." : "OK"}
                    </button>
                </div>
            </div>
        </div>
    );
}
