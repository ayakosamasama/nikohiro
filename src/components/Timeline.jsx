"use client";
import { useEffect, useState } from "react";
import { subscribeToPosts, toggleReaction } from "../services/postService";
import { useAuth } from "../context/AuthContext";
import UserProfileModal from "./UserProfileModal";

const STAMPS = [
    { id: "like", emoji: "👍", label: "いいね！" },
    { id: "love", emoji: "❤️", label: "だいすき" },
    { id: "awesome", emoji: "🎉", label: "すごい" },
    { id: "surprised", emoji: "😲", label: "びっくり" },
    { id: "sad", emoji: "😢", label: "かなしい" },
    { id: "yay", emoji: "🙌", label: "わーい" },
];

export default function Timeline({ filterMode = "all", userGroups = [], selectedGroupId = null }) {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 600);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToPosts(user.affiliationId || "default", (newPosts) => {
            const filtered = newPosts.filter(post => {
                if (filterMode === "all") return true;
                if (filterMode === "friends") {
                    if (!post.userGroups || post.userGroups.length === 0) return false;
                    return post.userGroups.some(gId => userGroups.includes(gId));
                }
                if (filterMode === "group" && selectedGroupId) {
                    return post.userGroups?.includes(selectedGroupId);
                }
                return true;
            });
            setPosts(filtered);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [filterMode, userGroups, selectedGroupId, user]);

    if (loading) return <p style={{ textAlign: "center", padding: "20px" }}>よみこみ中...</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "20px" }}>
            {posts.map((post, idx) => (
                <div key={post.id}
                    className="card animate-slide"
                    style={{
                        animationDelay: `${idx * 0.1}s`,
                        display: "flex",
                        gap: isMobile ? "10px" : "18px",
                        alignItems: "flex-start",
                        position: "relative",
                        overflow: "hidden",
                        padding: isMobile ? "12px" : "20px" // Assuming 'card' class has padding, we might override it or just rely on inline if card class is simple. 
                        // Note: 'card' usually implies padding. If it's a global class, inline padding might be needed to shrink it.
                        // Let's assume global css defines padding. I will add padding here to override if needed, or rely on internal spacing.
                        // Actually, looking at the code, standard 'card' class usually has padding. I'll check if I can override it via style prop if it's set in CSS. 
                        // If 'card' isn't viewed, I'll assume I can set padding.
                    }}>

                    {/* Mood Gradient Accent */}
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: "6px",
                        backgroundColor: "var(--primary)"
                    }} />

                    <div
                        onClick={() => setSelectedUserId(post.userId)}
                        className="btn"
                        style={{
                            width: isMobile ? "40px" : "56px",
                            height: isMobile ? "40px" : "56px",
                            borderRadius: "50%",
                            backgroundColor: "white", overflow: "hidden", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: isMobile ? "1.5rem" : "2.2rem",
                            padding: 0,
                            border: "3px solid white",
                            boxShadow: "var(--shadow-md)"
                        }}
                    >
                        {post.userIcon ? (
                            <img src={post.userIcon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span>{post.mood?.emoji || "👤"}</span>
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: isMobile ? "4px" : "8px" }}>
                            <span style={{ fontWeight: "900", fontSize: isMobile ? "1rem" : "1.15rem", color: "var(--text-main)" }}>
                                {post.userName || "ななし"}
                            </span>
                            <span style={{ fontSize: isMobile ? "0.75rem" : "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
                                {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "いま"}
                            </span>
                        </div>

                        <div style={{
                            backgroundColor: "hsl(var(--primary-h), 100%, 96%)",
                            padding: isMobile ? "2px 8px" : "4px 12px",
                            borderRadius: "10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: isMobile ? "6px" : "12px"
                        }}>
                            <span style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>{post.mood?.emoji}</span>
                            <span style={{ color: "var(--primary)", fontSize: isMobile ? "0.8rem" : "0.85rem", fontWeight: "700" }}>{post.mood?.label}</span>
                        </div>

                        <p style={{
                            lineHeight: "1.5",
                            fontSize: isMobile ? "0.95rem" : "1.05rem",
                            whiteSpace: "pre-wrap",
                            color: "var(--text-main)",
                            marginBottom: isMobile ? "8px" : "12px"
                        }}>{post.text}</p>

                        {/* Stamps Section */}
                        <div style={{ display: "flex", gap: isMobile ? "4px" : "8px", flexWrap: "wrap", marginTop: isMobile ? "8px" : "16px" }}>
                            {STAMPS.map(stamp => {
                                const reactions = post.reactions || {};
                                const userIds = reactions[stamp.id] || [];
                                const count = userIds.length;
                                const isReacted = user && userIds.includes(user.uid);

                                return (
                                    <button
                                        key={stamp.id}
                                        onClick={() => user && toggleReaction(post.id, user.uid, stamp.id)}
                                        className="btn"
                                        style={{
                                            background: isReacted ? "var(--color-pink)" : "white",
                                            border: isReacted ? "2px solid var(--color-pink)" : "2px solid #f1f2f6",
                                            borderRadius: "16px",
                                            padding: isMobile ? "4px 8px" : "6px 12px",
                                            fontSize: isMobile ? "1rem" : "1.2rem",
                                            boxShadow: isReacted ? "var(--shadow-sm)" : "none",
                                            minWidth: isMobile ? "40px" : "50px"
                                        }}
                                    >
                                        <span>{stamp.emoji}</span>
                                        {count > 0 && (
                                            <span style={{
                                                fontSize: "0.9rem",
                                                color: isReacted ? "white" : "var(--text-muted)",
                                                fontWeight: "800",
                                                marginLeft: "4px"
                                            }}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}

            {selectedUserId && (
                <UserProfileModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </div>
    );
}
