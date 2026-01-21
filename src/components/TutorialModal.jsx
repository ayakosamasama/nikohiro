"use client";
import { useState, useEffect, useRef } from "react";

const TUTORIAL_STEPS = [
    {
        title: "ようこそ！(保護者の方へ)",
        content: "ニコニコひろばへようこそ。\nまずはじめに、お子様が安全に利用できるように設定を行いましょう。",
        emoji: "👋",
        targetId: null
    },
    {
        title: "1. 保護者設定を開く",
        content: "画面上の「おうちのひとへ」ボタンを押してください。\nここから管理画面へアクセスできます。",
        emoji: "👨‍👩‍👧‍👦",
        targetId: "tutorial-parent-btn",
        action: "click",
        position: "bottom"
    },
    {
        title: "2. パスワード入力",
        content: "初期パスワード「2525」を入力して、「OK」を押してください。",
        emoji: "🔐",
        targetId: "tutorial-parent-login-btn",
        action: "click",
        position: "bottom"
    },
    {
        title: "3. 各種設定について",
        content: "ここではクイズの難易度や、利用時間、パスワードの変更などができます。\nお子様の成長に合わせて調整してください。",
        emoji: "⚙️",
        targetId: "tutorial-tab-quiz",
        action: "next"
    },
    {
        title: "4. 所属の設定",
        content: "次に、「所属」タブを押してください。\nここでお子様の通っているスクールや園を選択します。",
        emoji: "🏫",
        targetId: "tutorial-tab-affiliation",
        action: "click"
    },
    {
        title: "5. 保存する",
        content: "所属を選んだら、一番下の「設定を保存する」ボタンを押してください。",
        emoji: "💾",
        targetId: "tutorial-save-affiliation-btn",
        action: "click",
        position: "viewport-top"
    },
    {
        title: "バトンタッチ！",
        content: "これで保護者設定は完了です。\nここからは、お子様と一緒に操作してみてください！",
        emoji: "🤝",
        targetId: null
    },
    {
        title: "6. プロフィール設定",
        content: "まずは、じぶんだけの アイコンや いろを きめよう！\n「⚙️（歯車）」ボタンを おしてみてね。",
        emoji: "🎨",
        targetId: "tutorial-settings-btn",
        action: "click",
        position: "bottom"
    },
    {
        title: "7. アイコンをえらぶ",
        content: "すきな アイコンを えらんで、「OK」ボタンを おしてね。",
        emoji: "🖼️",
        targetId: "tutorial-settings-save-btn",
        action: "click"
    },
    {
        title: "8. グループをさがそう",
        content: "「さがす」ボタンを おして、みんなが いる グループに はいってみよう！",
        emoji: "🔍",
        targetId: "tutorial-groups-tab",
        action: "click"
    },
    {
        title: "9. ひろばに もどろう",
        content: "「ひろば」ボタンを おして、みんなの いる ばしょに もどろう！",
        emoji: "🏠",
        targetId: "tutorial-home-tab",
        action: "click"
    },
    {
        title: "10. きもちを かいてみよう",
        content: "「えんぴつ」ボタンで、いまの きもちを とうこう してみよう。\nスタンプも おせるよ！",
        emoji: "✏️",
        targetId: "tutorial-post-fab",
        action: "click"
    },
    {
        title: "11. きもちを えらぼう",
        content: "まずは、いまの きぶんを えらんでね。\nそのあと、メッセージを かけるよ！",
        emoji: "🤔",
        targetId: "tutorial-mood-area",
        action: "next",
        position: "bottom"
    },
    {
        title: "12. とうこうする",
        content: "きもちを かいたら、「とうこうする」ボタンを おしてね。",
        emoji: "✉️",
        targetId: "tutorial-post-submit",
        action: "click",
        position: "top"
    },
    {
        title: "13. ペットと あそぼう",
        content: "とうこうすると、ペットが よろこぶよ！\n「ペット」タブを おして、ようすを みてみてね。",
        emoji: "🐶",
        targetId: "tutorial-pet-tab",
        action: "next"
    },
    {
        title: "じゅんび かんりょう！",
        content: "これで ぜんぶ おわり！\nニコニコひろばを たのしんでね！",
        emoji: "🎉",
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
                    // Only scroll if we haven't computed rect for this step yet to avoid jitter
                    // OR strict logic: check visibility? 
                    // Simple check: if step changed.
                    // But we don't have previous step ref here easily in this effect.
                    // Let's just do it. But updateRect runs every 100ms. Jitter risk.
                    // Better to put scroll logic in the step-change effect.
                    const r = el.getBoundingClientRect();
                    // Ensure rect is valid (visible)
                    if (r.width > 0 || r.height > 0) {
                        setRect({
                            top: r.top - 5,
                            left: r.left - 5,
                            width: r.width + 10,
                            height: r.height + 10,
                            bottom: r.bottom + 5 // Store real bottom for calculation
                        });
                    } else {
                        setRect(null);
                    }
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
            const interval = setInterval(updateRect, 100);
            return () => {
                window.removeEventListener("resize", updateRect);
                clearInterval(interval);
            };
        }
    }, [isOpen, step]);

    // Handle clicks on the target element
    useEffect(() => {
        const currentStep = TUTORIAL_STEPS[step];
        if (isOpen && currentStep?.targetId) {
            // Scroll attempt
            const el = document.getElementById(currentStep.targetId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

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
                        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                        pointerEvents: "none"
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
                // Dynamic Logic: Place strictly Above or Below the target rect
                ...(rect ? (
                    // 1. Explicit priority: if position is set, use it.
                    (currentStep.position === "viewport-top") ? { top: "80px", bottom: "auto" } :
                        (currentStep.position === "bottom") ? { top: `${rect.bottom + 20}px`, bottom: "auto" } :
                            (currentStep.position === "top") ? { top: "auto", bottom: `${window.innerHeight - rect.top + 20}px` } :
                                // 2. Auto calculated: if target is in bottom half, show on top.
                                (rect.top > window.innerHeight / 2) ? { top: "auto", bottom: `${window.innerHeight - rect.top + 20}px` }
                                    // 3. Default: show below
                                    : { top: `${rect.bottom + 20}px`, bottom: "auto" }
                ) : (
                    (currentStep.position === "top") ? { top: "50px", bottom: "auto" } :
                        { top: "auto", bottom: "50px" }
                )), // Default to bottom if no rect
                left: "50%",
                transform: "translateX(-50%)",
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
