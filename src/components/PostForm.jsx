"use client";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { addPost } from "../services/postService";
import { useAuth } from "../context/AuthContext";
import { containsNgWord } from "../utils/safetyCheck";

const MOODS = [
    { emoji: "😊", label: "にこにこ", message: "きょうもにこにこ元気だよ！" },
    { emoji: "😆", label: "さいこう", message: "すっごくたのしい！さいこうの気分！" },
    { emoji: "🎉", label: "わくわく", message: "なにかいいことがありそう！わくわく！" },
    { emoji: "😲", label: "びっくり", message: "ええーっ！びっくりしたなぁ" },
    { emoji: "🤔", label: "ふむふむ", message: "なるほど…どうしてだろう？" },
    { emoji: "😢", label: "しくしく", message: "ちょっぴりかなしい気持ち…" },
    { emoji: "😭", label: "えーん", message: "悲しいことがあったの…えーん" },
    { emoji: "😡", label: "ぷんぷん", message: "もう！おこってるんだから！" },
    { emoji: "😤", label: "ふんっ", message: "ふんだ！文句ある？" },
    { emoji: "😴", label: "すやすや", message: "ふわぁ…眠くなってきたかも" },
    { emoji: "😷", label: "ぐったり", message: "ちょっと調子が悪いかも…" },
    { emoji: "😎", label: "きりっ", message: "かっこよく決めてみたよ！" },
    { emoji: "🥳", label: "おめでとう", message: "やったー！おめでとう！" },
    { emoji: "😱", label: "ガーン", message: "ショック！信じられない…" },
    { emoji: "🤗", label: "ぎゅっ", message: "仲良し！ぎゅーっとしたい気分" },
    { emoji: "😋", label: "ペロリ", message: "おいしそう！ペロリと食べちゃいたい" },
    { emoji: "😍", label: "だいすき", message: "目がハートになっちゃう！だいすき！" },
    { emoji: "😇", label: "てんし", message: "いいことして、やさしい気分" },
    { emoji: "🤪", label: "あっかんべー", message: "変な顔しちゃお！あっかんべー" },
    { emoji: "🤐", label: "ないしょ", message: "これはヒミツ！ナイショだよ" },
    { emoji: "🤒", label: "おねつ", message: "げんきないよー...お熱があるかも" },
    { emoji: "🤕", label: "いたい", message: "痛いよ〜...怪我しちゃった" },
    { emoji: "🤢", label: "きもちわるい", message: "ううっ...気持ち悪いかも" },
    { emoji: "🤧", label: "ハクション", message: "ハクション！風邪ひいたかな？" },
    { emoji: "🥵", label: "あつい", message: "ふぅ...今日は暑すぎるよ〜" },
    { emoji: "🥶", label: "さむい", message: "ブルブル...寒くて凍えそう" },
    { emoji: "🥺", label: "ぴえん", message: "ぴえん...かまってほしいな" },
    { emoji: "🤠", label: "カウボーイ", message: "冒険に出発だ！ヒヒーン！" },
    { emoji: "👽", label: "うちゅうじん", message: "ワレワレハ宇宙人ダ..." },
    { emoji: "🤖", label: "ロボット", message: "ウィーン...ガシャン...ロボットだよ" },
    { emoji: "👻", label: "おばけ", message: "うらめしや〜...おばけだぞ〜" },
    { emoji: "👍", label: "いい", message: "いいね！バッチリだよ！" },
    { emoji: "👎", label: "やだ", message: "うーん、それはちょっと違うかも" },
    { emoji: "👊", label: "パンチ", message: "やる気満々！負けないぞ！" },
    { emoji: "✌️", label: "ピース", message: "イェーイ！ピース！" },
    { emoji: "👋", label: "バイバイ", message: "またね！バイバーイ！" },
    { emoji: "💪", label: "パワー", message: "力がみなぎってきた！パワー！" },
    { emoji: "👐", label: "パァ", message: "パァ！明るい気分！" },
    { emoji: "🙌", label: "ばんざい", message: "やったー！ばんざーい！" },
    { emoji: "👏", label: "パチパチ", message: "すごいすごい！パチパチパチ！" },
    { emoji: "🙏", label: "おねがい", message: "神様仏様！おねがいします！" },
    { emoji: "👀", label: "じーっ", message: "じーっ...気になって見てるよ" },
    { emoji: "💋", label: "ちゅっ", message: "大好きのしるし！ちゅっ！" },
    { emoji: "💔", label: "ハートブレイク", message: "心が折れそう...ショック" },
    { emoji: "🎵", label: "ルンルン", message: "鼻歌歌っちゃう！ルンルン気分" },
    { emoji: "💩", label: "うんち", message: "うんち！...なんて言ってみたり" },
];

import { subscribeToNgWords } from "../services/adminService";
// ... imports

export default function PostForm({ userGroups = [] }) {
    const { user } = useAuth();
    const [text, setText] = useState("");
    const [selectedMood, setSelectedMood] = useState(MOODS[0]);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const [quizAnswer, setQuizAnswer] = useState("");
    const [currentQuiz, setCurrentQuiz] = useState({ q: "", a: 0 });
    const [name, setName] = useState("");
    const [quizSettings, setQuizSettings] = useState({ maxAnswer: 2, operations: ["add"] });

    // NG Words state
    const [ngWords, setNgWords] = useState([]);

    useEffect(() => {
        if (user) {
            const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
                if (doc.exists()) {
                    const profile = doc.data();

                    const newName = profile.displayName || (user.email ? user.email.split("@")[0] : "ゲスト");
                    setName(newName);

                    if (profile.quizSettings) {
                        setQuizSettings(profile.quizSettings);
                    }
                } else {
                    setName(user.email ? user.email.split("@")[0] : "ゲスト");
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    useEffect(() => {
        const unsub = subscribeToNgWords(setNgWords);
        return () => unsub();
    }, []);

    // ... existing profile useEffect

    const handlePostClick = () => {
        if (!text.trim()) return;

        // Safety check with dynamic list
        if (containsNgWord(text, ngWords)) {
            alert("「ちくちくことば」がつかわれているかもしれません。\nやさしいことばになおしてみよう！");
            return;
        }

        // Generate quiz based on settings
        generateQuiz();
    };

    const generateQuiz = () => {
        const ops = quizSettings?.operations?.length > 0 ? quizSettings.operations : ["add"];
        const settingMax = quizSettings?.maxAnswer || 2;
        // Ensure the answer (and operands) don't exceed 2 digits (99)
        const max = Math.min(settingMax, 99);

        // Retry logic to ensure valid question
        let q = "", a = 0;
        let isValid = false;
        let attempts = 0;

        while (!isValid && attempts < 10) {
            attempts++;
            const op = ops[Math.floor(Math.random() * ops.length)];

            if (op === "add") {
                const total = Math.floor(Math.random() * (max - 1)) + 2; // 2 to max
                const first = Math.floor(Math.random() * (total - 1)) + 1; // 1 to total-1
                const second = total - first;
                q = `${first} + ${second} = ?`;
                a = total;
                isValid = true;
            } else if (op === "sub") {
                const first = Math.floor(Math.random() * (max - 2)) + 2; // 2 to max
                const second = Math.floor(Math.random() * (first - 1)) + 1; // 1 to first-1
                q = `${first} - ${second} = ?`;
                a = first - second;
                isValid = true;
            } else if (op === "mul") {
                const first = Math.floor(Math.random() * 9) + 1; // 1-9
                const second = Math.floor(Math.random() * 9) + 1; // 1-9
                if (first * second <= max) {
                    q = `${first} × ${second} = ?`;
                    a = first * second;
                    isValid = true;
                }
            } else if (op === "div") {
                const ans = Math.floor(Math.random() * 9) + 1; // 1-9
                const devisor = Math.floor(Math.random() * 9) + 1; // 1-9
                const dividend = ans * devisor;
                if (dividend <= max) {
                    q = `${dividend} ÷ ${devisor} = ?`;
                    a = ans;
                    isValid = true;
                }
            }
        }

        // Fallback
        if (!isValid) {
            q = "1 + 1 = ?";
            a = 2;
        }

        setCurrentQuiz({ q, a });
        setQuizAnswer("");
        setIsQuizOpen(true);
    };

    const submitQuiz = async () => {
        if (parseInt(quizAnswer) === currentQuiz.a) {
            setIsQuizOpen(false);
            try {
                const postName = name || user.email.split("@")[0];
                const postIcon = user.photoURL || null; // Use Auth photoURL (which is synced) or null
                await addPost(user.uid, postName, postIcon, selectedMood, text, userGroups);
                setText("");
                setQuizAnswer("");
            } catch (error) {
                alert("とうこうできませんでした");
            }
        } else {
            alert("ざんねん！もういちどチャレンジしてね");
            setQuizAnswer("");
        }
    };

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        setText(mood.message);
    };

    return (
        <div style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, color: "#2d3436", fontSize: "1.1rem" }}>＼ きょうのきもちは？ ／</h3>
                <small style={{ color: "#b2bec3" }}>
                    こんにちは、{name}さん (Lv.{quizSettings.maxAnswer})
                </small>
            </div>

            <div id="tutorial-mood-area" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px", maxHeight: "200px", overflowY: "auto", padding: "4px" }}>
                {MOODS.map((mood) => (
                    <button
                        key={mood.label}
                        onClick={() => handleMoodSelect(mood)}
                        style={{
                            background: selectedMood.label === mood.label ? "var(--primary-light)" : "#f8f9fa",
                            border: selectedMood.label === mood.label ? "2px solid var(--primary)" : "2px solid transparent",
                            borderRadius: "12px",
                            padding: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "48px",
                            height: "48px",
                            fontSize: "1.6rem",
                            transition: "transform 0.1s"
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
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
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "2px solid #ddd",
                    minHeight: "80px",
                    marginBottom: "10px",
                    fontFamily: "inherit",
                    fontSize: "1rem"
                }}
            />

            <div style={{ textAlign: "right" }}>
                <button className="btn btn-primary" onClick={handlePostClick}>
                    とうこうする
                </button>
            </div>

            {isQuizOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
                }}>
                    <div style={{ background: "white", padding: "30px", borderRadius: "var(--radius-lg)", textAlign: "center", width: "90%", maxWidth: "350px" }}>
                        <span style={{ fontSize: "3rem", display: "block", marginBottom: "10px" }}>✏️</span>
                        <h3 style={{ marginBottom: "20px" }}>けいさんクイズ！</h3>
                        <p style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "20px" }}>{currentQuiz.q}</p>
                        <input
                            type="number"
                            value={quizAnswer}
                            onChange={(e) => setQuizAnswer(e.target.value)}
                            style={{ padding: "10px", fontSize: "1.2rem", width: "100px", textAlign: "center", marginBottom: "20px" }}
                            autoFocus
                        />
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button className="btn" style={{ background: "#ccc" }} onClick={() => setIsQuizOpen(false)}>やめる</button>
                            <button className="btn btn-primary" onClick={submitQuiz}>こたえる</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
