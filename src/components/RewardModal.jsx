"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { adoptPet } from "../services/gameService";

export default function RewardModal({ show, data, onClose }) {
    if (!show || !data) return null;

    const { user } = useAuth();
    const { petXPGained, eggFound, potentialPetId, levelUp, newLevel } = data;
    const [step, setStep] = useState("reward"); // reward -> egg -> adopted
    const [adopting, setAdopting] = useState(false);

    useEffect(() => {
        if (show) {
            setStep("reward");
        }
    }, [show]);

    const handleAdopt = async () => {
        if (!user || !potentialPetId) return;
        setAdopting(true);
        try {
            await adoptPet(user.uid, potentialPetId);
            setStep("adopted");
        } catch (error) {
            console.error("Failed to adopt", error);
        } finally {
            setAdopting(false);
        }
    };

    const handleInitialClose = () => {
        if (eggFound && step === "reward") {
            setStep("egg");
        } else {
            onClose();
        }
    };


    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)", zIndex: 2000,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.3s"
        }}>
            <div style={{
                background: "white", padding: "30px", borderRadius: "20px",
                textAlign: "center", maxWidth: "400px", width: "90%",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                animation: "popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}>

                {step === "reward" && (
                    <>
                        {levelUp && (
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🆙</div>
                                <h2 style={{ color: "#e67e22", margin: 0, fontSize: "1.8rem" }}>レベルアップ！</h2>
                                <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>ペットが Lv.{newLevel} になったよ！</p>
                            </div>
                        )}

                        {!levelUp && (
                            <div style={{ marginBottom: "20px" }}>
                                <h2 style={{ color: "#27ae60", margin: 0 }}>とうこうありがとう！</h2>
                            </div>
                        )}

                        <div style={{ margin: "20px 0", padding: "15px", background: "#f8f9fa", borderRadius: "15px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "1.5rem", marginBottom: "10px" }}>
                                <span>🐾</span>
                                <span style={{ fontWeight: "bold", color: "#f39c12" }}>+{petXPGained} XP</span>
                            </div>
                        </div>

                        <button
                            onClick={handleInitialClose}
                            style={{
                                background: "var(--primary)", color: "white", border: "none",
                                padding: "12px 30px", borderRadius: "50px", fontSize: "1.2rem",
                                fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 0 #d35400",
                                transition: "transform 0.1s"
                            }}
                        >
                            {eggFound ? "ん？" : "やったね！"}
                        </button>
                    </>
                )}

                {step === "egg" && (
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "4rem", animation: "bounce 2s infinite" }}>🥚</div>
                            <h2 style={{ color: "#e67e22", margin: "10px 0" }}>タマゴをはっけん！</h2>
                            <p>あたらしいタマゴをみつけたよ！<br />そだててみる？</p>
                            <p style={{ fontSize: "0.8rem", color: "red" }}>※いまのペットとはおわかれになります</p>
                        </div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                                onClick={onClose}
                                style={{
                                    background: "#ccc", color: "white", border: "none",
                                    padding: "10px 20px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer"
                                }}
                            >
                                そのままにする
                            </button>
                            <button
                                onClick={handleAdopt}
                                disabled={adopting}
                                style={{
                                    background: "var(--primary)", color: "white", border: "none",
                                    padding: "10px 20px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer",
                                    boxShadow: "0 4px 0 #d35400"
                                }}
                            >
                                {adopting ? "..." : "そだてる！"}
                            </button>
                        </div>
                    </>
                )}

                {step === "adopted" && (
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "4rem" }}>🎉</div>
                            <h2 style={{ color: "#27ae60", margin: "10px 0" }}>おめでとう！</h2>
                            <p>あたらしいパートナーだよ！<br />たくさんかわいがってね！</p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: "var(--primary)", color: "white", border: "none",
                                padding: "12px 30px", borderRadius: "50px", fontSize: "1.2rem",
                                fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 0 #d35400"
                            }}
                        >
                            OK
                        </button>
                    </>
                )}
            </div>


        </div>
    );
}
