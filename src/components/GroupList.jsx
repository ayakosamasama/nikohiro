"use client";
import { useEffect, useState } from "react";
import { subscribeToGroups, subscribeToUserGroups, toggleGroupMembership, initGroups } from "../services/groupService";
import { useAuth } from "../context/AuthContext";

export default function GroupList() {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [joinedGroupIds, setJoinedGroupIds] = useState([]);
    const [initializing, setInitializing] = useState(false);

    // Affiliation Filtering
    const [selectedAffiliation, setSelectedAffiliation] = useState(null);
    const [affiliationOptions, setAffiliationOptions] = useState([]);

    useEffect(() => {
        if (!user) return;

        const currentAffiliationId = user.affiliationId;
        const currentAffiliations = user.affiliations || [];

        if (!selectedAffiliation && currentAffiliationId) {
            setSelectedAffiliation(currentAffiliationId);
        }

        if (currentAffiliations.length > 1) {
            import("../services/affiliationService").then(({ getAffiliations }) => {
                getAffiliations().then(all => {
                    const myAffiliations = all.filter(a => currentAffiliations.includes(a.id));
                    setAffiliationOptions(myAffiliations);
                    if (!selectedAffiliation && myAffiliations.length > 0) {
                        setSelectedAffiliation(myAffiliations[0].id);
                    }
                }).catch(e => console.error("GroupList: Affiliation error", e));
            });
        }

        const targetAffiliation = selectedAffiliation || currentAffiliationId || "default";
        const unsubGroups = subscribeToGroups(targetAffiliation, (data) => setGroups(data));
        const unsubJoinedGroups = subscribeToUserGroups(user.uid, (ids) => setJoinedGroupIds(ids));

        return () => {
            unsubGroups();
            unsubJoinedGroups();
        };
    }, [user, selectedAffiliation]);

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
            <h3 style={{ marginBottom: "15px", color: "var(--color-black)", display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "10px" }}>
                さがす・はいる
                <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: "normal" }}>※ グループ追加は申請してね</span>
            </h3>

            {affiliationOptions.length > 1 && (
                <div style={{ marginBottom: "15px" }}>
                    <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "5px" }}>
                        {affiliationOptions.map(aff => (
                            <button
                                key={aff.id}
                                onClick={() => setSelectedAffiliation(aff.id)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "20px",
                                    border: selectedAffiliation === aff.id ? "2px solid var(--primary)" : "2px solid #eee",
                                    background: selectedAffiliation === aff.id ? "var(--primary)" : "white",
                                    color: selectedAffiliation === aff.id ? "white" : "#666",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer"
                                }}
                            >
                                {aff.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
