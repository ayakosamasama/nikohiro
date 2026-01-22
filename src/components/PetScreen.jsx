"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { PETS, getPetImage, PET_MESSAGES, getNextLevelXP } from "../data/gameData";
import { releasePet } from "../services/gameService";

export default function PetScreen() {
    const { user } = useAuth();
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [animation, setAnimation] = useState("");
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);

    useEffect(() => {
        const fetchPet = async () => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile && profile.pet) {
                        setPet(profile.pet);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPet();
        changeMessage();
    }, [user]);

    const changeMessage = () => {
        const randomMsg = PET_MESSAGES[Math.floor(Math.random() * PET_MESSAGES.length)];
        setMessage(randomMsg);
        setAnimation("bounce");
        setTimeout(() => setAnimation(""), 500); // Reset animation class
    };

    const handleRelease = async () => {
        if (!user) return;
        try {
            await releasePet(user.uid);
            setPet(null);
            setIsReleaseModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("おわかれに しっぱい しました...");
        }
    };

    if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>よみこみちゅう...</div>;

    if (!pet) {
        return (
            <div style={{ textAlign: "center", padding: "50px", color: "#666" }}>
                <div style={{ fontSize: "5rem", marginBottom: "20px" }}>🥚</div>
                <p>まだ ペットが いません。<br />たくさん おはなしして タマゴを みつけよう！</p>
                <p style={{ fontSize: "0.9rem", color: "#888" }}>（※ペットは 1にちに 1かいだけ おおきくなるよ！）</p>
            </div>
        );
    }

    const imageUrl = getPetImage(pet.type, pet.level || 0);
    const petName = PETS[pet.type]?.name || "なぞのペット";

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            padding: "20px",
            height: "100%"
        }}>
            {/* Speech Bubble */}
            <div
                onClick={changeMessage}
                className="card"
                style={{
                    padding: "20px 30px",
                    borderRadius: "40px",
                    border: "none",
                    marginBottom: "30px",
                    position: "relative",
                    cursor: "pointer",
                    maxWidth: "85%",
                    background: "white",
                    animation: animation === "bounce" ? "bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
                    transformOrigin: "bottom center"
                }}
            >
                <p style={{ margin: 0, fontWeight: "900", fontSize: "1.3rem", color: "var(--text-main)", textAlign: "center", lineHeight: 1.4 }}>
                    {message}
                </p>
                {/* Bubble Tail */}
                <div style={{
                    position: "absolute",
                    bottom: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "12px solid transparent",
                    borderRight: "12px solid transparent",
                    borderTop: "12px solid white",
                    filter: "drop-shadow(0 4px 2px rgba(0,0,0,0.05))"
                }} />
            </div>

            {/* Pet Image */}
            <div
                onClick={changeMessage}
                style={{
                    width: "280px",
                    height: "280px",
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    cursor: "pointer",
                    transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s",
                    filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.1))"
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.9) rotate(-5deg)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />

            {/* Info Card */}
            <div className="card" style={{
                marginTop: "30px",
                textAlign: "center",
                width: "100%",
                maxWidth: "320px",
                padding: "20px",
                borderRadius: "var(--radius-lg)",
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(10px)"
            }}>
                <h2 style={{ margin: "0 0 15px 0", color: "var(--primary)", fontSize: "1.5rem", fontWeight: "900" }}>{petName}</h2>
                <div style={{
                    background: "var(--color-yellow)",
                    color: "var(--color-black)",
                    padding: "8px 24px",
                    borderRadius: "99px",
                    fontWeight: "900",
                    fontSize: "1.4rem",
                    display: "inline-block",
                    boxShadow: "var(--shadow-sm)",
                    marginBottom: "15px"
                }}>
                    Lv.{pet.level}
                </div>

                {/* XP Bar */}
                <div style={{ position: "relative", height: "12px", background: "rgba(0,0,0,0.05)", borderRadius: "6px", overflow: "hidden", margin: "10px 0" }}>
                    <div style={{
                        width: `${Math.min(100, (pet.xp / getNextLevelXP(pet.level || 1)) * 100)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--color-yellow), var(--color-orange))",
                        borderRadius: "6px",
                        transition: "width 0.5s ease"
                    }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "bold" }}>
                    <span>つぎのレベルまで</span>
                    <span>{pet.xp || 0} / {getNextLevelXP(pet.level || 1)} XP</span>
                </div>
            </div>

            <button
                onClick={() => setIsReleaseModalOpen(true)}
                style={{
                    marginTop: "20px",
                    background: "transparent",
                    border: "1px solid #ddd",
                    color: "#999",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.target.style.borderColor = "#ff4757"; e.target.style.color = "#ff4757"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#ddd"; e.target.style.color = "#999"; }}
            >
                ペットとおわかれをする
            </button>

            {isReleaseModalOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", justifyContent: "center", alignItems: "center",
                    zIndex: 2000,
                    backdropFilter: "blur(2px)"
                }}>
                    <div style={{
                        background: "white", padding: "30px", borderRadius: "20px",
                        width: "85%", maxWidth: "350px", textAlign: "center",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    }}>
                        <div style={{ fontSize: "3rem", marginBottom: "10px" }}>😢</div>
                        <h3 style={{ color: "var(--text-main)", marginBottom: "15px", fontSize: "1.2rem" }}>ほんとうに おわかれする？</h3>
                        <p style={{ marginBottom: "25px", color: "#666", fontSize: "0.9rem", lineHeight: "1.6" }}>
                            おわかれすると、レベルも 0 になります。<br />
                            <span style={{ fontSize: "0.8rem", color: "#999" }}>（コレクションは のこるよ！）</span>
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button onClick={() => setIsReleaseModalOpen(false)} style={{
                                padding: "12px 20px", borderRadius: "12px", border: "none",
                                background: "#f0f0f0", color: "#555", fontWeight: "bold", cursor: "pointer", flex: 1
                            }}>やめる</button>
                            <button onClick={handleRelease} style={{
                                padding: "12px 20px", borderRadius: "12px", border: "none",
                                background: "#ff4757", color: "white", fontWeight: "bold", cursor: "pointer", flex: 1
                            }}>バイバイする</button>
                        </div>
                    </div>

                </div>
            )}

            <style jsx>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-15px) scale(1.02); }
                }
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
