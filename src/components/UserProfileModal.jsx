"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { PETS } from "../data/gameData";
import PetDisplay from "./PetDisplay";

export default function UserProfileModal({ userId, onClose }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPets, setShowPets] = useState(true);

    // Check viewer's settings
    useEffect(() => {
        const checkSettings = async () => {
            if (user) {
                try {
                    const viewerProfile = await getUserProfile(user.uid);
                    if (viewerProfile?.settings?.showPets !== undefined) {
                        setShowPets(viewerProfile.settings.showPets);
                    }
                } catch (e) {
                    console.error("Failed to load viewer settings", e);
                }
            }
        };
        checkSettings();
    }, [user]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            try {
                const data = await getUserProfile(userId);
                setProfile(data);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    if (!userId) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s"
        }} onClick={onClose}>
            <div style={{
                background: "white", borderRadius: "25px", padding: "30px",
                width: "90%", maxWidth: "400px", textAlign: "center",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                position: "relative"
            }} onClick={e => e.stopPropagation()}>

                <button
                    onClick={onClose}
                    style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#888" }}
                >
                    ✖
                </button>

                {loading ? (
                    <p>読み込み中...</p>
                ) : profile ? (
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{
                                width: "80px", height: "80px", borderRadius: "50%",
                                margin: "0 auto 15px", overflow: "hidden", border: "4px solid var(--primary)",
                                backgroundColor: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem"
                            }}>
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>
                            <h2 style={{ color: "var(--primary)", margin: 0 }}>{profile.displayName || "ななし"}</h2>
                            {profile.level && (
                                <span style={{ background: "#f1c40f", color: "white", padding: "3px 10px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "bold" }}>
                                    Lv.{profile.level}
                                </span>
                            )}
                        </div>

                        {showPets && (
                            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "20px" }}>
                                <div style={{ background: "#fff0f5", padding: "10px", borderRadius: "15px", width: "100%" }}>
                                    <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>ペット</h4>
                                    {profile.pet ? (
                                        <PetDisplay pet={profile.pet} size={80} />
                                    ) : (
                                        <div style={{ fontSize: "3rem", lineHeight: "80px" }}>🥚</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Optional: Add user group info if we want */}

                    </>
                ) : (
                    <p>ユーザーが見つかりませんでした</p>
                )}
            </div>
        </div>
    );
}
