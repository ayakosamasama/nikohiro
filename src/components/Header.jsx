"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileSettings from "./ProfileSettings";
import ParentSettings from "./ParentSettings";

export default function Header() {
    const { user, profile, isAdmin, logout } = useAuth();
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isParentSettingsOpen, setIsParentSettingsOpen] = useState(false);

    return (
        <header style={{
            backgroundColor: "var(--primary)",
            padding: "1rem",
            boxShadow: "var(--shadow-md)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>にこにこひろば</h1>
            {user && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        id="tutorial-parent-btn"
                        onClick={() => setIsParentSettingsOpen(true)}
                        style={{
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.4)",
                            color: "white",
                            padding: "5px 10px",
                            borderRadius: "15px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            whiteSpace: "nowrap"
                        }}
                    >
                        おうちのひとへ
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => router.push("/admin")}
                            style={{
                                background: "var(--color-red)",
                                border: "none",
                                color: "white",
                                padding: "8px 12px",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                fontWeight: "bold"
                            }}
                        >
                            管理者
                        </button>
                    )}
                    <button
                        id="tutorial-settings-btn"
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            background: "rgba(255,255,255,0.2)",
                            border: "none",
                            color: "white",
                            padding: "5px",
                            borderRadius: "50%",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyItems: "center",
                            width: "40px", height: "40px", overflow: "hidden"
                        }}
                        title="せってい"
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span style={{ fontSize: "1.2rem" }}>⚙️</span>
                        )}
                    </button>
                    {profile?.gameUrl && (
                        <button
                            onClick={() => window.open(profile.gameUrl, "_blank")}
                            style={{
                                background: "#9b59b6",
                                border: "none",
                                color: "white",
                                padding: "5px 15px",
                                borderRadius: "15px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                            }}
                        >
                            <span>🎮</span> じぶんのゲーム
                        </button>
                    )}
                    <button
                        onClick={logout}
                        style={{
                            background: "rgba(255,255,255,0.2)",
                            border: "none",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        ログアウト
                    </button>
                    <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                    <ParentSettings isOpen={isParentSettingsOpen} onClose={() => setIsParentSettingsOpen(false)} />
                </div>
            )
            }
        </header >
    );
}
