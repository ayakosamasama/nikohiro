"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";
import { PETS, getPetImage, PET_MESSAGES, getNextLevelXP } from "../data/gameData";

export default function PetScreen() {
    const { user } = useAuth();
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [animation, setAnimation] = useState("");

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

    if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>読み込み中...</div>;

    if (!pet) {
        return (
            <div style={{ textAlign: "center", padding: "50px", color: "#666" }}>
                <div style={{ fontSize: "5rem", marginBottom: "20px" }}>🥚</div>
                <p>まだペットがいません。<br />たくさん投稿してタマゴをみつけよう！</p>
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
            height: "100%",
            padding: "20px"
        }}>
            {/* Speech Bubble */}
            <div
                onClick={changeMessage}
                style={{
                    background: "white",
                    padding: "15px 25px",
                    borderRadius: "30px",
                    border: "3px solid #333",
                    marginBottom: "20px",
                    position: "relative",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                    maxWidth: "80%",
                    animation: animation === "bounce" ? "bounce 0.5s" : "none"
                }}
            >
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem", color: "#333" }}>
                    {message}
                </p>
                {/* Bubble Triangle */}
                <div style={{
                    position: "absolute",
                    bottom: "-15px",
                    left: "50%",
                    marginLeft: "-10px",
                    width: 0,
                    height: 0,
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: "15px solid #333"
                }} />
                <div style={{
                    position: "absolute",
                    bottom: "-10px",
                    left: "50%",
                    marginLeft: "-7px",
                    width: 0,
                    height: 0,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderTop: "11px solid white"
                }} />
            </div>

            {/* Pet Image */}
            <div
                onClick={changeMessage}
                style={{
                    width: "250px",
                    height: "250px",
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    cursor: "pointer",
                    transition: "transform 0.1s"
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            />

            {/* Info */}
            <div style={{ marginTop: "20px", textAlign: "center" }}>
                <h2 style={{ margin: "0 0 10px 0", color: "#555" }}>{petName}</h2>
                <div style={{
                    background: "#f1c40f",
                    color: "white",
                    padding: "5px 20px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    fontSize: "1.5rem",
                    display: "inline-block",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                }}>
                    Lv.{pet.level}
                </div>
                <div style={{ marginTop: "10px", color: "#888", fontSize: "0.9rem" }}>
                    つぎのレベルまであとすこし！
                </div>
                <div style={{ marginTop: "5px", color: "#aaa", fontSize: "0.8rem" }}>
                    XP: {pet.xp || 0} / {getNextLevelXP(pet.level || 1)}
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
