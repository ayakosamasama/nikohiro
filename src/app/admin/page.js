"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "../../lib/firebase"; // Added auth
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import {
    getAllUsers, updateUserRole, deleteUser,
    getFlaggedPosts, deletePost, dismissFlag,
    subscribeToNgWords, addNgWord, removeNgWord
} from "../../services/adminService";
import { getAllRequests, deleteRequest } from "../../services/requestService";
import { updateUserProfile } from "../../services/userService";
import {
    getAffiliations, createAffiliation, updateAffiliation, deleteAffiliation, subscribeToAffiliations
} from "../../services/affiliationService";
import { createGroup, updateGroup, deleteGroup, getGroupMembers, subscribeToGroups } from "../../services/groupService";
import { grantPostRewards } from "../../services/gameService";

// --- Helper Components ---
const SectionCard = ({ title, count, children, action }) => (
    <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "24px", marginBottom: "24px", transition: "transform 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #f0f0f0", paddingBottom: "15px" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#2d3436", display: "flex", alignItems: "center", gap: "10px" }}>
                {title}
                <span style={{ background: "#f0f0f0", padding: "2px 10px", borderRadius: "20px", fontSize: "0.8rem", color: "#636e72" }}>{count}</span>
            </h3>
            {action}
        </div>
        {children}
    </div>
);

const TableHeader = ({ children }) => (
    <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "0.85rem", color: "#636e72", fontWeight: "600", borderBottom: "2px solid #eee" }}>{children}</th>
);

const TableCell = ({ children, bold }) => (
    <td style={{ padding: "12px 15px", borderBottom: "1px solid #f5f5f5", fontSize: "0.9rem", color: "#2d3436", fontWeight: bold ? "600" : "normal" }}>{children}</td>
);

const ActionButton = ({ onClick, color, label, icon }) => (
    <button onClick={onClick} style={{
        padding: "6px 12px",
        borderRadius: "6px",
        border: "none",
        background: color,
        color: "white",
        fontSize: "0.8rem",
        cursor: "pointer",
        transition: "opacity 0.2s",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontWeight: "500"
    }}>
        {icon} {label}
    </button>
);

const TabButton = ({ id, label, count, activeTab, onClick }) => (
    <button
        onClick={() => onClick(id)}
        style={{
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === id ? "var(--primary)" : "transparent",
            color: activeTab === id ? "white" : "#636e72",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px"
        }}
    >
        {label}
        {count > 0 && (
            <span style={{
                background: activeTab === id ? "rgba(255,255,255,0.2)" : "#eee",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.8rem"
            }}>
                {count}
            </span>
        )}
    </button>
);

export default function AdminPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [affiliations, setAffiliations] = useState([]); // New State
    const [requests, setRequests] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroupAffiliation, setSelectedGroupAffiliation] = useState("default"); // New State for Group Filter
    const [loadingData, setLoadingData] = useState(true);

    // Group Modal State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null); // null = create, object = edit
    const [groupForm, setGroupForm] = useState({ id: "", name: "", emoji: "😊", color: "#FF6B6B" });

    // Members Modal State
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [viewingMembers, setViewingMembers] = useState([]);
    const [viewingGroupName, setViewingGroupName] = useState("");

    const [ngWords, setNgWords] = useState([]);
    const [newNgWord, setNewNgWord] = useState("");


    const fetchUsers = async () => {
        const usersData = await getAllUsers();
        setUsers(usersData);
    };

    const fetchRequests = async () => {
        const requestsData = await getAllRequests();
        setRequests(requestsData);
    };

    const fetchFlags = async () => {
        // Assuming getFlaggedPosts exists and returns data for flags
        // const flagsData = await getFlaggedPosts();
        // setFlags(flagsData);
    };

    const fetchAffiliationsData = async () => {
        const data = await getAffiliations();
        setAffiliations(data);
    };

    useEffect(() => {
        if (!loading && isAdmin) {
            // Realtime subscriptions
            // Realtime subscriptions
            // Groups subscription moved to separate useEffect
            const unsubNg = subscribeToNgWords(setNgWords);
            const unsubAffiliations = subscribeToAffiliations(setAffiliations); // Subscribe to affiliations

            const initialFetch = async () => {
                setLoadingData(true);
                try {
                    await Promise.all([
                        fetchUsers().catch(e => console.error("fetchUsers failed", e)),
                        fetchRequests().catch(e => console.error("fetchRequests failed", e)),
                        fetchFlags().catch(e => console.error("fetchFlags failed", e)),
                        fetchAffiliationsData().catch(e => console.error("fetchAffiliationsData failed", e))
                    ]);
                } catch (e) {
                    console.error("Promise.all failed", e);
                } finally {
                    setLoadingData(false);
                }
            };
            initialFetch();

            return () => {
                // unsubGroups handled separately
                unsubNg();
                unsubAffiliations();
            };
        } else if (!loading && !isAdmin) {
            router.push("/"); // Redirect if not admin
        }
    }, [user, loading, router]);

    // Separate effect for Groups subscription to handle filter changes
    useEffect(() => {
        if (!loading && isAdmin) {
            const unsubGroups = subscribeToGroups(selectedGroupAffiliation, setGroups);
            return () => unsubGroups();
        }
    }, [user, loading, selectedGroupAffiliation]);

    // ... existing handlers

    const handleAddNgWord = async () => {
        if (!newNgWord.trim()) return;
        try {
            await addNgWord(newNgWord.trim());
            setNewNgWord("");
        } catch (e) {
            console.error(e);
            alert("追加に失敗しました");
        }
    };

    const handleRemoveNgWord = async (word) => {
        if (!confirm(`「${word}」を削除しますか？`)) return;
        try {
            await removeNgWord(word);
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    const handleTestEgg = async () => {
        if (!user) return;
        // userId, forceEgg=true, xpMultiplier=100
        const result = await grantPostRewards(user.uid, true, 100);
        console.log("Test Egg Result:", result);
        alert(`テスト実行: ${result.eggFound ? "タマゴ発見！" : "はずれ"} XP+${result.petXPGained}`);
    };

    // ... existing render



    {/* Modals ... */ }

    const fetchData = async () => {
        // This function is now largely replaced by the useEffect's initialFetch
        // Keeping it for now, but it might become redundant or need refactoring
        try {
            await Promise.all([
                fetchUsers(),
                fetchRequests()
            ]);
        } catch (error) {
            console.error(error);
            alert("データの取得に失敗しました");
        } finally {
            // setLoadingData(false); // Handled by useEffect's initialFetch
        }
    };

    const handleDelete = async (uid) => {
        if (!confirm("本当にこのユーザーを削除しますか？\n復元できません。")) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/users?uid=${uid}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                alert("削除しました");
                setUsers(users.filter(u => u.id !== uid));
            } else {
                const data = await res.json();
                alert("エラー: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("通信エラー");
        }
    };

    const handleEdit = async (uid, currentEmail) => {
        const newEmail = prompt("新しいメールアドレスを入力してください", currentEmail);
        if (newEmail === null) return;

        const newPass = prompt("新しいパスワードを入力してください（変更しない場合は空欄）");
        if (newPass === null) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ uid, email: newEmail, password: newPass || undefined })
            });

            if (res.ok) {
                alert("更新しました");
                fetchUsers();
            } else {
                // Try to parse JSON, otherwise get text
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    alert("エラー: " + (data.error || "不明なエラー"));
                } catch {
                    console.error("Non-JSON API response:", text);
                    alert(`エラー (${res.status}): APIの呼び出しに失敗しました。\n環境変数が設定されているか、サーバーが再起動されているか確認してください。`);
                }
            }
        } catch (e) {
            console.error(e);
            alert("通信エラー: " + e.message);
        }
    };

    const handleDeleteRequest = async (id) => {
        if (!confirm("この申請を確認済み（削除）にしますか？")) return;
        try {
            await deleteRequest(id);
            alert("削除しました");
            setRequests(requests.filter(r => r.id !== id));
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    // --- Group Handlers ---
    const handleOpenGroupModal = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setGroupForm({ id: group.id, name: group.name, emoji: group.emoji, color: group.color });
        } else {
            setEditingGroup(null);
            setGroupForm({ id: "", name: "", emoji: "😊", color: "#FF6B6B" });
        }
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!groupForm.id || !groupForm.name) {
            alert("IDとグループ名は必須です");
            return;
        }
        try {
            if (editingGroup) {
                await updateGroup(groupForm.id, groupForm);
                alert("更新しました");
            } else {
                await createGroup(groupForm.id, groupForm.name, groupForm.emoji, groupForm.color, selectedGroupAffiliation);
                alert("作成しました");
            }
            setIsGroupModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました");
        }
    };

    const handleDeleteGroup = async (id) => {
        if (!confirm("本当にこのグループを削除しますか？\n（注意：所属メンバーのデータは残る可能性があります）")) return;
        try {
            await deleteGroup(id);
            alert("削除しました");
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    const handleViewMembers = async (group) => {
        try {
            const members = await getGroupMembers(group.id);
            setViewingMembers(members);
            setViewingGroupName(group.name);
            setIsMembersModalOpen(true);
        } catch (e) {
            console.error(e);
            alert("メンバーの取得に失敗しました");
        }
    };

    const handleCreateAffiliation = async () => {
        const name = prompt("新しい所属名を入力してください (例: ○○幼稚園):");
        if (name) {
            try {
                await createAffiliation(name);
                alert("所属を追加しました");
                // fetchAffiliationsData is called by the subscription
            } catch (e) {
                console.error(e);
                alert("所属の追加に失敗しました");
            }
        }
    };



    const handleEditAffiliation = async (id, currentName) => {
        const newName = prompt("新しい所属名を入力してください:", currentName);
        if (newName && newName !== currentName) {
            try {
                await updateAffiliation(id, { name: newName });
                alert("所属名を変更しました");
                // fetchAffiliationsData is called by the subscription
            } catch (e) {
                console.error(e);
                alert("所属名の変更に失敗しました");
            }
        }
    };

    const handleDeleteAffiliation = async (id) => {
        if (id === "default") {
            alert("「所属なし」は削除できません。");
            return;
        }
        if (confirm("本当にこの所属を削除しますか？")) {
            try {
                await deleteAffiliation(id);
                alert("所属を削除しました");
                // fetchAffiliationsData is called by the subscription
            } catch (e) {
                console.error(e);
                alert("所属の削除に失敗しました");
            }
        }
    };

    // Helper to get affiliation name
    const getAffiliationName = (id) => {
        if (!id || id === "default") return "所属なし";
        const aff = affiliations.find(a => a.id === id);
        return aff ? aff.name : "不明";
    };

    const handleUpdateUserAffiliation = async (userId, newAffiliationId) => {
        try {
            await updateUserProfile(userId, { affiliationId: newAffiliationId });
            alert("ユーザーの所属を更新しました");
            fetchUsers(); // Re-fetch users to show updated affiliation
        } catch (e) {
            console.error(e);
            alert("ユーザーの所属更新に失敗しました");
        }
    };


    const handleSetGameUrl = async (userId, currentUrl) => {
        const newUrl = prompt("ゲームのURLを入力してください（停止する場合は空欄）:", currentUrl || "");
        if (newUrl === null) return;
        try {
            await updateUserProfile(userId, { gameUrl: newUrl });
            alert("ゲームURLを更新しました");
            fetchUsers();
        } catch (e) {
            console.error(e);
            alert("更新に失敗しました");
        }
    };

    if (loading || loadingData) return <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>読み込み中...</div>;
    if (!user?.isAdmin) return <div style={{ padding: "50px", textAlign: "center" }}>アクセス権限がありません</div>;

    // Components moved to top...

    return (
        <div style={{ padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "var(--font-base, 'Inter', sans-serif)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                    <h2 style={{ color: "#2d3436", margin: "0 0 5px 0", fontSize: "1.8rem" }}>Admin Dashboard</h2>
                    <p style={{ color: "#636e72", margin: 0, fontSize: "0.9rem" }}>ニコニコひろば 管理画面</p>
                </div>
                <button onClick={() => router.push("/")} className="btn" style={{ background: "white", border: "1px solid #ddd", color: "#2d3436", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                    アプリに戻る ↗
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", background: "white", padding: "8px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <TabButton id="users" label="ユーザー" count={users.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="affiliations" label="所属管理" count={affiliations.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="groups" label="グループ" count={groups.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="requests" label="申請・お問い合わせ" count={requests.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="safety" label="NGワード" count={ngWords.length} activeTab={activeTab} onClick={setActiveTab} />
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                <div style={{ marginBottom: "30px", padding: "15px", border: "2px dashed #ccc", borderRadius: "10px" }}>
                    <h3>🛠️ システムテスト (管理者用)</h3>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleTestEgg} className="btn" style={{ background: "#9b59b6", color: "white" }}>
                            強制タマゴ発見 & XP付与
                        </button>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "5px" }}>
                        ※あなたのアカウントに対して実行されます。<br />
                        ※タマゴ条件: ペットなし or Lv70以上 (強制モードなら無視して30%判定...ではなく強制Trueにします)
                    </p>
                </div>
            </div>

            {activeTab === "users" && (
                <SectionCard title="登録ユーザー" count={users.length}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                            <thead>
                                <tr>
                                    <TableHeader>ID</TableHeader>
                                    <TableHeader>ニックネーム</TableHeader>
                                    <TableHeader>メールアドレス</TableHeader>
                                    <TableHeader>権限</TableHeader>
                                    <TableHeader>所属</TableHeader>
                                    <TableHeader>操作</TableHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#fafafa"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                        <TableCell>{u.id.substring(0, 8)}...</TableCell>
                                        <TableCell bold>{u.displayName || "未設定"}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <span style={{
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                background: u.isAdmin ? "#ffeaa7" : "#dfe6e9",
                                                color: u.isAdmin ? "#d63031" : "#636e72",
                                                fontSize: "0.75rem",
                                                fontWeight: "bold"
                                            }}>
                                                {u.isAdmin ? "管理者" : "一般"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                value={u.affiliationId || "default"}
                                                onChange={(e) => handleUpdateUserAffiliation(u.id, e.target.value)}
                                                style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ccc" }}
                                            >
                                                {affiliations.map(aff => (
                                                    <option key={aff.id} value={aff.id}>{aff.name}</option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <td style={{ padding: "12px 15px", borderBottom: "1px solid #f5f5f5", display: "flex", gap: "8px" }}>
                                            <ActionButton onClick={() => handleSetGameUrl(u.id, u.gameUrl)} color="#9b59b6" label="🎮" />
                                            <ActionButton onClick={() => handleEdit(u.id, u.email)} color="#f0ad4e" label="編集" />
                                            <ActionButton onClick={() => handleDelete(u.id)} color="#ff7675" label="削除" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {activeTab === "affiliations" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h3>所属一覧</h3>
                        <button onClick={handleCreateAffiliation} className="btn-primary" style={{ padding: "10px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                            ＋ 所属を追加
                        </button>
                    </div>

                    <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                                    <th style={{ padding: "10px" }}>ID</th>
                                    <th style={{ padding: "10px" }}>所属名</th>
                                    <th style={{ padding: "10px" }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {affiliations.map(aff => (
                                    <tr key={aff.id} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "10px", fontFamily: "monospace", color: "#666" }}>{aff.id}</td>
                                        <td style={{ padding: "10px", fontWeight: "bold" }}>{aff.name}</td>
                                        <td style={{ padding: "10px" }}>
                                            {aff.id !== "default" && (
                                                <div style={{ display: "flex", gap: "10px" }}>
                                                    <button
                                                        onClick={() => handleEditAffiliation(aff.id, aff.name)}
                                                        style={{ background: "#f0ad4e", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAffiliation(aff.id)}
                                                        style={{ background: "#ff6b6b", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "groups" && (
                <SectionCard title="グループ管理" count={groups.length} action={
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <select
                            value={selectedGroupAffiliation}
                            onChange={(e) => setSelectedGroupAffiliation(e.target.value)}
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                        >
                            <option value="default">所属なし（共通）</option>
                            {affiliations.filter(a => a.id !== "default").map(aff => (
                                <option key={aff.id} value={aff.id}>{aff.name}</option>
                            ))}
                        </select>
                        <button onClick={() => handleOpenGroupModal()} style={{ background: "var(--primary)", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                            + 新規グループ作成
                        </button>
                    </div>
                }>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                            <thead>
                                <tr>
                                    <TableHeader>ID</TableHeader>
                                    <TableHeader>アイコン</TableHeader>
                                    <TableHeader>グループ名</TableHeader>
                                    <TableHeader>テーマカラー</TableHeader>
                                    <TableHeader>操作</TableHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(g => (
                                    <tr key={g.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#fafafa"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                        <TableCell>{g.id}</TableCell>
                                        <td style={{ padding: "12px 15px", borderBottom: "1px solid #f5f5f5", fontSize: "1.5rem" }}>{g.emoji}</td>
                                        <TableCell bold>{g.name}</TableCell>
                                        <td style={{ padding: "12px 15px", borderBottom: "1px solid #f5f5f5" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: g.color, border: "2px solid rgba(0,0,0,0.1)" }}></div>
                                                <span style={{ fontSize: "0.8rem", color: "#999", fontFamily: "monospace" }}>{g.color}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 15px", borderBottom: "1px solid #f5f5f5", display: "flex", gap: "8px" }}>
                                            <ActionButton onClick={() => handleViewMembers(g)} color="#74b9ff" label="メンバー" />
                                            <ActionButton onClick={() => handleOpenGroupModal(g)} color="#f0ad4e" label="編集" />
                                            <ActionButton onClick={() => handleDeleteGroup(g.id)} color="#ff7675" label="削除" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {activeTab === "requests" && (
                <SectionCard title="申請・お問い合わせ" count={requests.length}>
                    {requests.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#b2bec3" }}>
                            <p style={{ fontSize: "3rem", margin: "0 0 10px 0" }}>📭</p>
                            <p>現在、未処理の申請はありません。</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            {requests.map(req => (
                                <div key={req.id} style={{
                                    border: "1px solid #eee",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    background: "#fff",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                                    transition: "transform 0.2s"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                                        <div>
                                            <h4 style={{ margin: "0 0 8px 0", color: "#2d3436", fontSize: "1.1rem" }}>
                                                {req.title}
                                                {req.title === "ゲーム作成" && (
                                                    <span style={{ marginLeft: "10px", padding: "2px 8px", background: "#9b59b6", color: "white", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "bold" }}>GAME</span>
                                                )}
                                            </h4>
                                            <div style={{ fontSize: "0.85rem", color: "#636e72", lineHeight: "1.5" }}>
                                                <span style={{ display: "inline-block", marginRight: "10px" }}>👤 <strong>{req.userName}</strong></span>
                                                <span style={{ display: "inline-block", marginRight: "10px" }}>📧 {req.email}</span>
                                                <span style={{ display: "inline-block" }}>🕒 {req.createdAt?.toDate().toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteRequest(req.id)}
                                            style={{
                                                background: "#00b894",
                                                color: "white",
                                                border: "none",
                                                fontSize: "0.9rem",
                                                padding: "8px 16px",
                                                borderRadius: "20px",
                                                cursor: "pointer",
                                                fontWeight: "600",
                                                boxShadow: "0 2px 5px rgba(0,184,148,0.3)"
                                            }}
                                        >
                                            ✓ 対応完了
                                        </button>
                                    </div>
                                    <div style={{
                                        background: "#f9f9f9",
                                        padding: "15px",
                                        borderRadius: "8px",
                                        border: "1px solid #f1f2f6",
                                        whiteSpace: "pre-wrap",
                                        color: "#2d3436",
                                        lineHeight: "1.6"
                                    }}>
                                        {req.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            )}

            {activeTab === "safety" && (
                <SectionCard title="NGワード管理" count={ngWords.length}>
                    <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                        <input
                            type="text"
                            value={newNgWord}
                            onChange={(e) => setNewNgWord(e.target.value)}
                            placeholder="新しい禁止ワードを入力"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
                        />
                        <button
                            onClick={handleAddNgWord}
                            disabled={!newNgWord.trim()}
                            style={{ padding: "10px 20px", background: "var(--color-red)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                        >
                            追加
                        </button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {ngWords.length === 0 && <p style={{ color: "#aaa" }}>設定されているNGワードはありません</p>}
                        {ngWords.map((word, i) => (
                            <span key={i} style={{
                                background: "#ffeaa7", padding: "5px 12px", borderRadius: "20px",
                                display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "#d63031"
                            }}>
                                {word}
                                <button
                                    onClick={() => handleRemoveNgWord(word)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#d63031", padding: 0, lineHeight: 1 }}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <p style={{ marginTop: "20px", fontSize: "0.85rem", color: "#666" }}>
                        ※ ここに追加された言葉は、投稿時に「ちくちくことば」として警告が表示されます。<br />
                        ※ 未設定の場合は、デフォルトのリストが使用されます。
                    </p>
                </SectionCard>
            )}

            {/* Modals with better styling */}
            {isGroupModalOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{ background: "white", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "450px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "1.4rem", color: "#2d3436" }}>
                            {editingGroup ? "✏️ グループを編集" : "✨ 新しいグループを作成"}
                        </h3>

                        <div style={{ display: "grid", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#636e72" }}>ID (ユニークID)</label>
                                <input
                                    type="text"
                                    value={groupForm.id}
                                    onChange={(e) => setGroupForm({ ...groupForm, id: e.target.value })}
                                    disabled={!!editingGroup}
                                    placeholder="例: music"
                                    style={{ width: "100%", padding: "12px", border: "1px solid #dfe6e9", borderRadius: "8px", fontSize: "1rem" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#636e72" }}>グループ名</label>
                                <input
                                    type="text"
                                    value={groupForm.name}
                                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                    placeholder="例: おんがく"
                                    style={{ width: "100%", padding: "12px", border: "1px solid #dfe6e9", borderRadius: "8px", fontSize: "1rem" }}
                                />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#636e72" }}>アイコン</label>
                                    <input
                                        type="text"
                                        value={groupForm.emoji}
                                        onChange={(e) => setGroupForm({ ...groupForm, emoji: e.target.value })}
                                        style={{ width: "100%", padding: "12px", border: "1px solid #dfe6e9", borderRadius: "8px", fontSize: "1.2rem", textAlign: "center" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#636e72" }}>カラー</label>
                                    <input
                                        type="color"
                                        value={groupForm.color}
                                        onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                                        style={{ width: "100%", height: "48px", border: "none", background: "none", cursor: "pointer" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "30px" }}>
                            <button onClick={() => setIsGroupModalOpen(false)} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #dfe6e9", background: "white", color: "#636e72", cursor: "pointer", fontWeight: "600" }}>キャンセル</button>
                            <button onClick={handleSaveGroup} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>保存する</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members View Modal */}
            {isMembersModalOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{ background: "white", padding: "0", borderRadius: "16px", width: "90%", maxWidth: "500px", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "#2d3436" }}>「{viewingGroupName}」のメンバー <span style={{ color: "#b2bec3", fontSize: "1rem" }}>{viewingMembers.length}名</span></h3>
                            <button onClick={() => setIsMembersModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#b2bec3" }}>×</button>
                        </div>

                        <div style={{ overflowY: "auto", padding: "0" }}>
                            {viewingMembers.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#b2bec3" }}>メンバーはいません</div>
                            ) : (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {viewingMembers.map((m, i) => (
                                        <li key={m.uid} style={{
                                            padding: "15px 24px",
                                            borderBottom: "1px solid #f9f9f9",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "15px",
                                            background: i % 2 === 0 ? "white" : "#fafafa"
                                        }}>
                                            {m.photoURL ? (
                                                <img src={m.photoURL} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} />
                                            ) : (
                                                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#dfe6e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>👤</div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: "600", color: "#2d3436" }}>{m.displayName}</div>
                                                <div style={{ fontSize: "0.8rem", color: "#b2bec3" }}>参加日: {m.joinedAt?.toDate().toLocaleDateString()}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div style={{ padding: "15px 24px", borderTop: "1px solid #f0f0f0", textAlign: "right", background: "#fbfbfb" }}>
                            <button onClick={() => setIsMembersModalOpen(false)} style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #dfe6e9", background: "white", color: "#636e72", cursor: "pointer", fontWeight: "600" }}>閉じる</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
