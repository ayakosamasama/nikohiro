"use client";
import { useState } from "react";

export default function ReleaseNotesModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)", zIndex: 10001,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(5px)"
        }}>
            <div className="animate-pop" style={{
                backgroundColor: "white", padding: "30px", borderRadius: "24px",
                width: "90%", maxWidth: "500px",
                maxHeight: "85vh", overflowY: "auto",
                border: "4px solid var(--primary)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                color: "#333",
                position: "relative"
            }}>
                <h2 style={{ textAlign: "center", color: "var(--primary)", marginBottom: "20px", fontSize: "1.5rem", fontWeight: "900" }}>
                    🚀 アップデートのおしらせ
                </h2>

                <div style={{
                    backgroundColor: "#f9fcfd",
                    padding: "20px",
                    borderRadius: "20px",
                    fontSize: "0.95rem",
                    lineHeight: "1.7",
                    border: "1px solid #eef2f3",
                    marginBottom: "25px"
                }}>
                    <h4 style={{ color: "white", background: "var(--primary)", display: "inline-block", padding: "4px 12px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "15px" }}>v1.0.0-beta</h4>
                    <p style={{ fontWeight: "bold", color: "var(--text-main)", marginBottom: "15px" }}>「にこにこひろば」が あたらしくなったよ！</p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <section>
                            <h5 style={{ margin: "0 0 8px 0", color: "#2d3436", display: "flex", alignItems: "center", gap: "5px" }}>
                                💬 おはなし
                            </h5>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.9rem" }}>
                                <li>みんなの投稿をタイムラインで見れるよ！</li>
                                <li>「みたよ」「いいね」のスタンプでお返事しよう。</li>
                            </ul>
                        </section>

                        <section>
                            <h5 style={{ margin: "0 0 8px 0", color: "#2d3436", display: "flex", alignItems: "center", gap: "5px" }}>
                                🎮 ゲームづくり
                            </h5>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.9rem" }}>
                                <li>「こんなゲームがほしい！」ってリクエストしてね。</li>
                                <li>採用されたら、きみ専用のゲームができるよ。</li>
                            </ul>
                        </section>

                        <section>
                            <h5 style={{ margin: "0 0 8px 0", color: "#2d3436", display: "flex", alignItems: "center", gap: "5px" }}>
                                👑 ほかにも
                            </h5>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.9rem" }}>
                                <li>投稿するとXP（経験値）がたまってペットが育つよ！</li>
                                <li>投稿の前には、たのしいクイズも出るよ。</li>
                            </ul>
                        </section>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="btn btn-primary"
                    style={{
                        width: "100%",
                        padding: "16px",
                        fontSize: "1.2rem",
                        borderRadius: "16px",
                        boxShadow: "0 8px 20px rgba(var(--primary-h), 100%, 70%, 0.3)"
                    }}
                >
                    わかった！
                </button>

                <style jsx>{`
                    .animate-pop {
                        animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    @keyframes pop {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </div>
        </div>
    );
}
