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

export default function PostForm({ userGroups = [], onClose, onSuccess }) {
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
        const types = quizSettings?.types || [];
        const ops = quizSettings?.operations || ["add"];
        const settingMax = quizSettings?.maxAnswer || 10;
        const max = Math.min(settingMax, 99);

        // All possible quiz "logics"
        const availablePool = [];
        if (ops.length > 0) availablePool.push("arithmetic");
        types.forEach(t => availablePool.push(t));

        // Default to arithmetic if pool is empty
        const selectedType = availablePool.length > 0
            ? availablePool[Math.floor(Math.random() * availablePool.length)]
            : "arithmetic";

        let q = "", a = "", choices = null, visual = null;

        if (selectedType === "arithmetic") {
            const op = ops[Math.floor(Math.random() * ops.length)] || "add";
            if (op === "add") {
                const total = Math.floor(Math.random() * (max - 1)) + 2;
                const first = Math.floor(Math.random() * (total - 1)) + 1;
                const second = total - first;
                q = `${first} + ${second} = ?`;
                a = total.toString();
            } else if (op === "sub") {
                const first = Math.floor(Math.random() * (max - 1)) + 2;
                const second = Math.floor(Math.random() * (first - 1)) + 1;
                q = `${first} - ${second} = ?`;
                a = (first - second).toString();
            } else if (op === "mul") {
                const first = Math.floor(Math.random() * 9) + 1;
                const second = Math.floor(Math.random() * 9) + 1;
                q = `${first} × ${second} = ?`;
                a = (first * second).toString();
            } else if (op === "div") {
                const ans = Math.floor(Math.random() * 9) + 1;
                const devisor = Math.floor(Math.random() * 9) + 1;
                q = `${ans * devisor} ÷ ${devisor} = ?`;
                a = ans.toString();
            }
        }
        else if (selectedType === "shape_10frame") {
            const count = Math.floor(Math.random() * 9) + 1; // 1-9
            const remaining = 10 - count;
            q = "あと いくつで 10 になるかな？";
            a = remaining.toString();
            visual = { type: "10frame", count };
            choices = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
        }
        else if (selectedType === "shape_blocks") {
            const count = Math.floor(Math.random() * 5) + 3; // 3-7
            q = "つみきは ぜんぶで いくつあるかな？";
            a = count.toString();
            visual = { type: "blocks", count };
            choices = ["3", "4", "5", "6", "7", "8"];
        }
        else if (selectedType === "lang_opposites") {
            const list = LANGUAGE_QUIZZES.opposites;
            const pick = list[Math.floor(Math.random() * list.length)];
            q = pick.q; a = pick.a; choices = pick.c;
        }
        else if (selectedType === "lang_odd_one") {
            const list = LANGUAGE_QUIZZES.oddOneOut;
            const pick = list[Math.floor(Math.random() * list.length)];
            q = pick.q; a = pick.a; choices = pick.c;
        }

        setCurrentQuiz({ q, a, choices, visual });
        setQuizAnswer("");
        setIsQuizOpen(true);
    };

    const submitQuiz = async (choiceValue = null) => {
        const answerToCheck = choiceValue !== null ? choiceValue : quizAnswer;
        if (answerToCheck.toString() === currentQuiz.a.toString()) {
            setIsQuizOpen(false);
            try {
                const postName = name || (user.email ? user.email.split("@")[0] : "ゲスト");
                const postIcon = user.photoURL || null;
                await addPost(user.uid, postName, postIcon, selectedMood, text, userGroups);
                setText("");
                setQuizAnswer("");
                if (onSuccess) onSuccess();
            } catch (error) {
                alert("とうこうできませんでした");
            }
        } else {
            alert("ざんねん！もういちどチャレンジしてね");
            setQuizAnswer("");
        }
    };

    const renderQuizVisual = () => {
        if (!currentQuiz.visual) return null;
        const { type } = currentQuiz.visual;

        if (type === "10frame") {
            const dots = [];
            for (let i = 0; i < 10; i++) {
                dots.push(i < currentQuiz.visual.count);
            }
            return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "5px", background: "#f0f0f0", padding: "10px", borderRadius: "8px", margin: "10px auto" }}>
                    {dots.map((isFilled, idx) => (
                        <div key={idx} style={{ width: "30px", height: "30px", borderRadius: "50%", background: isFilled ? "var(--primary)" : "white", border: "2px solid #ddd" }}></div>
                    ))}
                </div>
            );
        }

        if (type === "blocks") {
            return (
                <div style={{ fontSize: "2rem", margin: "10px 0" }}>
                    {"🟥".repeat(currentQuiz.visual.count)}
                </div>
            );
        }
        return null;
    };

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        setText(mood.message);
    };

    return (
        <div style={{ background: "white", padding: "20px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, color: "#2d3436", fontSize: "1.1rem" }}>＼ きょうのきもちは？ ／</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <small style={{ color: "#b2bec3" }}>
                        Lv.{quizSettings.maxAnswer}
                    </small>
                    {onClose && (
                        <button
                            id="tutorial-post-close-btn"
                            onClick={onClose}
                            style={{ background: "#f0f0f0", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#636e72" }}
                        >
                            ×
                        </button>
                    )}
                </div>
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
                    <div style={{ background: "white", padding: "25px", borderRadius: "25px", textAlign: "center", width: "95%", maxWidth: "380px", boxShadow: "0 15px 50px rgba(0,0,0,0.3)" }}>
                        <h3 style={{ marginBottom: "15px", color: "var(--primary)" }}>にこにこクイズ！</h3>

                        <p style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "10px" }}>{currentQuiz.q}</p>

                        {renderQuizVisual()}

                        <div style={{ marginTop: "20px" }}>
                            {currentQuiz.choices ? (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    {currentQuiz.choices.map(choice => (
                                        <button
                                            key={choice}
                                            className="btn"
                                            style={{ background: "#f8f9fa", border: "2px solid #eee", fontSize: "1.1rem", padding: "12px" }}
                                            onClick={() => submitQuiz(choice)}
                                        >
                                            {choice}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="number"
                                        value={quizAnswer}
                                        onChange={(e) => setQuizAnswer(e.target.value)}
                                        style={{ padding: "12px", fontSize: "1.5rem", width: "120px", textAlign: "center", marginBottom: "20px", border: "2px solid var(--primary)", borderRadius: "10px" }}
                                        autoFocus
                                    />
                                    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                                        <button className="btn" style={{ background: "#ccc" }} onClick={() => setIsQuizOpen(false)}>やめる</button>
                                        <button className="btn btn-primary" onClick={() => submitQuiz()}>こたえる</button>
                                    </div>
                                </>
                            )}
                        </div>

                        {currentQuiz.choices && (
                            <button onClick={() => setIsQuizOpen(false)} style={{ marginTop: "15px", background: "none", border: "none", color: "#666", textDecoration: "underline", cursor: "pointer" }}>やめる</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
