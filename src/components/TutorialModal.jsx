"use client";
import { useState, useEffect, useRef } from "react";

const TUTORIAL_STEPS = [
    {
        title: "ニコニコひろばへようこそ！",
        content: "アカウントの作成ありがとうございます。\nまずはアプリの使い方を一緒にやってみましょう。",
        emoji: "🎉",
        targetId: null
    },
    {
        title: "1. ユーザー設定",
        content: "まずは自分だけのアイコンや色を決めましょう。\n右上の「⚙️（歯車）」ボタンを押してみてください。",
        emoji: "⚙️",
        targetId: "tutorial-settings-btn",
        action: "click"
    },
    {
        title: "設定を閉じる",
        content: "設定が終わったら、「キャンセル」または「保存」ボタンで画面を閉じてください。\n（チュートリアルを進めるには「キャンセル」を押してください）",
        emoji: "✖️",
        targetId: "tutorial-settings-close-btn",
        action: "click"
    },
    {
        title: "2. グループ参加",
        content: "次はグループを探してみましょう。\n「🔍 さがす」ボタンを押して、興味のあるグループを見つけてください。",
        emoji: "👥",
        targetId: "tutorial-groups-tab",
        action: "click"
    },
    {
        title: "ひろばに戻る",
        content: "いろいろなグループが見つかりましたか？\n次は投稿をするために、「🏠 ひろば」ボタンを押して戻りましょう。",
        emoji: "🏠",
        targetId: "tutorial-home-tab",
        action: "click"
    },
    {
        title: "3. きもちを投稿する",
        content: "ひろばに戻ったら、右下の「✏️（えんぴつ）」ボタンを押して、今のきもちを書いてみましょう。",
        emoji: "✏️",
        targetId: "tutorial-post-fab",
        action: "click"
    },
    {
        title: "きもちをえらぶ",
        content: "ここで絵文字を選んだり、メッセージを書いたりできます。\n（※実際には投稿せずに次へ進みます）",
        emoji: "📝",
        targetId: "tutorial-mood-area",
        action: "next"
    },
    {
        title: "とじてみる",
        content: "一度、右上の「×」ボタンを押して画面を閉じてみましょう。",
        emoji: "✖️",
        targetId: "tutorial-post-close-btn",
        action: "click"
    },
    {
        title: "4. 保護者用管理機能",
        content: "保護者の方は、こちらの「おうちのひとへ」ボタンから管理画面へ入れます。\n活動の見守りやお問い合わせはここからです。",
        emoji: "🛡️",
        targetId: "tutorial-parent-btn",
        action: "click"
    },
    {
        title: "設定を閉じる",
        content: "保護者用設定へはパスワードがないと入れません。\n今は「キャンセル」を押して戻りましょう。",
        emoji: "🔙",
        targetId: "tutorial-parent-cancel-btn",
        action: "click"
    },
    {
        title: "準備完了！",
        content: "これでチュートリアルは終わりです。\nさあ、ニコニコひろばを楽しんでください！",
        emoji: "🌈",
        targetId: null
    }
];

export default function TutorialModal({ isOpen, onClose }) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState(null);

    // Reset step on open
    useEffect(() => {
        if (isOpen) {
            setStep(0);
        }
    }, [isOpen]);

    // Update highlight rect when step changes or window resizes
    useEffect(() => {
        const updateRect = () => {
            const currentStep = TUTORIAL_STEPS[step];
            if (currentStep?.targetId) {
                const el = document.getElementById(currentStep.targetId);
                if (el) {
                    const r = el.getBoundingClientRect();
                    setRect({
                        top: r.top - 5,
                        left: r.left - 5,
                        width: r.width + 10,
                        height: r.height + 10
                    });
                } else {
                    setRect(null);
                }
            } else {
                setRect(null);
            }
        };

        if (isOpen) {
            updateRect();
            window.addEventListener("resize", updateRect);
            // Polling for element appearance (in case of dynamic rendering)
            const interval = setInterval(updateRect, 500);
            return () => {
                window.removeEventListener("resize", updateRect);
                clearInterval(interval);
            };
        }
    }, [isOpen, step]);

    // Handle clicks on the target element
    useEffect(() => {
        const currentStep = TUTORIAL_STEPS[step];
        if (isOpen && currentStep?.action === "click" && currentStep.targetId) {
            const el = document.getElementById(currentStep.targetId);
            if (el) {
                const clickHandler = (e) => {
                    // Allow the default acton (e.g. opening modal)
                    // Wait a bit then advance
                    setTimeout(() => {
                        handleNext();
                    }, 500);
                };
                el.addEventListener("click", clickHandler);
                return () => el.removeEventListener("click", clickHandler);
            }
        }
    }, [isOpen, step]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < TUTORIAL_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem("nikohiro_tutorial_seen", "true");
        onClose();
    };

    const currentStep = TUTORIAL_STEPS[step];
    const isActionStep = currentStep.action === "click";

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 2000, pointerEvents: "none" // Let clicks pass through generally
        }}>
            {/* Backdrop / Dimmer */}
            {/* Implementation Check: pointer-events auto only on Next button or Modal box? 
                If we want user to click the Target, we shouldn't cover it.
                We can dim everything ELSE. Complex with CSS clip-path or multiple divs.
                Simpler: Just a modal box that doesn't block clicks, and a Highlight Box.
            */}

            {/* Highlight Box */}
            {rect && (
                <div style={{
                    position: "absolute",
                    top: rect.top, left: rect.left, width: rect.width, height: rect.height,
                    border: "4px solid #ff4757",
                    borderRadius: "8px",
                    boxShadow: "0 0 20px rgba(255, 71, 87, 0.6), 0 0 0 9999px rgba(0,0,0,0.5)", // Dim rest
                    pointerEvents: "none",
                    transition: "all 0.3s ease",
                    zIndex: 2001
                }}>
                    <div style={{
                        position: "absolute",
                        top: rect.top < 100 ? "auto" : "-45px",
                        bottom: rect.top < 100 ? "-45px" : "auto",
                        left: "50%", transform: "translateX(-50%)",
                        background: "#ff4757", color: "white", padding: "6px 12px", borderRadius: "20px",
                        fontWeight: "bold", fontSize: "0.9rem", whiteSpace: "nowrap",
                        animation: "bounce 1s infinite",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                    }}>
                        {rect.top < 100 ? "👆 ここを押してね！" : "👇 ここを押してね！"}
                    </div>
                </div>
            )}

            {/* If no rect (start/end), dim full screen */}
            {!rect && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    pointerEvents: "auto"
                }} />
            )}

            {/* Modal Content */}
            <div style={{
                position: "fixed",
                // If rect exists: position relative to it (pixels). If not: center of screen.
                top: rect ? (rect.top > window.innerHeight / 2 ? "auto" : `${rect.bottom + 20}px`) : "50%",
                bottom: rect ? (rect.top > window.innerHeight / 2 ? `${window.innerHeight - rect.top + 20}px` : "auto") : "auto",
                left: rect ? `${rect.left + rect.width / 2}px` : "50%",
                transform: "translateX(-50%)" + (rect ? "" : " translateY(-50%)"),
                background: "#ffffff",
                color: "#333333",
                padding: "25px",
                borderRadius: "20px",
                width: "85%",
                maxWidth: "400px",
                boxShadow: "0 10px 50px rgba(0,0,0,0.5)",
                pointerEvents: "auto",
                zIndex: 10002,
                transition: "all 0.3s ease"
            }}>
                <div style={{ textAlign: "center", marginBottom: "15px" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "5px" }}>{currentStep.emoji}</div>
                    <h2 style={{ color: "#2d3436", margin: "0 0 10px 0", fontSize: "1.2rem" }}>{currentStep.title}</h2>
                    <p style={{ color: "#636e72", lineHeight: "1.5", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                        {currentStep.content}
                    </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                        onClick={handleBack}
                        disabled={step === 0}
                        style={{
                            padding: "8px 16px", borderRadius: "8px", border: "none",
                            background: step === 0 ? "transparent" : "#f0f0f0",
                            color: step === 0 ? "transparent" : "#636e72",
                            cursor: step === 0 ? "default" : "pointer",
                            fontWeight: "600"
                        }}
                    >
                        戻る
                    </button>

                    {!isActionStep && (
                        <button
                            onClick={handleNext}
                            style={{
                                padding: "10px 24px", borderRadius: "10px", border: "none",
                                background: "var(--primary)", color: "white",
                                cursor: "pointer", fontWeight: "bold", fontSize: "1rem",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
                            }}
                        >
                            {step === TUTORIAL_STEPS.length - 1 ? "完了" : "次へ"}
                        </button>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
}
