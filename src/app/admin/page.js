"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "../../lib/firebase"; // Added auth
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import {
    getAllUsers, updateUserRole, deleteUser,
    subscribeToNgWords, addNgWord, removeNgWord,
    assignUserToAffiliation, removeUserFromAffiliation,
    subscribeToSystemConfig, updateMaintenanceMode
} from "../../services/adminService";
import { getAllRequests, deleteRequest, resolveRequest } from "../../services/requestService";
import { updateUserProfile } from "../../services/userService";
import {
    getAffiliations, createAffiliation, updateAffiliation, deleteAffiliation, subscribeToAffiliations
} from "../../services/affiliationService";
import { createGroup, updateGroup, deleteGroup, getGroupMembers, subscribeToGroups } from "../../services/groupService";
import { grantPostRewards } from "../../services/gameService";
import { getReportedPosts, dismissReports, deleteReportedPost } from "../../services/reportService"; // Added imports
import { subscribeToInvitations, deleteInvitation } from "../../services/invitationService";
import { sendMessage } from "../../services/messageService";

// --- Helper Components ---
const SectionCard = ({ title, count, children, action }) => (
    <div className="card" style={{ marginBottom: "24px", animation: "fadeIn 0.5s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid rgba(0,0,0,0.05)", paddingBottom: "15px" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px", fontWeight: "800" }}>
                {title}
                {count !== undefined && (
                    <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 10px", borderRadius: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>{count}</span>
                )}
            </h3>
            {action}
        </div>
        {children}
    </div>
);

const TableHeader = ({ children }) => (
    <th style={{ padding: "15px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "700", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>{children}</th>
);

const TableCell = ({ children, bold }) => (
    <td style={{ padding: "15px", borderBottom: "1px solid rgba(0,0,0,0.03)", fontSize: "0.95rem", color: "var(--text-main)", fontWeight: bold ? "700" : "500", whiteSpace: "nowrap" }}>{children}</td>
);

const ActionButton = ({ onClick, color, label, icon }) => (
    <button onClick={onClick} className="btn" style={{
        padding: "6px 14px",
        borderRadius: "10px",
        background: color,
        color: "white",
        fontSize: "0.85rem",
        boxShadow: "var(--shadow-sm)"
    }}>
        {icon} {label}
    </button>
);

const TabButton = ({ id, label, count, activeTab, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className="btn"
        style={{
            padding: "10px 20px",
            borderRadius: "12px",
            background: activeTab === id ? "var(--primary)" : "transparent",
            color: activeTab === id ? "white" : "var(--text-muted)",
            fontWeight: "700",
            boxShadow: activeTab === id ? "var(--shadow-md)" : "none",
            fontSize: "0.95rem"
        }}
    >
        {label}
        {count > 0 && (
            <span style={{
                background: activeTab === id ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.05)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                marginLeft: "6px"
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
    const [reportedPosts, setReportedPosts] = useState([]); // New State
    const [groups, setGroups] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [selectedGroupAffiliation, setSelectedGroupAffiliation] = useState("default"); // New State for Group Filter
    const [userFilterAffiliation, setUserFilterAffiliation] = useState("all"); // Filter for User list
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
    const [forceDeleteEmail, setForceDeleteEmail] = useState("");

    // Affiliation Member Modal State
    const [isAffMemberModalOpen, setIsAffMemberModalOpen] = useState(false);
    const [viewingAffiliation, setViewingAffiliation] = useState(null); // { id, name }
    const [affMembers, setAffMembers] = useState([]);
    const [selectedUserToAssign, setSelectedUserToAssign] = useState("");

    // Message Composition State
    const [messageForm, setMessageForm] = useState({
        title: "",
        content: "",
        type: "all",
        targetId: ""
    });
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // System Config State
    const [maintenanceMode, setMaintenanceMode] = useState(false);


    const fetchUsers = async () => {
        const usersData = await getAllUsers();
        setUsers(usersData);
    };

    const fetchRequests = async () => {
        const requestsData = await getAllRequests();
        setRequests(requestsData);
    };


    const fetchAffiliationsData = async () => {
        const data = await getAffiliations();
        setAffiliations(data);
    };

    const fetchReportedPostsData = async () => {
        const data = await getReportedPosts();
        setReportedPosts(data);
    };

    // Subscribe to System Config
    useEffect(() => {
        const unsub = subscribeToSystemConfig((config) => {
            setMaintenanceMode(!!config?.maintenanceMode);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!loading && isAdmin) {
            // Realtime subscriptions
            // Realtime subscriptions
            // Groups subscription moved to separate useEffect
            const unsubNg = subscribeToNgWords(setNgWords);
            const unsubAffiliations = subscribeToAffiliations(setAffiliations); // Subscribe to affiliations
            const unsubInvitations = subscribeToInvitations(setInvitations);

            const initialFetch = async () => {
                setLoadingData(true);
                try {
                    await Promise.all([
                        fetchUsers().catch(e => console.error("fetchUsers failed", e)),
                        fetchRequests().catch(e => console.error("fetchRequests failed", e)),
                        fetchAffiliationsData().catch(e => console.error("fetchAffiliationsData failed", e)),
                        fetchReportedPostsData().catch(e => console.error("fetchReportedPostsData failed", e))
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
                unsubInvitations();
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

    const handleForceDeleteByEmail = async () => {
        if (!forceDeleteEmail.trim()) {
            alert("メールアドレスを入力してください");
            return;
        }
        if (!confirm(`本当に「${forceDeleteEmail}」のアカウントを強制削除しますか？\nFirestoreにデータがない場合でもAuthから直接削除を試みます。`)) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/users?email=${encodeURIComponent(forceDeleteEmail)}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                alert("削除に成功しました。このメールアドレスで再度登録が可能です。");
                setForceDeleteEmail("");
                fetchUsers(); // Refresh the list just in case
            } else {
                const data = await res.json();
                alert("エラー: " + (data.error || "削除に失敗しました"));
            }
        } catch (e) {
            console.error(e);
            alert("通信エラー: " + e.message);
        }
    };

    const handleEdit = async (uid, currentEmail) => {
        const newEmail = prompt("新しいメールアドレスを入力してください", currentEmail);
        if (newEmail === null) return;

        const newPass = prompt("新しいパスワードを入力してください（変更しない場合は空欄）");
        if (newPass === null) return;

        // Skip if no changes
        if (newEmail === currentEmail && !newPass) {
            return;
        }

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

    const handleResolveRequest = async (req) => {
        if (!confirm("この申請を確認済み（完了）にしますか？")) return;

        let gameUrl = null;
        // Game request: Auto-set URL
        if (req.title === "ゲーム作成" || req.title === "ゲーム変更") {
            gameUrl = `/games/${req.userId}.html`;
        }

        try {
            await resolveRequest(req.id, gameUrl);

            // If gameUrl provided, update user profile to enable "My Game" button
            if (gameUrl) {
                await updateUserProfile(req.userId, { gameUrl: gameUrl });
            }

            alert("完了としてマークしました");
            setRequests(requests.filter(r => r.id !== req.id));
        } catch (e) {
            console.error(e);
            alert("処理に失敗しました");
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
            // Update both primary ID and ensure it's in the array
            const { db } = await import("../../lib/firebase");
            const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
            const userRef = doc(db, "users", userId);

            await updateDoc(userRef, {
                affiliationId: newAffiliationId,
                affiliations: arrayUnion(newAffiliationId)
            });

            alert("ユーザーの所属を更新しました");
            fetchUsers(); // Re-fetch users to show updated affiliation
        } catch (e) {
            console.error(e);
            alert("ユーザーの所属更新に失敗しました");
        }
    };

    // --- Affiliation Member Handlers ---
    const handleViewAffiliationMembers = async (aff) => {
        setViewingAffiliation(aff);
        // Filter users who have this affiliation in their array
        const members = users.filter(u => u.affiliations?.includes(aff.id) || u.affiliationId === aff.id);
        setAffMembers(members);
        setIsAffMemberModalOpen(true);
    };

    const handleAssignToAffiliation = async () => {
        if (!selectedUserToAssign || !viewingAffiliation) return;
        try {
            await assignUserToAffiliation(selectedUserToAssign, viewingAffiliation.id);
            alert("追加しました");
            // Refresh local state
            await fetchUsers();
            // Re-filter for modal (optional but better)
            const updatedUsers = await getAllUsers();
            setUsers(updatedUsers);
            setAffMembers(updatedUsers.filter(u => u.affiliations?.includes(viewingAffiliation.id) || u.affiliationId === viewingAffiliation.id));
            setSelectedUserToAssign("");
        } catch (e) {
            console.error(e);
            alert("追加に失敗しました");
        }
    };

    const handleRemoveFromAffiliation = async (userId) => {
        if (!viewingAffiliation || !confirm("この所属への割り当てを削除しますか？")) return;
        try {
            await removeUserFromAffiliation(userId, viewingAffiliation.id);
            alert("削除しました");
            // Refresh
            const updatedUsers = await getAllUsers();
            setUsers(updatedUsers);
            setAffMembers(updatedUsers.filter(u => u.affiliations?.includes(viewingAffiliation.id) || u.affiliationId === viewingAffiliation.id));
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
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

    const handleDismissReport = async (postId) => {
        if (!confirm("この投稿の通報をクリアし、再表示しますか？")) return;
        try {
            await dismissReports(postId);
            alert("通報をクリアしました");
            fetchReportedPostsData();
        } catch (e) {
            console.error(e);
            alert("処理に失敗しました");
        }
    };

    const handleDeleteReportedPost = async (postId) => {
        if (!confirm("本当に削除しますか？")) return;
        try {
            await deleteReportedPost(postId);
            alert("削除しました");
            fetchReportedPostsData();
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    const handleDeleteInvitation = async (id) => {
        if (!confirm(`招待コードを削除しますか？\nこのコードを使った登録ができなくなります。`)) return;
        try {
            await deleteInvitation(id);
            alert("削除しました");
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました: " + e.message);
        }
    };

    const handleSendMessage = async () => {
        if (!messageForm.title || !messageForm.content) {
            alert("タイトルと内容を入力してください");
            return;
        }
        if (messageForm.type !== "all" && !messageForm.targetId) {
            alert("送信先を選択してください");
            return;
        }

        setIsSendingMessage(true);
        try {
            await sendMessage({
                ...messageForm,
                createdBy: user.uid
            });
            alert("メッセージを送信しました");
            setMessageForm({ title: "", content: "", type: "all", targetId: "" });
        } catch (e) {
            console.error(e);
            alert("送信に失敗しました");
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleOpenMessaging = (type, targetId) => {
        setMessageForm({
            title: "",
            content: "",
            type: type,
            targetId: targetId
        });
        setActiveTab("messaging");
    };

    if (loading || loadingData) return <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>読み込み中...</div>;
    if (!user?.isAdmin) return <div style={{ padding: "50px", textAlign: "center" }}>アクセス権限がありません</div>;

    // Components moved to top...

    return (
        <div style={{ padding: "40px 20px", maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                    <h2 style={{ color: "var(--primary)", margin: "0 0 5px 0", fontSize: "2rem", fontWeight: "900", letterSpacing: "-1px" }}>管理ダッシュボード</h2>
                    <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "1rem" }}>にこにこひろば 管理画面</p>
                </div>
                <button onClick={() => router.push("/")} className="btn" style={{ background: "white", color: "var(--text-main)", fontSize: "0.9rem" }}>
                    アプリに戻る ↗
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="glass" style={{
                display: "flex",
                gap: "10px",
                marginBottom: "30px",
                padding: "10px",
                borderRadius: "16px",
                flexWrap: "wrap"
            }}>
                <TabButton id="users" label="ユーザー" count={users.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="affiliations" label="所属管理" count={affiliations.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="groups" label="グループ" count={groups.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="invitations" label="招待コード" count={invitations.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="messaging" label="📣 メッセージ送信" activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="requests" label="申請・お問い合わせ" count={requests.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="reports" label="⚠️ 通報リスト" count={reportedPosts.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="safety" label="NGワード" count={ngWords.length} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="system" label="システム操作" activeTab={activeTab} onClick={setActiveTab} />
            </div>

            {/* Content Area */}
            <div style={{ flex: 1 }}>

                {/* System Test Panel */}
                {/* System Test Panel Moved to System Tab */}

                {activeTab === "system" && (
                    <SectionCard title="システム操作">
                        {/* Maintenance Mode */}
                        <div style={{ marginBottom: "30px", padding: "20px", border: `2px solid ${maintenanceMode ? "var(--color-red)" : "#e2e8f0"}`, borderRadius: "16px", background: maintenanceMode ? "#fff5f5" : "#f8fafc" }}>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: maintenanceMode ? "var(--color-red)" : "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                                🛠️ メンテナンスモード
                            </h3>
                            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "20px" }}>
                                有効にすると、システム管理者以外のユーザーは強制的にログアウトされ、新規ログインもできなくなります。
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                <button
                                    onClick={() => {
                                        if (confirm(`メンテナンスモードを ${maintenanceMode ? "解除" : "有効"} にしますか？`)) {
                                            updateMaintenanceMode(!maintenanceMode);
                                        }
                                    }}
                                    className="btn"
                                    style={{
                                        background: maintenanceMode ? "var(--color-green)" : "var(--color-red)",
                                        color: "white",
                                        padding: "10px 24px",
                                        fontWeight: "bold",
                                        borderRadius: "12px"
                                    }}
                                >
                                    {maintenanceMode ? "メンテナンス解除" : "メンテナンス開始"}
                                </button>
                                <span style={{
                                    fontSize: "0.9rem",
                                    fontWeight: "bold",
                                    color: maintenanceMode ? "var(--color-red)" : "var(--color-green)",
                                    padding: "5px 12px",
                                    borderRadius: "20px",
                                    background: "white",
                                    border: "1px solid currentColor"
                                }}>
                                    ステータス: {maintenanceMode ? "🔴 メンテナンス中" : "🟢 通常稼働中"}
                                </span>
                            </div>
                        </div>

                        {/* User Force Delete */}
                        <div style={{ marginBottom: "30px", padding: "20px", border: "2px solid #fee2e2", borderRadius: "16px", background: "#fffaf0" }}>
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "1rem", color: "var(--color-red)", display: "flex", alignItems: "center", gap: "8px" }}>
                                ⚠️ アカウントの強制削除 (Auth残留データの整理)
                            </h3>
                            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>
                                Firebase Auth等にのみデータが残り、管理画面の一覧に出ないユーザーをメールアドレス指定で直接削除します。
                            </p>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    type="email"
                                    value={forceDeleteEmail}
                                    onChange={(e) => setForceDeleteEmail(e.target.value)}
                                    placeholder="example@gmail.com"
                                    style={{
                                        flex: 1, padding: "10px", borderRadius: "8px",
                                        border: "1px solid #ddd", fontSize: "0.9rem"
                                    }}
                                />
                                <button
                                    onClick={handleForceDeleteByEmail}
                                    className="btn"
                                    style={{ background: "var(--color-red)", color: "white", padding: "8px 20px" }}
                                >
                                    強制削除を実行
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: "30px", padding: "20px", border: "2px dashed rgba(0,0,0,0.1)", borderRadius: "16px", background: "rgba(0,0,0,0.02)" }}>
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "1rem", color: "var(--text-muted)" }}>🛠️ システムテスト (管理者用)</h3>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={handleTestEgg} className="btn" style={{ background: "var(--color-purple)", color: "white", padding: "8px 16px", fontSize: "0.85rem" }}>
                                    強制タマゴ発見 & XP付与
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "users" && (
                    <SectionCard title="登録ユーザー" count={users.length} action={
                        <select
                            value={userFilterAffiliation}
                            onChange={(e) => setUserFilterAffiliation(e.target.value)}
                            style={{ padding: "8px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)", background: "white", cursor: "pointer", color: "var(--text-main)" }}
                        >
                            <option value="all">すべて表示</option>
                            <option value="default">所属なし</option>
                            {affiliations.filter(a => a.id !== "default").map(aff => (
                                <option key={aff.id} value={aff.id}>{aff.name}</option>
                            ))}
                        </select>
                    }>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                                <thead>
                                    <tr>
                                        <TableHeader>操作</TableHeader>
                                        <TableHeader>Name</TableHeader>
                                        <TableHeader>所属</TableHeader>
                                        <TableHeader>✉</TableHeader>
                                        <TableHeader>権限</TableHeader>
                                        <TableHeader>ID</TableHeader>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(userFilterAffiliation === "all"
                                        ? users
                                        : users.filter(u => userFilterAffiliation === "default" ? (!u.affiliationId || u.affiliationId === "default") : u.affiliationId === userFilterAffiliation)
                                    ).map(u => (
                                        <tr key={u.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ padding: "12px 15px", borderBottom: "1px solid rgba(0,0,0,0.03)", display: "flex", gap: "8px" }}>
                                                <ActionButton onClick={() => handleOpenMessaging("user", u.id)} color="var(--primary)" label="✉" />
                                                <ActionButton onClick={() => handleSetGameUrl(u.id, u.gameUrl)} color="var(--color-purple)" label="🎮" />
                                                <ActionButton onClick={() => handleEdit(u.id, u.email)} color="var(--color-orange)" label="編集" />
                                                {!u.isAdmin && (
                                                    <ActionButton onClick={() => handleDelete(u.id)} color="var(--color-red)" label="削除" />
                                                )}
                                            </td>
                                            <TableCell bold>{u.displayName || "未設定"}</TableCell>
                                            <TableCell>
                                                <select
                                                    value={u.affiliationId || "default"}
                                                    onChange={(e) => handleUpdateUserAffiliation(u.id, e.target.value)}
                                                    style={{
                                                        padding: "6px", borderRadius: "8px",
                                                        border: "1px solid rgba(0,0,0,0.1)",
                                                        background: "white",
                                                        color: "var(--text-main)"
                                                    }}
                                                >
                                                    {affiliations.map(aff => (
                                                        <option key={aff.id} value={aff.id}>{aff.name}</option>
                                                    ))}
                                                </select>
                                            </TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "6px",
                                                    background: u.isAdmin ? "var(--color-red)" : "rgba(0,0,0,0.05)",
                                                    color: u.isAdmin ? "white" : "var(--text-muted)",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "700"
                                                }}>
                                                    {u.isAdmin ? "管理者" : "一般"}
                                                </span>
                                            </TableCell>
                                            <TableCell>{u.id.substring(0, 8)}...</TableCell>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "affiliations" && (
                    <SectionCard title="所属管理" count={affiliations.length} action={
                        <button onClick={handleCreateAffiliation} className="btn-primary btn" style={{ fontSize: "0.9rem" }}>
                            ＋ 所属を追加
                        </button>
                    }>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                                <thead>
                                    <tr>
                                        <TableHeader>操作</TableHeader>
                                        <TableHeader>所属名</TableHeader>
                                        <TableHeader>ID</TableHeader>
                                    </tr>
                                </thead>
                                <tbody>
                                    {affiliations.map(aff => (
                                        <tr key={aff.id} style={{ transition: "background 0.2s" }}>
                                            <td style={{ padding: "12px 15px", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                                <div style={{ display: "flex", gap: "10px" }}>
                                                    <ActionButton onClick={() => handleOpenMessaging("affiliation", aff.id)} color="var(--primary)" label="✉" />
                                                    <ActionButton onClick={() => handleViewAffiliationMembers(aff)} color="var(--color-blue)" label="メンバー" />
                                                    {aff.id !== "default" && (
                                                        <>
                                                            <ActionButton onClick={() => handleEditAffiliation(aff.id, aff.name)} color="var(--color-orange)" label="編集" />
                                                            <ActionButton onClick={() => handleDeleteAffiliation(aff.id)} color="var(--color-red)" label="削除" />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <TableCell bold>{aff.name}</TableCell>
                                            <TableCell>{aff.id}</TableCell>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "groups" && (
                    <SectionCard title="グループ管理" count={groups.length} action={
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <select
                                value={selectedGroupAffiliation}
                                onChange={(e) => setSelectedGroupAffiliation(e.target.value)}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)", background: "white", cursor: "pointer", color: "var(--text-main)" }}
                            >
                                <option value="default">所属なし（共通）</option>
                                {affiliations.filter(a => a.id !== "default").map(aff => (
                                    <option key={aff.id} value={aff.id}>{aff.name}</option>
                                ))}
                            </select>
                            <button onClick={() => handleOpenGroupModal()} className="btn btn-primary" style={{ fontSize: "0.9rem" }}>
                                + 新規グループ
                            </button>
                        </div>
                    }>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                                <thead>
                                    <tr>
                                        <TableHeader>操作</TableHeader>
                                        <TableHeader>アイコン</TableHeader>
                                        <TableHeader>グループ名</TableHeader>
                                        <TableHeader>テーマカラー</TableHeader>
                                        <TableHeader>ID</TableHeader>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groups.map(g => (
                                        <tr key={g.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ padding: "15px", borderBottom: "1px solid rgba(0,0,0,0.03)", display: "flex", gap: "8px" }}>
                                                <ActionButton onClick={() => handleOpenMessaging("group", g.id)} color="var(--primary)" label="✉" />
                                                <ActionButton onClick={() => handleViewMembers(g)} color="var(--color-blue)" label="メンバー" />
                                                <ActionButton onClick={() => handleOpenGroupModal(g)} color="var(--color-orange)" label="編集" />
                                                <ActionButton onClick={() => handleDeleteGroup(g.id)} color="var(--color-red)" label="削除" />
                                            </td>
                                            <td style={{ padding: "15px", borderBottom: "1px solid rgba(0,0,0,0.03)", fontSize: "1.8rem" }}>{g.emoji}</td>
                                            <TableCell bold>{g.name}</TableCell>
                                            <td style={{ padding: "15px", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: g.color, boxShadow: "var(--shadow-sm)" }}></div>
                                                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{g.color}</span>
                                                </div>
                                            </td>
                                            <TableCell>{g.id}</TableCell>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "invitations" && (
                    <SectionCard title="招待コード管理" count={invitations.length}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                                <thead>
                                    <tr>
                                        <TableHeader>操作</TableHeader>
                                        <TableHeader>割り当て所属</TableHeader>
                                        <TableHeader>作成者 (UID)</TableHeader>
                                        <TableHeader>作成日時</TableHeader>
                                        <TableHeader>コード</TableHeader>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invitations.map(invite => {
                                        const createdAt = invite.createdAt?.toDate();
                                        const isExpired = createdAt && (new Date() - createdAt > 1000 * 60 * 60 * 24);
                                        return (
                                            <tr key={invite.id} style={{ transition: "background 0.2s", opacity: isExpired ? 0.6 : 1 }}>
                                                <td style={{ padding: "12px 15px", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                                    <ActionButton onClick={() => handleDeleteInvitation(invite.id)} color="var(--color-red)" label="削除" />
                                                </td>
                                                <TableCell>{getAffiliationName(invite.affiliationId)}</TableCell>
                                                <TableCell style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{invite.createdBy?.substring(0, 8)}...</TableCell>
                                                <TableCell>{invite.createdAt?.toDate().toLocaleString()}</TableCell>
                                                <TableCell bold style={{ letterSpacing: "2px", fontSize: "1.1rem" }}>
                                                    {invite.code}
                                                    {isExpired && (
                                                        <span style={{ marginLeft: "10px", padding: "2px 6px", background: "var(--color-grey)", color: "var(--text-muted)", borderRadius: "4px", fontSize: "0.7rem" }}>期限切れ</span>
                                                    )}
                                                </TableCell>
                                            </tr>
                                        );
                                    })}
                                    {invitations.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                                                発行された招待コードはありません
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "messaging" && (
                    <SectionCard title="メッセージ送信">
                        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "30px", border: "1px solid rgba(0,0,0,0.05)" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>送信タイプ</label>
                                <select
                                    value={messageForm.type}
                                    onChange={(e) => setMessageForm({ ...messageForm, type: e.target.value, targetId: "" })}
                                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }}
                                >
                                    <option value="all">全体 (全員)</option>
                                    <option value="affiliation">特定の所属 (スクール等)</option>
                                    <option value="group">特定のグループ</option>
                                    <option value="user">特定のユーザー (個別)</option>
                                </select>
                            </div>

                            {messageForm.type === "affiliation" && (
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>送信先の所属</label>
                                    <select
                                        value={messageForm.targetId}
                                        onChange={(e) => setMessageForm({ ...messageForm, targetId: e.target.value })}
                                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }}
                                    >
                                        <option value="">所属を選択...</option>
                                        {affiliations.map(aff => (
                                            <option key={aff.id} value={aff.id}>{aff.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {messageForm.type === "group" && (
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>送信先のグループ</label>
                                    <select
                                        value={messageForm.targetId}
                                        onChange={(e) => setMessageForm({ ...messageForm, targetId: e.target.value })}
                                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }}
                                    >
                                        <option value="">グループを選択...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {messageForm.type === "user" && (
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>送信先のユーザー</label>
                                    <select
                                        value={messageForm.targetId}
                                        onChange={(e) => setMessageForm({ ...messageForm, targetId: e.target.value })}
                                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }}
                                    >
                                        <option value="">ユーザーを選択...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.displayName || "名前なし"} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>タイトル</label>
                                <input
                                    type="text"
                                    value={messageForm.title}
                                    onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                                    placeholder="例: システムメンテナンスのお知らせ"
                                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }}
                                />
                            </div>

                            <div style={{ marginBottom: "25px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>内容</label>
                                <textarea
                                    value={messageForm.content}
                                    onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                                    rows="5"
                                    placeholder="メッセージの詳細を入力してください..."
                                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd", resize: "vertical" }}
                                />
                            </div>

                            <button
                                onClick={handleSendMessage}
                                disabled={isSendingMessage}
                                className="btn btn-primary"
                                style={{ width: "100%", padding: "15px", fontSize: "1.1rem" }}
                            >
                                {isSendingMessage ? "送信中..." : "🚀 メッセージを送信する"}
                            </button>
                        </div>
                    </SectionCard>
                )}

                {activeTab === "requests" && (
                    <SectionCard title="申請・お問い合わせ" count={requests.length}>
                        {requests.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "60px 40px", color: "var(--text-muted)" }}>
                                <p style={{ fontSize: "4rem", margin: "0 0 20px 0" }}>📭</p>
                                <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>現在、未処理の申請はありません。</p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: "20px" }}>
                                {requests.map(req => (
                                    <div key={req.id} className="card" style={{
                                        border: "1px solid rgba(0,0,0,0.05)",
                                        padding: "24px",
                                        boxShadow: "var(--shadow-sm)",
                                        transition: "transform 0.2s",
                                        background: "#fff"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                                            <div>
                                                <h4 style={{ margin: "0 0 10px 0", color: "var(--text-main)", fontSize: "1.2rem", fontWeight: "800" }}>
                                                    {req.title}
                                                    {(req.title === "ゲーム作成" || req.title === "ゲーム変更") && (
                                                        <span style={{ marginLeft: "12px", padding: "4px 10px", background: "var(--color-purple)", color: "white", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "bold" }}>GAME</span>
                                                    )}
                                                    {(req.title === "ゲーム作成" || req.title === "ゲーム変更") && (
                                                        <a
                                                            href={`/games/${req.userId}.html`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ marginLeft: "12px", fontSize: "0.9rem", color: "#0984e3", textDecoration: "none", borderBottom: "1px dashed #0984e3" }}
                                                        >
                                                            🔗 ゲームを確認
                                                        </a>
                                                    )}
                                                </h4>
                                                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
                                                    <span style={{ display: "inline-block", marginRight: "16px" }}>👤 <strong>{req.userName}</strong></span>
                                                    <span style={{ display: "inline-block", marginRight: "16px" }}>📧 {req.email}</span>
                                                    <span style={{ display: "inline-block" }}>🕒 {req.createdAt?.toDate().toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleResolveRequest(req)}
                                                className="btn"
                                                style={{
                                                    background: "var(--color-green)",
                                                    color: "white",
                                                    fontSize: "0.9rem",
                                                    padding: "8px 20px"
                                                }}
                                            >
                                                ✓ 対応完了
                                            </button>
                                        </div>
                                        <div style={{
                                            background: "rgba(0,0,0,0.02)",
                                            padding: "20px",
                                            borderRadius: "12px",
                                            border: "1px solid rgba(0,0,0,0.03)",
                                            whiteSpace: "pre-wrap",
                                            color: "var(--text-main)",
                                            lineHeight: "1.7",
                                            fontSize: "0.95rem"
                                        }}>
                                            {req.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                )}

                {activeTab === "reports" && (
                    <SectionCard title="通報された投稿" count={reportedPosts.length}>
                        {reportedPosts.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                <p>通報された投稿はありません ✅</p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: "20px" }}>
                                {reportedPosts.map(post => (
                                    <div key={post.id} className="card" style={{ padding: "20px", border: post.hidden ? "2px solid var(--color-red)" : "1px solid #ddd", background: post.hidden ? "#fff5f5" : "white" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                            <div>
                                                <span style={{ fontWeight: "bold", marginRight: "10px" }}>{post.userName || "不明"}</span>
                                                <span style={{ fontSize: "0.8rem", color: "#666" }}>Report Count: {post.reportCount || 0}</span>
                                                {post.hidden && <span style={{ marginLeft: "10px", padding: "2px 6px", background: "var(--color-red)", color: "white", borderRadius: "4px", fontSize: "0.8rem" }}>非表示中</span>}
                                            </div>
                                            <span style={{ fontSize: "0.8rem", color: "#999" }}>{post.createdAt?.toDate().toLocaleString()}</span>
                                        </div>
                                        <div style={{ padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "8px", marginBottom: "15px", whiteSpace: "pre-wrap" }}>
                                            {post.text}
                                        </div>
                                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                            <button onClick={() => handleDismissReport(post.id)} className="btn" style={{ background: "#f1f2f6", color: "#333", fontSize: "0.9rem" }}>
                                                問題なし（クリア）
                                            </button>
                                            <button onClick={() => handleDeleteReportedPost(post.id)} className="btn" style={{ background: "var(--color-red)", color: "white", fontSize: "0.9rem" }}>
                                                削除する
                                            </button>
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
                                style={{ padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", flex: 1, fontSize: "1rem" }}
                            />
                            <button
                                onClick={handleAddNgWord}
                                disabled={!newNgWord.trim()}
                                className="btn"
                                style={{ background: "var(--color-red)", color: "white" }}
                            >
                                追加
                            </button>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                            {ngWords.length === 0 && <p style={{ color: "var(--text-muted)", padding: "20px" }}>設定されているNGワードはありません</p>}
                            {ngWords.map((word, i) => (
                                <span key={i} className="animate-pop" style={{
                                    background: "#ffeaa7", padding: "8px 16px", borderRadius: "20px",
                                    display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", color: "#d63031",
                                    boxShadow: "var(--shadow-sm)"
                                }}>
                                    {word}
                                    <button
                                        onClick={() => handleRemoveNgWord(word)}
                                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#d63031", padding: 0, display: "flex", alignItems: "center" }}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Modals with Glassmorphism */}
                {isGroupModalOpen && (
                    <div className="glass" style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
                        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000
                    }}>
                        <div className="card animate-pop" style={{ padding: "30px", width: "90%", maxWidth: "450px", border: "1px solid var(--glass-border)" }}>
                            <h3 style={{ marginTop: 0, marginBottom: "25px", fontSize: "1.5rem", color: "var(--text-main)", fontWeight: "900" }}>
                                {editingGroup ? "✏️ グループを編集" : "✨ 新しいグループを作成"}
                            </h3>

                            <div style={{ display: "grid", gap: "20px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "0.9rem", color: "var(--text-muted)" }}>ID (ユニークID)</label>
                                    <input
                                        type="text"
                                        value={groupForm.id}
                                        onChange={(e) => setGroupForm({ ...groupForm, id: e.target.value })}
                                        disabled={!!editingGroup}
                                        placeholder="例: music"
                                        style={{ width: "100%", padding: "12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", fontSize: "1rem" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "0.9rem", color: "var(--text-muted)" }}>グループ名</label>
                                    <input
                                        type="text"
                                        value={groupForm.name}
                                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                        placeholder="例: おんがく"
                                        style={{ width: "100%", padding: "12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", fontSize: "1rem" }}
                                    />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "0.9rem", color: "var(--text-muted)" }}>アイコン</label>
                                        <input
                                            type="text"
                                            value={groupForm.emoji}
                                            onChange={(e) => setGroupForm({ ...groupForm, emoji: e.target.value })}
                                            style={{ width: "100%", padding: "12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", fontSize: "1.2rem", textAlign: "center" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "0.9rem", color: "var(--text-muted)" }}>カラー</label>
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
                                <button onClick={() => setIsGroupModalOpen(false)} className="btn" style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-muted)" }}>キャンセル</button>
                                <button onClick={handleSaveGroup} className="btn btn-primary">保存する</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Affiliation Members View Modal */}
                {isAffMemberModalOpen && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
                        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000
                    }}>
                        <div className="card animate-pop" style={{ padding: "0", width: "95%", maxWidth: "550px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--glass-border)" }}>
                            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ margin: 0, color: "var(--text-main)", fontWeight: "800" }}>「{viewingAffiliation?.name}」のメンバー管理</h3>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>現在 {affMembers.length} 名が所属しています</p>
                                </div>
                                <button onClick={() => setIsAffMemberModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
                            </div>

                            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "0.85rem", color: "var(--text-muted)" }}>メンバーを追加</label>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <select
                                        value={selectedUserToAssign}
                                        onChange={(e) => setSelectedUserToAssign(e.target.value)}
                                        style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)", background: "white" }}
                                    >
                                        <option value="">ユーザーを選択...</option>
                                        {users
                                            .filter(u => !affMembers.find(m => m.id === u.id))
                                            .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""))
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.displayName || "名前なし"} ({u.email})</option>
                                            ))
                                        }
                                    </select>
                                    <button
                                        onClick={handleAssignToAffiliation}
                                        disabled={!selectedUserToAssign}
                                        className="btn btn-primary"
                                        style={{ padding: "8px 20px" }}
                                    >
                                        追加
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowY: "auto", padding: "0" }}>
                                {affMembers.length === 0 ? (
                                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>メンバーはいません</div>
                                ) : (
                                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                        {affMembers.map((m, i) => (
                                            <li key={m.id} style={{
                                                padding: "12px 24px",
                                                borderBottom: "1px solid rgba(0,0,0,0.03)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: i % 2 === 0 ? "white" : "rgba(0,0,0,0.01)"
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--color-grey)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>👤</div>
                                                    <div>
                                                        <div style={{ fontWeight: "700", color: "var(--text-main)" }}>{m.displayName || "名前なし"}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    {m.affiliationId === viewingAffiliation?.id && (
                                                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "var(--text-muted)" }}>メイン所属</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveFromAffiliation(m.id)}
                                                        style={{ background: "none", border: "none", color: "var(--color-red)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}
                                                    >
                                                        解除
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div style={{ padding: "15px 24px", borderTop: "1px solid rgba(0,0,0,0.05)", textAlign: "right", background: "#fbfbfb" }}>
                                <button onClick={() => setIsAffMemberModalOpen(false)} className="btn" style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "var(--text-muted)" }}>閉じる</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Members View Modal */}
                {isMembersModalOpen && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
                        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000
                    }}>
                        <div className="card animate-pop" style={{ padding: "0", width: "95%", maxWidth: "500px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--glass-border)" }}>
                            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 style={{ margin: 0, color: "var(--text-main)", fontWeight: "800" }}>「{viewingGroupName}」のメンバー <span style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: "normal" }}>{viewingMembers.length}名</span></h3>
                                <button onClick={() => setIsMembersModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
                            </div>

                            <div style={{ overflowY: "auto", padding: "0" }}>
                                {viewingMembers.length === 0 ? (
                                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>メンバーはいません</div>
                                ) : (
                                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                        {viewingMembers.map((m, i) => (
                                            <li key={m.uid} style={{
                                                padding: "15px 24px",
                                                borderBottom: "1px solid rgba(0,0,0,0.03)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "15px",
                                                background: i % 2 === 0 ? "white" : "rgba(0,0,0,0.01)"
                                            }}>
                                                {m.photoURL ? (
                                                    <img src={m.photoURL} alt="" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", boxShadow: "var(--shadow-sm)" }} />
                                                ) : (
                                                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--color-grey)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>👤</div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: "700", color: "var(--text-main)", fontSize: "1.05rem" }}>{m.displayName}</div>
                                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>参加日: {m.joinedAt?.toDate().toLocaleDateString()}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div style={{ padding: "15px 24px", borderTop: "1px solid rgba(0,0,0,0.05)", textAlign: "right", background: "#fbfbfb" }}>
                                <button onClick={() => setIsMembersModalOpen(false)} className="btn" style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "var(--text-muted)" }}>閉じる</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

