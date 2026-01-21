"use client";
import { useEffect, useState } from "react";
import { subscribeToPosts, toggleReaction } from "../services/postService";
import { useAuth } from "../context/AuthContext";
import UserProfileModal from "./UserProfileModal";

const STAMPS = [
    { id: "like", emoji: "👍", label: "いい音！" }, // Typo intentional? "Inne!" Good sound? Probably "Good job" いいね
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
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {posts.map((post) => (
                <div key={post.id} style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "15px",
                    marginBottom: "15px",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    gap: "15px",
                    alignItems: "flex-start"
                }}>

                    <div
                        onClick={() => setSelectedUserId(post.userId)}
                        style={{
                            width: "50px", height: "50px", borderRadius: "50%",
                            backgroundColor: "#eee", overflow: "hidden", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "2rem", cursor: "pointer", border: "2px solid white",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)", transition: "transform 0.1s"
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
                        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                        {post.userIcon ? (
                            <img src={post.userIcon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span>{post.mood.emoji}</span>
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{post.userName || "ななし"}</span>
                            <span style={{ fontSize: "0.8rem", color: "#888" }}>
                                {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "いま"}
                            </span>
                        </div>
                        <div style={{ marginBottom: "5px" }}>
                            <span style={{ fontSize: "1.2rem", marginRight: "5px" }}>{post.mood?.emoji}</span>
                            <span style={{ color: "var(--color-grey)", fontSize: "0.9rem" }}>{post.mood?.label}</span>
                        </div>
                        <p style={{ lineHeight: "1.5", fontSize: "1rem", whiteSpace: "pre-wrap" }}>{post.text}</p>

                        {/* Stamps Section */}
                        <div style={{ marginTop: "15px", display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {STAMPS.map(stamp => {
                                const reactions = post.reactions || {};
                                const userIds = reactions[stamp.id] || [];
                                const count = userIds.length;
                                const isReacted = user && userIds.includes(user.uid);

                                return (
                                    <button
                                        key={stamp.id}
                                        onClick={() => user && toggleReaction(post.id, user.uid, stamp.id)}
                                        style={{
                                            background: isReacted ? "#fff0f5" : "#f8f9fa",
                                            border: isReacted ? "2px solid #fd79a8" : "1px solid #ddd",
                                            borderRadius: "20px",
                                            padding: "5px 12px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            transition: "all 0.1s"
                                        }}
                                    >
                                        <span style={{ fontSize: "1.2rem" }}>{stamp.emoji}</span>
                                        {count > 0 && (
                                            <span style={{ fontSize: "0.9rem", color: isReacted ? "#e84393" : "#636e72", fontWeight: "bold" }}>
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
