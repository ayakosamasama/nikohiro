"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ProfileSettings from "./ProfileSettings";
import ParentSettings from "./ParentSettings";

export default function Header() {
    const { user, profile, isAdmin, logout } = useAuth();
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isParentSettingsOpen, setIsParentSettingsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 600);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <header id="app-header" className="glass" style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            padding: "0.5rem 1rem",
            color: "var(--text-main)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)",
            borderBottom: "1px solid var(--glass-border)",
            height: "60px"
        }}>
            {/* Logo (Emoji Fallback) */}
            <div
                onClick={() => router.push("/")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", fontSize: "1.8rem", lineHeight: 1 }}
            >
                <img src="/logo.png" alt="Nikohiro Logo" style={{ height: "40px", width: "auto" }} />
            </div>

            {user && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>

                    {/* Admin Button (Visible on ALL devices) */}
                    {isAdmin && (
                        <button
                            onClick={() => router.push("/admin")}
                            className="btn"
                            style={{
                                background: "var(--color-red)",
                                color: "white",
                                width: "38px",
                                height: "38px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.2rem",
                                borderRadius: "12px",
                                flexShrink: 0
                            }}
                            title="かんりしゃ"
                        >
                            💻
                        </button>
                    )}

                    {/* My Game Button (Visible on ALL devices) */}
                    {profile?.gameUrl && (
                        <button
                            onClick={() => window.open(profile.gameUrl, "_blank")}
                            className="btn"
                            style={{
                                background: "var(--color-purple)",
                                color: "white",
                                width: "38px",
                                height: "38px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.2rem",
                                borderRadius: "12px",
                                flexShrink: 0
                            }}
                            title="じぶんのゲーム"
                        >
                            🎮
                        </button>
                    )}

                    {/* PC View Buttons - Render conditionally to avoid duplicate IDs/hidden targets */}
                    {!isMobile && (
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                id="tutorial-parent-btn"
                                onClick={() => setIsParentSettingsOpen(true)}
                                className="btn"
                                style={{
                                    background: "rgba(0,0,0,0.05)",
                                    padding: "6px 12px",
                                    fontSize: "0.8rem",
                                    color: "var(--text-main)"
                                }}
                            >
                                おうちのひとへ
                            </button>
                        </div>
                    )}

                    {/* Settings / Profile Button (Common) */}
                    <button
                        id="tutorial-settings-btn"
                        onClick={() => setIsSettingsOpen(true)}
                        className="btn"
                        style={{
                            background: "white",
                            padding: "2px",
                            width: "38px",
                            height: "38px",
                            overflow: "hidden",
                            border: "2px solid var(--primary)",
                            borderRadius: "50%",
                            flexShrink: 0
                        }}
                        title="せってい"
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span style={{ fontSize: "1.2rem" }}>⚙️</span>
                        )}
                    </button>

                    <button
                        onClick={logout}
                        className="pc-only btn"
                        style={{
                            background: "rgba(0,0,0,0.05)",
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            color: "var(--text-muted)"
                        }}
                    >
                        ログアウト
                    </button>

                    {/* Mobile Menu Trigger */}
                    {isMobile && (
                        <button
                            id="tutorial-parent-btn" // Same ID for tutorial targeting
                            className="btn"
                            onClick={() => setIsParentSettingsOpen(true)}
                            style={{
                                background: "var(--primary)",
                                color: "white",
                                width: "38px",
                                height: "38px",
                                padding: 0,
                                borderRadius: "12px",
                                fontSize: "1.2rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}
                        >
                            🏠
                        </button>
                    )}

                    <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                    <ParentSettings isOpen={isParentSettingsOpen} onClose={() => setIsParentSettingsOpen(false)} />
                </div>
            )}

            <style jsx>{`
                @media (max-width: 600px) {
                    .pc-only { display: none !important; }
                }
                @media (min-width: 601px) {
                    .mobile-only { display: none !important; }
                }
            `}</style>
        </header>
    );
}
