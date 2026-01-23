"use client";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { addPost } from "../services/postService";
import { LANGUAGE_QUIZZES } from "../data/quizData";
import { useAuth } from "../context/AuthContext";
import { containsNgWord } from "../utils/safetyCheck";

const MOODS = [
    { emoji: "😊", label: "にこにこ", message: "きょうもにこにこ元気だよ！" },
    { emoji: "😆", label: "さいこう", message: "すっごくたのしい！さいこうのきぶん！" },
    { emoji: "🎉", label: "わくわく", message: "なにかいいことがありそう！わくわく！" },
    { emoji: "😲", label: "びっくり", message: "ええーっ！びっくりしたなぁ" },
    { emoji: "🤔", label: "ふむふむ", message: "なるほど…どうしてだろう？" },
    { emoji: "😢", label: "しくしく", message: "ちょっぴりかなしいきもち…" },
    { emoji: "😭", label: "えーん", message: "かなしいことがあったの…えーん" },
    { emoji: "😡", label: "ぷんぷん", message: "もう！おこってるんだから！" },
    { emoji: "😤", label: "ふんっ", message: "ふんだ！もんくある？" },
    { emoji: "😴", label: "すやすや", message: "ふわぁ…ねむくなってきたかも" },
    { emoji: "😷", label: "ぐったり", message: "ちょっとちょうしがわるいかも…" },
    { emoji: "😎", label: "きりっ", message: "かっこよくきめてみたよ！" },
    { emoji: "🥳", label: "おめでとう", message: "やったー！おめでとう！" },
    { emoji: "😱", label: "ガーン", message: "ショック！しんじられない…" },
    { emoji: "🤗", label: "ぎゅっ", message: "なかよし！ぎゅーっとしたいきぶん" },
    { emoji: "😋", label: "ペロリ", message: "おいしそう！ペロリとたべちゃいたい" },
    { emoji: "😍", label: "だいすき", message: "めがハートになっちゃう！だいすき！" },
    { emoji: "😇", label: "てんし", message: "いいことして、やさしいきぶん" },
    { emoji: "🤪", label: "あっかんべー", message: "へんなかおしちゃお！あっかんべー" },
    { emoji: "🤐", label: "ないしょ", message: "これはヒミツ！ナイショだよ" },
    { emoji: "🤒", label: "おねつ", message: "げんきないよー...おねつがあるかも" },
    { emoji: "🤕", label: "いたい", message: "いたいよ〜...けがしちゃった" },
    { emoji: "🤢", label: "きもちわるい", message: "ううっ...きもちわるいかも" },
    { emoji: "🤧", label: "ハクション", message: "ハクション！かぜひいたかな？" },
    { emoji: "🥵", label: "あつい", message: "ふぅ...きょうはあつすぎるよ〜" },
    { emoji: "🥶", label: "さむい", message: "ブルブル...さむくてこおえそう" },
    { emoji: "🥺", label: "ぴえん", message: "ぴえん...かまってほしいな" },
    { emoji: "🤠", label: "カウボーイ", message: "ぼうけんにしゅっぱつだ！ヒヒーン！" },
    { emoji: "👽", label: "うちゅうじん", message: "ワレワレハうちゅうじんダ..." },
    { emoji: "🤖", label: "ロボット", message: "ウィーン...ガシャン...ロボットだよ" },
    { emoji: "👻", label: "おばけ", message: "うらめしや〜...おばけだぞ〜" },
    { emoji: "👍", label: "いい", message: "いいね！バッチリだよ！" },
    { emoji: "👎", label: "やだ", message: "うーん、それはちょっとちがうかも" },
    { emoji: "👊", label: "パンチ", message: "やるきまんまん！まけないぞ！" },
    { emoji: "✌️", label: "ピース", message: "イェーイ！ピース！" },
    { emoji: "👋", label: "バイバイ", message: "またね！バイバーイ！" },
    { emoji: "💪", label: "パワー", message: "ちからがみなぎってきた！パワー！" },
    { emoji: "👐", label: "パァ", message: "パァ！あかるいきぶん！" },
    { emoji: "🙌", label: "ばんざい", message: "やったー！ばんざーい！" },
    { emoji: "👏", label: "パチパチ", message: "すごいすごい！パチパチパチ！" },
    { emoji: "🙏", label: "おねがい", message: "かみさまほとけさま！おねがいします！" },
    { emoji: "👀", label: "じーっ", message: "じーっ...きになってみてるよ" },
    { emoji: "💋", label: "ちゅっ", message: "だいすきのしるし！ちゅっ！" },
    { emoji: "💔", label: "ハートブレイク", message: "こころがおれそう...ショック" },
    { emoji: "🎵", label: "ルンルン", message: "はなうたうたっちゃう！ルンルンきぶん" },
    { emoji: "💩", label: "うんち", message: "うんち！...なんていってみたり" },
];

import { subscribeToNgWords } from "../services/adminService";
import { getUserProfile } from "../services/userService";
import { grantPostRewards } from "../services/gameService";
import RewardModal from "./RewardModal";
// ... imports

import QuizModal from "./QuizModal";

export default function PostForm({ userGroups = [], onClose, onSuccess, isTutorialMode = false }) {
    const { user, profile, affiliations, affiliationId } = useAuth();
    const [text, setText] = useState("");
    const [selectedMood, setSelectedMood] = useState(MOODS[0]);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const [name, setName] = useState("");
    const [quizSettings, setQuizSettings] = useState({ maxAnswer: 2, operations: ["add"] });

    // Initial state sync from centralized profile
    // Fetch profile data on mount since it's not in AuthContext anymore
    useEffect(() => {
        if (user) {
            getUserProfile(user.uid).then(p => {
                if (p) {
                    const newName = p.displayName || (user.email ? user.email.split("@")[0] : "") || "ゲスト";
                    setName(newName);
                    if (p.quizSettings) {
                        setQuizSettings(p.quizSettings);
                    }
                    if (p.settings && p.settings.mediaUploadEnabled !== undefined) {
                        setMediaUploadEnabled(p.settings.mediaUploadEnabled);
                    }
                } else {
                    setName(user.email ? user.email.split("@")[0] : "ゲスト");
                }
            }).catch(console.error);
        }
    }, [user]);

    // Reward State
    const [rewardData, setRewardData] = useState(null);
    const [showReward, setShowReward] = useState(false);

    // NG Words state
    const [ngWords, setNgWords] = useState([]);

    // Media State
    const [mediaUploadEnabled, setMediaUploadEnabled] = useState(true);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Affiliation State
    const [selectedAffiliation, setSelectedAffiliation] = useState("default");
    const [affiliationOptions, setAffiliationOptions] = useState([]);

    useEffect(() => {
        const currentAffiliations = affiliations || [];
        if (user && currentAffiliations.length > 0) {
            // If only one, just set it
            if (currentAffiliations.length === 1) {
                setSelectedAffiliation(currentAffiliations[0]);
            } else {
                // Fetch names
                import("../services/affiliationService").then(({ getAffiliations }) => {
                    getAffiliations().then(all => {
                        const myAffs = all.filter(a => currentAffiliations.includes(a.id));
                        setAffiliationOptions(myAffs);
                        if (!selectedAffiliation || selectedAffiliation === "default") {
                            setSelectedAffiliation(affiliationId || currentAffiliations[0]);
                        }
                    }).catch(e => {
                        console.error("PostForm: Fetch affiliations failed", e);
                    });
                });
            }
        }
    }, [user, affiliations, affiliationId, selectedAffiliation]);
    // Unified profile sync moved to AuthContext and local initialization useEffect

    useEffect(() => {
        const unsub = subscribeToNgWords(setNgWords);
        return () => unsub();
    }, []);

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        // Image Only check
        if (!selected.type.startsWith('image/')) {
            alert("画像ファイル（しゃしん）だけえらんでね");
            return;
        }

        // File Size Limit (500KB for Firestore Base64)
        const MAX_SIZE_KB = 500;
        if (selected.size > MAX_SIZE_KB * 1024) {
            alert(`ファイルがおおきすぎます（${MAX_SIZE_KB}KBまで）。\nもっとちいさいファイル（サイズをちいさくしたしゃしん）を選んでね。`);
            e.target.value = ""; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFile(reader.result); // Store Base64 string
            setPreviewUrl(reader.result); // Base64 works as Src
        };
        reader.readAsDataURL(selected);
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        // Reset input value to allow selecting same file again
        const input = document.getElementById("hidden-file-input");
        if (input) input.value = "";
    };

    // ... existing profile useEffect

    const executePost = async () => {
        if (isUploading) return;
        setIsUploading(true);
        try {
            const postName = name || (user.email ? user.email.split("@")[0] : "ゲスト");
            const postIcon = user.photoURL || null;
            await addPost(user.uid, postName, postIcon, selectedMood, text, userGroups, selectedAffiliation, file);

            // Grant Rewards (Game Logic)
            const reward = await grantPostRewards(user.uid);

            setIsQuizOpen(false); // Ensure quiz is closed

            if (isTutorialMode) {
                // Skip reward screen during tutorial
                if (onSuccess) onSuccess();
            } else {
                setRewardData(reward);
                setShowReward(true);
            }

            setText("");
            clearFile();

        } catch (error) {
            alert("とうこうできませんでした");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePostClick = () => {
        if (!text.trim() && !file) {
            alert("メッセージを かいてみてね！");
            return;
        }

        // Safety check with dynamic list
        if (containsNgWord(text, ngWords)) {
            alert("「ちくちくことば」がつかわれているかもしれません。\nやさしいことばになおしてみよう！");
            return;
        }

        // TUTORIAL SPECIAL PATH: Bypass Quiz
        if (isTutorialMode) {
            executePost();
            return;
        }

        // Check settings: Default is TRUE if undefined
        if (quizSettings?.quizBeforePost !== false) {
            setIsQuizOpen(true);
        } else {
            executePost();
        }
    };

    const handleRewardClose = () => {
        setShowReward(false);
        setText("");
        if (onSuccess) onSuccess(); // Close the Post Modal
    };

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        setText(mood.message);
    };

    return (
        <div className="animate-pop" style={{
            background: "white",
            padding: "25px",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            position: "relative",
            border: "1px solid rgba(0,0,0,0.05)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                    <h3 style={{ margin: 0, color: "var(--primary)", fontSize: "1.2rem", fontWeight: "900" }}>
                        ＼ きょうのきもちは？ ／
                    </h3>
                    {affiliationOptions.length > 1 && (
                        <div style={{ marginTop: "8px" }}>
                            <select
                                value={selectedAffiliation}
                                onChange={(e) => setSelectedAffiliation(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "16px",
                                    border: "2px solid var(--primary)",
                                    fontSize: "0.9rem",
                                    background: "white",
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}
                            >
                                {affiliationOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name} へ</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {onClose && (
                        <button
                            id="tutorial-post-close-btn"
                            onClick={onClose}
                            className="btn"
                            style={{
                                background: "rgba(0,0,0,0.05)",
                                width: "36px",
                                height: "36px",
                                padding: 0,
                                color: "var(--text-muted)",
                                fontSize: "1.2rem",
                                boxShadow: "none"
                            }}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div id="tutorial-mood-area" style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "20px",
                maxHeight: "220px",
                overflowY: "auto",
                padding: "8px",
                background: "rgba(0,0,0,0.02)",
                borderRadius: "var(--radius-md)"
            }}>
                {MOODS.map((mood) => (
                    <button
                        key={mood.label}
                        onClick={() => handleMoodSelect(mood)}
                        className="btn"
                        style={{
                            background: selectedMood.label === mood.label ? "var(--primary)" : "white",
                            border: "none",
                            borderRadius: "16px",
                            padding: "6px",
                            width: "52px",
                            height: "52px",
                            fontSize: "2rem",
                            boxShadow: selectedMood.label === mood.label ? "var(--shadow-md)" : "var(--shadow-sm)",
                            transform: selectedMood.label === mood.label ? "scale(1.1)" : "none"
                        }}
                        title={mood.label}
                    >
                        {mood.emoji}
                    </button>
                ))}
            </div>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="いまどうしてる？"
                style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid rgba(0,0,0,0.05)",
                    background: "rgba(0,0,0,0.01)",
                    minHeight: "100px",
                    marginBottom: "15px",
                    fontFamily: "inherit",
                    fontSize: "1.05rem",
                    outline: "none",
                    transition: "border-color 0.3s",
                    resize: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.05)"}
            />

            {/* Media Preview */}
            {previewUrl && (
                <div style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid #ddd", marginBottom: "15px" }}>
                    <button
                        onClick={clearFile}
                        style={{
                            position: "absolute", top: "5px", right: "5px",
                            background: "rgba(0,0,0,0.6)", color: "white",
                            border: "none", borderRadius: "50%",
                            width: "24px", height: "24px",
                            cursor: "pointer", zIndex: 10,
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                    >
                        ✕
                    </button>
                    <img src={previewUrl} alt="Preview" style={{ width: "100%", display: "block", maxHeight: "200px", objectFit: "contain", background: "#f0f0f0" }} />
                </div>
            )}

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {mediaUploadEnabled && (
                    <>
                        <input
                            id="hidden-file-input"
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => document.getElementById("hidden-file-input").click()}
                            className="btn"
                            style={{
                                background: "#f0f0f0",
                                color: "#555",
                                fontSize: "1.5rem",
                                padding: "10px 15px",
                                borderRadius: "12px"
                            }}
                            title="しゃしん・どうが"
                        >
                            📷
                        </button>
                    </>
                )}

                <button
                    id="tutorial-post-submit"
                    className="btn btn-primary"
                    onClick={handlePostClick}
                    disabled={isUploading}
                    style={{
                        flex: 1,
                        padding: "14px 32px",
                        fontSize: "1.1rem",
                        boxShadow: "0 8px 20px rgba(var(--primary-h), 100%, 70%, 0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                        opacity: isUploading ? 0.7 : 1
                    }}
                >
                    {isUploading ? "おくっています..." : "🚀 とうこうする"}
                </button>
            </div>

            <QuizModal
                isOpen={isQuizOpen}
                onClose={() => setIsQuizOpen(false)}
                onPass={() => {
                    setIsQuizOpen(false);
                    // Short timeout to allow modal close animation if needed, 
                    // but immediate is better for responsiveness. 
                    // We must ensure executePost runs.
                    setTimeout(executePost, 0);
                }}
                settings={quizSettings}
            />

            {showReward && (
                <RewardModal
                    show={showReward}
                    data={rewardData}
                    onClose={handleRewardClose}
                />
            )}
        </div>
    );
}

