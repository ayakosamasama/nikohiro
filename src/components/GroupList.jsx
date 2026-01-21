"use client";
import { useEffect, useState } from "react";
import { subscribeToGroups, subscribeToUserGroups, toggleGroupMembership, initGroups } from "../services/groupService";
import { useAuth } from "../context/AuthContext";

export default function GroupList() {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [joinedGroupIds, setJoinedGroupIds] = useState([]);
    const [initializing, setInitializing] = useState(false);

    useEffect(() => {
        if (!user) return;

        const unsubGroups = subscribeToGroups(user.affiliationId || "default", (data) => setGroups(data));
        const unsubUserGroups = subscribeToUserGroups(user.uid, (ids) => setJoinedGroupIds(ids));

        return () => {
            unsubGroups();
            unsubUserGroups();
        };
    }, [user]);

    const handleInit = async () => {
        setInitializing(true);
        try {
            await initGroups();
            alert("テストグループを作成しました！");
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました: " + error.message);
        } finally {
            setInitializing(false);
        }
    };

    const handleToggle = async (groupId) => {
        const isJoined = joinedGroupIds.includes(groupId);
        try {
            await toggleGroupMembership(user.uid, groupId, !isJoined);
        } catch (error) {
            console.error("Group toggle error:", error);
            alert("エラーが発生しました");
        }
    };

    return (
        <div style={{ padding: "0 20px 20px 20px" }}>
            <h3 style={{ marginBottom: "15px", color: "var(--color-black)" }}>さがす・はいる</h3>

            {groups.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", background: "#fff", borderRadius: "10px" }}>
                    <p style={{ marginBottom: "10px" }}>グループが見つかりません</p>
                    <button
                        onClick={handleInit}
                        className="btn btn-primary"
                        disabled={initializing}
                    >
                        {initializing ? "さくせいちゅう..." : "テストグループをつくる"}
                    </button>
                    {initializing && <p style={{ marginTop: "10px", fontSize: "0.8rem" }}>（すこし時間がかかる場合があります）</p>}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
                {groups.map((group) => {
                    const isJoined = joinedGroupIds.includes(group.id);
                    return (
                        <div key={group.id} style={{
                            background: "white",
                            padding: "15px",
                            borderRadius: "var(--radius-md)",
                            border: `2px solid ${isJoined ? group.color : "#ddd"}`,
                            textAlign: "center",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: "5px" }}>{group.emoji}</div>
                            <div style={{ fontWeight: "bold", marginBottom: "10px" }}>{group.name}</div>
                            <button
                                onClick={() => handleToggle(group.id)}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "20px",
                                    border: "none",
                                    background: isJoined ? group.color : "#f0f0f0",
                                    color: isJoined ? "white" : "black",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {isJoined ? "やめる" : "はいる"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
