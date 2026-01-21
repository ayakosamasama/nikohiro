"use client";
import { useEffect, useState } from "react";
import { subscribeToPosts } from "../services/postService";

export default function Timeline({ filterMode = "all", userGroups = [], selectedGroupId = null }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToPosts((newPosts) => {
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
    }, [filterMode, userGroups, selectedGroupId]);

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
                    <div style={{
                        width: "50px", height: "50px", borderRadius: "50%",
                        backgroundColor: "#eee", overflow: "hidden", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "2rem"
                    }}>
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
                    </div>
                </div>
            ))}
        </div>
    );
}
