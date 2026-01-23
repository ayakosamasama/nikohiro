"use client";
import { useState } from "react";

export default function ReportModal({ isOpen, onClose, onSubmit }) {
    const [reason, setReason] = useState("");
    const [customReason, setCustomReason] = useState("");

    if (!isOpen) return null;

    const reasons = [
        { id: "mean", label: "いじわるなことを言っている" },
        { id: "personal", label: "なまえやじゅうしょ（こじんじょうほう）" },
        { id: "bad_image", label: "へんながぞう・どうが" },
        { id: "spam", label: "そのほか（わるいこと）" }
    ];

    const handleSubmit = () => {
        if (!reason) {
            alert("りゆうをえらんでね");
            return;
        }
        const finalReason = reason === "spam" && customReason ? `その他: ${customReason}` : reasons.find(r => r.id === reason)?.label || reason;
        onSubmit(finalReason);
        // Reset
        setReason("");
        setCustomReason("");
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px"
        }}>
            <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "24px", animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
                <h3 style={{ margin: "0 0 20px 0", color: "var(--color-red)", textAlign: "center", fontSize: "1.2rem", fontWeight: "800" }}>
                    ⚠️ つうほうする
                </h3>
                <p style={{ textAlign: "center", marginBottom: "20px", color: "var(--text-main)" }}>
                    このとうこうに なにか もんだい がありましたか？<br />
                    りゆうを えらんで おしえてください。
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    {reasons.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setReason(r.id)}
                            style={{
                                padding: "12px",
                                borderRadius: "10px",
                                border: reason === r.id ? "2px solid var(--color-red)" : "2px solid #ddd",
                                background: reason === r.id ? "#fff5f5" : "white",
                                color: reason === r.id ? "var(--color-red)" : "var(--text-main)",
                                fontWeight: "bold",
                                cursor: "pointer",
                                textAlign: "left"
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {reason === "spam" && (
                    <textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="くわしいりゆう（かかなくてもいいよ）"
                        style={{
                            width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd",
                            marginBottom: "20px", fontSize: "0.9rem", minHeight: "60px"
                        }}
                    />
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={onClose} className="btn" style={{ flex: 1, background: "#f1f2f6", color: "#666" }}>
                        やめる
                    </button>
                    <button onClick={handleSubmit} className="btn" style={{ flex: 1, background: "var(--color-red)", color: "white" }}>
                        つうほうする
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
