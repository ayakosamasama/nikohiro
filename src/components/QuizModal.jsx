"use client";
import { useState, useEffect } from "react";
import { LANGUAGE_QUIZZES } from "../data/quizData";

export default function QuizModal({ isOpen, onClose, onPass, settings }) {
    const [currentQuiz, setCurrentQuiz] = useState({ q: "", a: 0 });
    const [solvedCount, setSolvedCount] = useState(0);
    const [quizAnswer, setQuizAnswer] = useState("");
    const targetCount = settings?.quizQuestionCount || 1;

    useEffect(() => {
        if (isOpen) {
            setSolvedCount(0);
            generateQuiz();
        }
    }, [isOpen]);

    const generateQuiz = () => {
        const types = settings?.types || [];
        const ops = settings?.operations || ["add"];
        const settingMax = settings?.maxAnswer || 10;
        const max = Math.min(settingMax, 99); // Hardcap at 99 for simplicity in UI if needed, but logic supports more.

        // Supported custom types
        const SUPPORTED_TYPES = ["shape_10frame", "shape_blocks", "lang_opposites", "lang_odd_one"];
        const validTypes = types.filter(t => SUPPORTED_TYPES.includes(t));

        // All possible quiz "logics"
        const availablePool = [];
        if (ops.length > 0) availablePool.push("arithmetic");
        validTypes.forEach(t => availablePool.push(t));

        // Default to arithmetic if pool is empty
        let selectedType = availablePool.length > 0
            ? availablePool[Math.floor(Math.random() * availablePool.length)]
            : "arithmetic";

        let q = "", a = "", choices = null, visual = null;

        // Loop once or twice to ensure q is not empty (fallback to arithmetic)
        for (let attempt = 0; attempt < 2; attempt++) {
            if (selectedType === "arithmetic") {
                const op = ops[Math.floor(Math.random() * ops.length)] || "add";
                if (op === "add") {
                    const total = Math.floor(Math.random() * (Math.max(2, max) - 1)) + 2;
                    const first = Math.floor(Math.random() * (total - 1)) + 1;
                    const second = total - first;
                    q = `${first} + ${second} = ?`;
                    a = total.toString();
                } else if (op === "sub") {
                    const first = Math.floor(Math.random() * (Math.max(2, max) - 1)) + 2;
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
                const count = Math.floor(Math.random() * 9) + 1;
                const remaining = 10 - count;
                q = "あと いくつで 10 になるかな？";
                a = remaining.toString();
                visual = { type: "10frame", count };
                choices = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
            }
            else if (selectedType === "shape_blocks") {
                const count = Math.floor(Math.random() * 5) + 3;
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

            if (q) break; // Success
            selectedType = "arithmetic"; // Fallback for next attempt
        }

        // Final safety fallback
        if (!q) {
            q = "1 + 1 = ?";
            a = "2";
        }

        setCurrentQuiz({ q, a, choices, visual });
        setQuizAnswer("");
    };

    const submitQuiz = (choiceValue = null) => {
        const answerToCheck = choiceValue !== null ? choiceValue : quizAnswer;
        // Loose equality check for string/number match
        if (answerToCheck.toString() === currentQuiz.a.toString()) {
            const nextCount = solvedCount + 1;
            if (nextCount >= targetCount) {
                onPass();
            } else {
                setSolvedCount(nextCount);
                // Simple animation or effect could be added here
                generateQuiz();
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

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000
        }}>
            <div className="animate-pop card" style={{ padding: "30px", textAlign: "center", width: "95%", maxWidth: "400px", border: "1px solid var(--glass-border)", background: "white", borderRadius: "20px" }}>
                <h3 style={{ marginBottom: "20px", color: "var(--primary)", fontSize: "1.4rem", fontWeight: "900" }}>
                    にこにこクイズ！
                    {targetCount > 1 && (
                        <div style={{ fontSize: "1rem", color: "#666", marginTop: "5px" }}>
                            だい {solvedCount + 1} もん <span style={{ fontSize: "0.8rem" }}>(ぜんぶで {targetCount} もん)</span>
                        </div>
                    )}
                </h3>

                <p style={{ fontSize: "1.4rem", fontWeight: "900", marginBottom: "15px" }}>{currentQuiz.q}</p>

                <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: "var(--radius-md)", padding: "10px", marginBottom: "20px" }}>
                    {renderQuizVisual()}
                </div>

                <div style={{ marginTop: "20px" }}>
                    {currentQuiz.choices ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            {currentQuiz.choices.map(choice => (
                                <button
                                    key={choice}
                                    className="btn"
                                    style={{
                                        background: "white",
                                        fontSize: "1.2rem",
                                        padding: "15px",
                                        border: "2px solid rgba(0,0,0,0.05)"
                                    }}
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
                                style={{
                                    padding: "15px",
                                    fontSize: "2rem",
                                    width: "140px",
                                    textAlign: "center",
                                    marginBottom: "25px",
                                    border: "3px solid var(--primary)",
                                    borderRadius: "15px",
                                    boxShadow: "var(--shadow-sm)",
                                    outline: "none"
                                }}
                                autoFocus
                            />
                            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                                <button className="btn" style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-muted)" }} onClick={onClose}>やめる</button>
                                <button className="btn btn-primary" onClick={() => submitQuiz()}>こたえる</button>
                            </div>
                        </>
                    )}
                </div>

                <button onClick={onClose} style={{ marginTop: "20px", background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer", fontSize: "0.9rem" }}>
                    やめる
                </button>
            </div>
        </div>
    );
}
