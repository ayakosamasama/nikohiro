"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { hasPendingRequest, addRequest } from "../services/requestService";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { serverTimestamp } from "firebase/firestore";

export default function GameRequestModal({ isOpen, onClose }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [requestedToday, setRequestedToday] = useState(false);
    const [gameIdea, setGameIdea] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // New states
    const [requestType, setRequestType] = useState("new"); // 'new' or 'update'
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            if (user && isOpen) {
                setLoading(true);
                try {
                    const [hasPending, profile] = await Promise.all([
                        hasPendingRequest(user.uid),
                        getUserProfile(user.uid)
                    ]);

                    setProfileData(profile);
                    setPendingRequest(hasPending);

                    if (profile?.lastGameRequestDate) {
                        const lastDate = profile.lastGameRequestDate.toDate();
                        const now = new Date();
                        const isSameDay =
                            lastDate.getFullYear() === now.getFullYear() &&
                            lastDate.getMonth() === now.getMonth() &&
                            lastDate.getDate() === now.getDate();
                        setRequestedToday(isSameDay);
                    } else {
                        setRequestedToday(false);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchStatus();
    }, [user, isOpen]);

    const handleSubmit = async () => {
        if (!gameIdea.trim() || submitting || pendingRequest || requestedToday) return;
        setSubmitting(true);
        try {
            await addRequest(
                user.uid,
                profileData?.displayName || user.displayName || "ななし",
                user.email,
                requestType === "new" ? "ゲーム作成" : "ゲーム変更", // Use selected type
                gameIdea
            );

            await updateUserProfile(user.uid, { lastGameRequestDate: serverTimestamp() });

            alert("リクエストをおくったよ！\nつくってもらえるまで、すこし まっててね。");
            onClose();
            setGameIdea("");
        } catch (e) {
            console.error(e);
            alert("しっぱい しちゃった...");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2000,
            display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={onClose}>
            <div style={{
                background: "white", borderRadius: "25px", padding: "30px",
                width: "90%", maxWidth: "450px", textAlign: "center",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ color: "var(--primary)", marginBottom: "20px" }}>🎮 ゲームづくり</h2>

                {loading ? (
                    <p>読み込み中...</p>
                ) : (pendingRequest || requestedToday) ? (
                    <div style={{ padding: "20px" }}>
                        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>✨</div>
                        <h3 style={{ color: "#e67e22" }}>
                            {pendingRequest ? "さくせいちゅう" : "また こんど！"}
                        </h3>
                        <p>
                            {pendingRequest
                                ? "いま、きみのゲームを つくっているよ！\nかんせいするまで、たのしみに まっててね！"
                                : "きょうは もう リクエストしたよ！\nあした また おねがいしてね！"}
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                marginTop: "20px", background: "#eee", border: "none",
                                padding: "10px 30px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer"
                            }}
                        >
                            とじる
                        </button>
                    </div>
                ) : (
                    <>
                        <p style={{ textAlign: "left", fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
                            どんな おねがいを する？
                        </p>

                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                            <label style={{
                                flex: 1, padding: "10px", border: `2px solid ${requestType === "new" ? "var(--primary)" : "#ddd"}`,
                                borderRadius: "10px", cursor: "pointer", background: requestType === "new" ? "#fff5e6" : "white",
                                fontWeight: requestType === "new" ? "bold" : "normal"
                            }}>
                                <input
                                    type="radio" name="reqType" value="new"
                                    checked={requestType === "new"}
                                    onChange={() => setRequestType("new")}
                                    style={{ display: "none" }}
                                />
                                ✨ あたらしく<br />つくる
                            </label>

                            <label style={{
                                flex: 1, padding: "10px", border: `2px solid ${requestType === "update" ? "var(--primary)" : "#ddd"}`,
                                borderRadius: "10px", cursor: "pointer", background: requestType === "update" ? "#fff5e6" : "white",
                                fontWeight: requestType === "update" ? "bold" : "normal"
                            }}>
                                <input
                                    type="radio" name="reqType" value="update"
                                    checked={requestType === "update"}
                                    onChange={() => setRequestType("update")}
                                    style={{ display: "none" }}
                                />
                                🔧 もっと<br />よくする
                            </label>
                        </div>

                        <p style={{ textAlign: "left", fontSize: "0.9rem", color: "#666" }}>
                            アイデアを おしえてね！
                        </p>
                        <div style={{ marginBottom: "20px" }}>
                            <textarea
                                placeholder={requestType === "new" ? "どんなゲームにしたい？（例：おはなを クリックする ゲーム！）" : "どこを なおしてほしい？（例：もっと かんたんに してほしい！）"}
                                value={gameIdea}
                                onChange={(e) => setGameIdea(e.target.value)}
                                style={{
                                    width: "100%", height: "120px", padding: "15px",
                                    borderRadius: "15px", border: "2px solid #ddd", fontSize: "1rem",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={onClose}
                                style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#eee", fontWeight: "bold", cursor: "pointer" }}
                            >
                                やめる
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !gameIdea.trim()}
                                style={{
                                    flex: 2, padding: "12px", borderRadius: "12px", border: "none",
                                    backgroundColor: "var(--primary)", color: "white", fontWeight: "bold",
                                    cursor: "pointer", opacity: (submitting || !gameIdea.trim()) ? 0.7 : 1
                                }}
                            >
                                {submitting ? "おくっています..." : "おねがいする！"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
