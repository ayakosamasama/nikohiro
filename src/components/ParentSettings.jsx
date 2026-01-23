"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { getAffiliations } from "../services/affiliationService";
import { createInvitation, validateInvitation } from "../services/invitationService"; // Added imports
import { addRequest } from "../services/requestService";
import { subscribeToMessages, markAsRead, deleteUserMessage } from "../services/messageService";
import { updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function ParentSettings({ isOpen, onClose }) {
    const { user, profile, groupIds, unreadMessageCount, refreshProfile, logout } = useAuth(); // Destructure logout

    // Gatekeeper State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputPin, setInputPin] = useState("");
    const [authError, setAuthError] = useState("");

    // Settings State
    const [activeTab, setActiveTab] = useState("quiz"); // "quiz", "time", "password", "request", "affiliation"
    const [loading, setLoading] = useState(false);

    const [quizSettings, setQuizSettings] = useState({
        maxAnswer: 2,
        operations: ["add"],
        categories: ["arithmetic"] // default
    });

    // Password Settings
    const [newChildPassword, setNewChildPassword] = useState("");
    const [newParentPin, setNewParentPin] = useState("");
    const [currentParentPin, setCurrentParentPin] = useState("2525"); // Fetched from DB

    // Request System State
    const [reqTitle, setReqTitle] = useState("");
    const [reqContent, setReqContent] = useState("");

    // Time Limit State
    const [usageLimit, setUsageLimit] = useState({ enabled: false, start: "21:00", end: "07:00" });
    const [gameTimeLimit, setGameTimeLimit] = useState(15); // Default 15 minutes per session
    const [totalGameTimeLimit, setTotalGameTimeLimit] = useState(60); // Default 60 minutes per day
    const [gameFeatureEnabled, setGameFeatureEnabled] = useState(true); // Default true
    const [mediaUploadEnabled, setMediaUploadEnabled] = useState(true); // Default true
    const [mediaViewEnabled, setMediaViewEnabled] = useState(true); // Default true
    const [showPets, setShowPets] = useState(true);

    // Affiliation State
    const [affiliations, setAffiliations] = useState([]); // Affiliations list
    const [selectedAffiliations, setSelectedAffiliations] = useState([]); // User's affiliations (Array)
    const [invitationCode, setInvitationCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState(null);

    // Messaging State
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        if (isOpen && user) {
            // Reset state on open
            setIsAuthenticated(false);
            setInputPin("");
            setAuthError("");
            loadSettings();
            // Fetch affiliations when component opens
            getAffiliations().then(data => setAffiliations(data)).catch(console.error);
        }
    }, [isOpen, user]);

    // Subscribe to messages when authenticated and open
    useEffect(() => {
        if (isOpen && isAuthenticated && user) {
            const unsub = subscribeToMessages({
                uid: user.uid,
                affiliationIds: selectedAffiliations,
                groupIds: groupIds
            }, (msgs) => {
                // Sort messages: newest first
                const sorted = [...msgs].sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
                setMessages(sorted);
            });
            return () => unsub();
        }
    }, [isOpen, isAuthenticated, user, selectedAffiliations, groupIds]);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                // Load Quiz Settings
                if (profile.quizSettings) {
                    setQuizSettings(profile.quizSettings);
                }
                // Load Parent PIN (keep local for check)
                if (profile.parentPassword) {
                    setCurrentParentPin(profile.parentPassword);
                } else {
                    setCurrentParentPin("2525"); // Default
                }
                // Load Time Limit
                if (profile.usageLimit) {
                    setUsageLimit(profile.usageLimit);
                } else {
                    setUsageLimit({ enabled: false, start: "21:00", end: "06:00" });
                }
                // Load Game Time Limit
                if (profile.gameTimeLimit !== undefined) {
                    setGameTimeLimit(profile.gameTimeLimit);
                }
                if (profile.totalGameTimeLimit !== undefined) {
                    setTotalGameTimeLimit(profile.totalGameTimeLimit);
                }
                if (profile.settings && profile.settings.gameFeatureEnabled !== undefined) {
                    setGameFeatureEnabled(profile.settings.gameFeatureEnabled);
                }
                if (profile.settings && profile.settings.mediaUploadEnabled !== undefined) {
                    setMediaUploadEnabled(profile.settings.mediaUploadEnabled);
                }
                if (profile.settings && profile.settings.mediaViewEnabled !== undefined) {
                    setMediaViewEnabled(profile.settings.mediaViewEnabled);
                }
                // Load Show Pets
                if (profile.settings && profile.settings.showPets !== undefined) {
                    setShowPets(profile.settings.showPets);
                }
                // Load Affiliation
                const loadedAffiliations = profile.affiliations || (profile.affiliationId ? [profile.affiliationId] : []);
                setSelectedAffiliations(loadedAffiliations);
            }
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const handleLogin = () => {
        if (inputPin === currentParentPin) {
            setIsAuthenticated(true);
            setAuthError("");
        } else {
            setAuthError("パスワードがちがいます");
        }
    };

    const handleSaveSettings = async () => {
        if (!user) return;

        // Dirty checking
        const hasChanges =
            JSON.stringify(quizSettings) !== JSON.stringify(profile?.quizSettings || { maxAnswer: 2, operations: ["add"], categories: ["arithmetic"] }) ||
            JSON.stringify(usageLimit) !== JSON.stringify(profile?.usageLimit || { enabled: false, start: "21:00", end: "07:00" }) ||
            gameTimeLimit !== (profile?.gameTimeLimit ?? 15) ||
            totalGameTimeLimit !== (profile?.totalGameTimeLimit ?? 60) ||
            gameFeatureEnabled !== (profile?.settings?.gameFeatureEnabled ?? true) ||
            mediaUploadEnabled !== (profile?.settings?.mediaUploadEnabled ?? true) ||
            mediaViewEnabled !== (profile?.settings?.mediaViewEnabled ?? true) ||
            showPets !== (profile?.settings?.showPets ?? true) ||
            JSON.stringify(selectedAffiliations) !== JSON.stringify(profile?.affiliations || (profile?.affiliationId ? [profile?.affiliationId] : []));

        if (!hasChanges) {
            onClose();
            return;
        }

        setLoading(true);
        try {
            await updateUserProfile(user.uid, {
                quizSettings,
                usageLimit,
                gameTimeLimit,
                totalGameTimeLimit,
                "settings.gameFeatureEnabled": gameFeatureEnabled,
                "settings.mediaUploadEnabled": mediaUploadEnabled,
                "settings.mediaViewEnabled": mediaViewEnabled,
                "settings.showPets": showPets,
                affiliations: selectedAffiliations, // Save array
                affiliationId: selectedAffiliations.length > 0 ? selectedAffiliations[0] : null // Primary (Legacy)
            });
            alert("設定を保存しました！");
            await refreshProfile(); // Refresh context without reload
            onClose();
        } catch (error) {
            alert("保存に失敗しました");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeChildPassword = async () => {
        if (!user || !newChildPassword) return;
        if (newChildPassword.length < 6) {
            alert("パスワードは6文字以上にしてください");
            return;
        }
        setLoading(true);
        try {
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, newChildPassword);
                alert("お子様のパスワードを変更しました！");
                setNewChildPassword("");
            }
        } catch (error) {
            console.error(error);
            alert("変更に失敗しました。一度ログアウトしてから再試行してください。(" + error.message + ")");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeParentPin = async () => {
        if (!user || !newParentPin) return;
        setLoading(true);
        try {
            await updateUserProfile(user.uid, {
                parentPassword: newParentPin
            });
            setCurrentParentPin(newParentPin);
            alert("保護者用パスワードを変更しました！");
            setNewParentPin("");
        } catch (error) {
            console.error(error);
            alert("変更に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm("ログアウトしますか？")) {
            await logout();
            onClose();
        }
    };

    const handleSubmitRequest = async () => {
        if (!user || !reqTitle.trim() || !reqContent.trim()) return;
        setLoading(true);
        try {
            const userName = user.displayName || "No Name";
            await addRequest(user.uid, userName, user.email, reqTitle, reqContent);
            alert("申請を送信しました！");
            setReqTitle("");
            setReqContent("");
        } catch (error) {
            console.error(error);
            alert("送信に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const toggleOperation = (op) => {
        setQuizSettings(prev => {
            const current = prev.operations || [];
            if (current.includes(op)) {
                // Don't allow empty
                if (current.length === 1) return prev;
                return { ...prev, operations: current.filter(o => o !== op) };
            } else {
                return { ...prev, operations: [...current, op] };
            }
        });
    };

    const toggleArrayItem = (key, item) => {
        setQuizSettings(prev => {
            const current = prev[key] || [];
            if (current.includes(item)) {
                return { ...prev, [key]: current.filter(i => i !== item) };
            } else {
                return { ...prev, [key]: [...current, item] };
            }
        });
    };

    const handleJoinAffiliation = async () => {
        if (!invitationCode) return;
        setLoading(true);
        try {
            const affiliationId = await validateInvitation(invitationCode);

            // Check if already joined
            if (selectedAffiliations.includes(affiliationId)) {
                alert("すでに参加しています");
                setLoading(false);
                return;
            }

            // Add and Save
            const newAffiliations = [...selectedAffiliations, affiliationId];
            setSelectedAffiliations(newAffiliations);

            // Save to DB immediately
            await updateUserProfile(user.uid, {
                affiliations: newAffiliations,
                affiliationId: newAffiliations[0] // Default to first if needed
            });

            alert("グループに参加しました！");
            setInvitationCode("");
            await refreshProfile();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvitation = async (affiliationId) => {
        setLoading(true);
        try {
            const code = await createInvitation(affiliationId, user.uid);
            setGeneratedCode(code);
        } catch (error) {
            console.error(error);
            alert("招待コードの発行に失敗しました: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReadMessage = async (msgId) => {
        try {
            await markAsRead(user.uid, msgId);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!confirm("このメッセージを削除しますか？")) return;
        try {
            await deleteUserMessage(user.uid, msgId);
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2000,
            display: "flex", justifyContent: "center", alignItems: "center"
        }}>
            <div style={{
                backgroundColor: "white", padding: "30px", borderRadius: "20px",
                width: "95%", maxWidth: "600px",
                maxHeight: "90vh", overflowY: "auto",
                border: "4px solid #666",
                color: "#333" // Reset text color to dark
            }}>
                <h2 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>
                    👨‍👩‍👧‍👦 おうちのひとへ
                </h2>

                {!isAuthenticated && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
                        style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
                    >
                        <h3 style={{ marginBottom: "20px" }}>保護者用設定</h3>
                        <p style={{ marginBottom: "30px", color: "#666" }}>パスワード（暗証番号）を入力してください（初期: 2525）</p>

                        <input
                            id="tutorial-parent-pin-input"
                            type="text"
                            autoComplete="off"
                            name="p-pin-gatekeeper"
                            value={inputPin}
                            onChange={(e) => setInputPin(e.target.value)}
                            placeholder="****"
                            style={{
                                fontSize: "2rem", textAlign: "center", letterSpacing: "10px",
                                width: "200px", padding: "10px", marginBottom: "20px",
                                WebkitTextSecurity: "disc",
                                textSecurity: "disc" // Standard if supported
                            }}
                        />

                        {authError && <p style={{ color: "#d63031", marginBottom: "20px" }}>{authError}</p>}

                        <button
                            type="submit"
                            className="btn"
                            disabled={loading}
                            style={{ width: "200px", padding: "12px", borderRadius: "10px", fontWeight: "bold" }}
                        >
                            {loading ? "確認中..." : "開く"}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                marginTop: "20px",
                                background: "none",
                                border: "none",
                                color: "#888",
                                textDecoration: "underline",
                                cursor: "pointer",
                                fontSize: "0.9rem"
                            }}
                        >
                            キャンセル
                        </button>
                    </form>
                )}
                {isAuthenticated && (
                    // Settings Content
                    <div>
                        <div style={{
                            display: "flex",
                            width: "100%",
                            borderBottom: "1px solid #ddd",
                            marginBottom: "20px",
                            overflowX: "auto",
                            overflowY: "hidden",
                            WebkitOverflowScrolling: "touch",
                            boxSizing: "border-box",
                            paddingBottom: "5px" // Room for scrollbar
                        }}>
                            {[
                                { id: "quiz", label: "クイズ", tid: "tutorial-tab-quiz" },
                                { id: "time", label: "機能設定", tid: "tutorial-tab-time" },
                                { id: "password", label: "パスワード", tid: "tutorial-tab-password" },
                                { id: "request", label: "申請・要望", tid: "tutorial-tab-request" },
                                { id: "affiliation", label: "所属", tid: "tutorial-tab-affiliation" },
                                { id: "messages", label: `新着 (${unreadMessageCount})` },
                                { id: "release", label: "更新" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    id={tab.tid}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: "10px 15px", whiteSpace: "nowrap", flexShrink: 0,
                                        minWidth: "fit-content", boxSizing: "border-box",
                                        background: activeTab === tab.id ? "#eee" : "transparent",
                                        border: "none", fontWeight: "bold",
                                        borderBottom: activeTab === tab.id ? "3px solid var(--primary)" : "none"
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                            {/* Large spacer to ensure the last tab isn't cut off during scrolling */}
                            <div style={{ flexShrink: 0, width: "100px" }}></div>
                        </div>

                        {activeTab === "quiz" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                                {/* 1. Quiz Timing */}
                                <section style={{ border: "1px solid #eee", padding: "15px", borderRadius: "12px" }}>
                                    <h4 style={{ margin: "0 0 15px 0", color: "#2980b9", borderBottom: "2px solid #d6eaf8", display: "inline-block" }}>⏱️ クイズのタイミング</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={quizSettings.quizBeforePost !== false} // Default true
                                                onChange={(e) => setQuizSettings({ ...quizSettings, quizBeforePost: e.target.checked })}
                                                style={{ transform: "scale(1.3)", marginRight: "8px" }}
                                            />
                                            投稿の前にクイズをだす
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={quizSettings.quizBeforeGame === true} // Default false
                                                onChange={(e) => setQuizSettings({ ...quizSettings, quizBeforeGame: e.target.checked })}
                                                style={{ transform: "scale(1.3)", marginRight: "8px" }}
                                            />
                                            ゲームの前にクイズをだす
                                        </label>

                                        <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                                            <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px", fontSize: "0.9rem" }}>クイズの出題数 (1〜10問)</label>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={quizSettings.quizQuestionCount || 1}
                                                    onChange={(e) => setQuizSettings({ ...quizSettings, quizQuestionCount: parseInt(e.target.value) })}
                                                    style={{ flex: 1 }}
                                                />
                                                <span style={{ fontWeight: "bold", fontSize: "1.1rem", width: "40px", textAlign: "right" }}>{quizSettings.quizQuestionCount || 1}問</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. Arithmetic & Shapes */}
                                <section style={{ border: "1px solid #eee", padding: "15px", borderRadius: "12px" }}>
                                    <h4 style={{ margin: "0 0 15px 0", color: "var(--primary)", borderBottom: "2px solid var(--primary-light)", display: "inline-block" }}>🔢 算数・図形</h4>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px", fontSize: "0.9rem" }}>計算（けいさん）</label>
                                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                            {["add", "sub", "mul", "div"].map(op => (
                                                <label key={op} style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                                    <input type="checkbox" checked={quizSettings.operations?.includes(op)} onChange={() => toggleOperation(op)} style={{ transform: "scale(1.3)", marginRight: "6px" }} />
                                                    {op === "add" ? "たしざん (+)" : op === "sub" ? "ひきざん (-)" : op === "mul" ? "かけざん (×)" : "わりざん (÷)"}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px", fontSize: "0.9rem" }}>答えの最大数 (1〜100)</label>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <input type="range" min="1" max="100" value={quizSettings.maxAnswer} onChange={(e) => setQuizSettings({ ...quizSettings, maxAnswer: parseInt(e.target.value) })} style={{ flex: 1 }} />
                                            <span style={{ fontWeight: "bold", fontSize: "1.1rem", width: "40px" }}>{quizSettings.maxAnswer}</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px", fontSize: "0.9rem" }}>図形（ずけい）</label>
                                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                                <input type="checkbox" checked={quizSettings.types?.includes("shape_10frame")} onChange={() => toggleArrayItem("types", "shape_10frame")} style={{ transform: "scale(1.3)", marginRight: "6px" }} />
                                                あといくつで10？
                                            </label>
                                            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                                <input type="checkbox" checked={quizSettings.types?.includes("shape_blocks")} onChange={() => toggleArrayItem("types", "shape_blocks")} style={{ transform: "scale(1.3)", marginRight: "6px" }} />
                                                積み木 数え
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                {/* 3. Language */}
                                <section style={{ border: "1px solid #eee", padding: "15px", borderRadius: "12px" }}>
                                    <h4 style={{ margin: "0 0 15px 0", color: "#e67e22", borderBottom: "2px solid #ffedd5", display: "inline-block" }}>📚 ことば・語彙</h4>
                                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                            <input type="checkbox" checked={quizSettings.types?.includes("lang_opposites")} onChange={() => toggleArrayItem("types", "lang_opposites")} style={{ transform: "scale(1.3)", marginRight: "6px" }} />
                                            反対のことば
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem" }}>
                                            <input type="checkbox" checked={quizSettings.types?.includes("lang_odd_one")} onChange={() => toggleArrayItem("types", "lang_odd_one")} style={{ transform: "scale(1.3)", marginRight: "6px" }} />
                                            仲間外れ探し
                                        </label>
                                    </div>
                                </section>

                                <button onClick={handleSaveSettings} disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: "1.1rem" }}>
                                    設定を保存する
                                </button>
                            </div>
                        )}

                        {activeTab === "time" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                {/* 1. Sleep Mode */}
                                <section style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", backgroundColor: "#fff" }}>
                                    <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50", display: "flex", alignItems: "center", gap: "8px" }}>
                                        🌙 おやすみモード
                                    </h3>
                                    <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
                                        指定した時間はアプリを使えなくします。（夜更かし防止など）
                                    </p>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={usageLimit.enabled}
                                                onChange={(e) => setUsageLimit({ ...usageLimit, enabled: e.target.checked })}
                                                style={{ transform: "scale(1.4)" }}
                                            />
                                            機能を有効にする
                                        </label>
                                    </div>

                                    {usageLimit.enabled && (
                                        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginTop: "10px" }}>
                                            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                                <div style={{ flex: 1, minWidth: "140px" }}>
                                                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" }}>開始時間（寝る）</label>
                                                    <input
                                                        type="time"
                                                        value={usageLimit.start}
                                                        onChange={(e) => setUsageLimit({ ...usageLimit, start: e.target.value })}
                                                        style={{ fontSize: "1.1rem", padding: "8px", width: "100%", borderRadius: "6px", border: "1px solid #ddd" }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, minWidth: "140px" }}>
                                                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" }}>終了時間（起きる）</label>
                                                    <input
                                                        type="time"
                                                        value={usageLimit.end}
                                                        onChange={(e) => setUsageLimit({ ...usageLimit, end: e.target.value })}
                                                        style={{ fontSize: "1.1rem", padding: "8px", width: "100%", borderRadius: "6px", border: "1px solid #ddd" }}
                                                    />
                                                </div>
                                            </div>
                                            <p style={{ color: "var(--color-red)", fontSize: "0.85rem", marginTop: "10px" }}>
                                                ※ {usageLimit.start} から {usageLimit.end} の間はアプリが開けなくなります。
                                            </p>
                                        </div>
                                    )}
                                </section>

                                {/* 2. Game Features */}
                                <section style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", backgroundColor: "#fff" }}>
                                    <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50", display: "flex", alignItems: "center", gap: "8px" }}>
                                        🎮 ゲーム機能
                                    </h3>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={gameFeatureEnabled}
                                                onChange={(e) => setGameFeatureEnabled(e.target.checked)}
                                                style={{ transform: "scale(1.4)" }}
                                            />
                                            機能を有効にする
                                        </label>
                                        <p style={{ fontSize: "0.9rem", color: "#666", marginLeft: "28px", marginTop: "5px" }}>
                                            チェックを外すと、ゲームの作成やプレイボタンが表示されなくなります。
                                        </p>
                                    </div>

                                    {gameFeatureEnabled && (
                                        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginTop: "10px" }}>
                                            <div style={{ marginBottom: "15px" }}>
                                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" }}>1回あたりのプレイ時間</label>
                                                <select
                                                    value={gameTimeLimit}
                                                    onChange={(e) => setGameTimeLimit(parseInt(e.target.value))}
                                                    style={{ fontSize: "1.0rem", padding: "8px", borderRadius: "6px", width: "100%", border: "1px solid #ddd" }}
                                                >
                                                    <option value={5}>5分</option>
                                                    <option value={10}>10分</option>
                                                    <option value={15}>15分</option>
                                                    <option value={30}>30分</option>
                                                    <option value={45}>45分</option>
                                                    <option value={60}>60分</option>
                                                    <option value={0}>制限なし</option>
                                                </select>
                                            </div>

                                            <div style={{ marginBottom: "0" }}>
                                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" }}>1日の合計プレイ時間</label>
                                                <select
                                                    value={totalGameTimeLimit}
                                                    onChange={(e) => setTotalGameTimeLimit(parseInt(e.target.value))}
                                                    style={{ fontSize: "1.0rem", padding: "8px", borderRadius: "6px", width: "100%", border: "1px solid #ddd" }}
                                                >
                                                    <option value={15}>15分</option>
                                                    <option value={30}>30分</option>
                                                    <option value={60}>1時間</option>
                                                    <option value={90}>1時間30分</option>
                                                    <option value={120}>2時間</option>
                                                    <option value={0}>制限なし</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* 3. Media Features */}
                                <section style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", backgroundColor: "#fff" }}>
                                    <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50", display: "flex", alignItems: "center", gap: "8px" }}>
                                        📷 画像・動画機能
                                    </h3>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={mediaUploadEnabled}
                                                onChange={(e) => setMediaUploadEnabled(e.target.checked)}
                                                style={{ transform: "scale(1.4)" }}
                                            />
                                            写真・動画の投稿を許可する
                                        </label>
                                        <p style={{ fontSize: "0.9rem", color: "#666", marginLeft: "28px", marginTop: "5px" }}>
                                            チェックを外すと、カメラボタンが表示されなくなります。
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: "5px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={mediaViewEnabled}
                                                onChange={(e) => setMediaViewEnabled(e.target.checked)}
                                                style={{ transform: "scale(1.4)" }}
                                            />
                                            タイムラインでの表示を許可する
                                        </label>
                                        <p style={{ fontSize: "0.9rem", color: "#666", marginLeft: "28px", marginTop: "5px" }}>
                                            チェックを外すと、他の人の投稿した画像や動画が表示されなくなります。
                                        </p>
                                    </div>
                                </section>

                                {/* 4. Pet Features */}
                                <section style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", backgroundColor: "#fff" }}>
                                    <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50", display: "flex", alignItems: "center", gap: "8px" }}>
                                        🐶 ペット機能
                                    </h3>
                                    <div style={{ marginBottom: "5px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={showPets}
                                                onChange={(e) => setShowPets(e.target.checked)}
                                                style={{ transform: "scale(1.4)" }}
                                            />
                                            ペットを表示する
                                        </label>
                                        <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "5px", marginLeft: "28px" }}>
                                            チェックを外すと、ペットのお世話や表示が隠れます。
                                        </p>
                                    </div>
                                </section>

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ width: "100%", padding: "12px", marginTop: "20px" }}
                                >
                                    設定を保存する
                                </button>
                            </div>
                        )}

                        {activeTab === "password" && (
                            <div>
                                <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "10px" }}>
                                    <h4 style={{ marginBottom: "10px" }}>お子様のログインパスワード変更</h4>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        name="new-child-password"
                                        placeholder="新しいパスワード（6文字以上）"
                                        value={newChildPassword}
                                        onChange={(e) => setNewChildPassword(e.target.value)}
                                        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
                                    />
                                    <button onClick={handleChangeChildPassword} disabled={loading || !newChildPassword} className="btn" style={{ background: "#444", color: "white", width: "100%" }}>
                                        変更する
                                    </button>
                                </div>

                                <div style={{ padding: "15px", backgroundColor: "#fff0f0", borderRadius: "10px" }}>
                                    <h4 style={{ marginBottom: "10px", color: "#d63031" }}>保護者用パスワード変更</h4>
                                    <p style={{ fontSize: "0.9rem", marginBottom: "10px" }}>現在の設定画面に入るためのパスワードです。</p>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        name="new-parent-pin"
                                        placeholder="新しいパスワード"
                                        value={newParentPin}
                                        onChange={(e) => setNewParentPin(e.target.value)}
                                        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
                                    />
                                    <button onClick={handleChangeParentPin} disabled={loading || !newParentPin} className="btn" style={{ background: "#d63031", color: "white", width: "100%" }}>
                                        変更する
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "request" && (
                            <div>
                                <h3 style={{ marginBottom: "15px" }}>運営への申請・お問い合わせ</h3>
                                <p style={{ fontSize: "0.9rem", marginBottom: "20px", color: "#666" }}>
                                    機能の要望や、不具合の報告、その他お問い合わせはこちらからお送りください。<br />
                                    システム管理者が確認いたします。
                                </p>
                                <div style={{ marginBottom: "15px" }}>
                                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>タイトル</label>
                                    <input
                                        type="text"
                                        value={reqTitle}
                                        onChange={(e) => setReqTitle(e.target.value)}
                                        placeholder="例：〇〇機能を追加してほしい"
                                        style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
                                    />
                                </div>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>内容</label>
                                    <textarea
                                        value={reqContent}
                                        onChange={(e) => setReqContent(e.target.value)}
                                        placeholder="詳しい内容を入力してください"
                                        style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", minHeight: "100px" }}
                                    />
                                </div>
                                <button
                                    onClick={handleSubmitRequest}
                                    disabled={loading || !reqTitle.trim() || !reqContent.trim()}
                                    className="btn btn-primary"
                                    style={{ width: "100%", padding: "12px" }}
                                >
                                    送信する
                                </button>
                            </div>
                        )}

                        {activeTab === "affiliation" && (
                            <div>
                                <h3 style={{ marginBottom: "15px" }}>所属の設定</h3>
                                <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "20px" }}>
                                    新しいグループに参加するには、招待コードを入力してください。<br />
                                    参加中のグループにお友達を招待したいときは、「招待する」ボタンからコードを発行できます。
                                </p>

                                {/* Invitation Code Input */}
                                <div style={{ marginBottom: "30px", padding: "20px", background: "#f0f8ff", borderRadius: "12px", border: "1px solid #bde0fe" }}>
                                    <h4 style={{ margin: "0 0 10px 0", color: "#0077b6" }}>📩 招待コードを入力</h4>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            name="invitation-code-input"
                                            value={invitationCode}
                                            onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                            placeholder="例: A1B2C3"
                                            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1.1rem", letterSpacing: "2px" }}
                                        />
                                        <button
                                            onClick={handleJoinAffiliation}
                                            disabled={loading || !invitationCode}
                                            className="btn btn-primary"
                                            style={{ padding: "10px 20px" }}
                                        >
                                            参加する
                                        </button>
                                    </div>
                                </div>

                                <h4 style={{ marginBottom: "10px" }}>参加中の所属</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {selectedAffiliations.map(affId => {
                                        // Find name from affiliations list (fetched on load)
                                        const affData = affiliations.find(a => a.id === affId) || { name: affId === "default" ? "所属なし（共通）" : "読み込み中..." };

                                        return (
                                            <div key={affId} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "15px",
                                                border: "2px solid #eee",
                                                borderRadius: "10px",
                                                backgroundColor: "white"
                                            }}>
                                                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{affData.name}</span>

                                                {/* Actions */}
                                                <div style={{ display: "flex", gap: "10px" }}>
                                                    {affId !== "default" && (
                                                        <button
                                                            onClick={() => handleGenerateInvitation(affId)}
                                                            className="btn"
                                                            style={{
                                                                background: "#e3f2fd", color: "#1976d2", border: "none",
                                                                padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "0.9rem"
                                                            }}
                                                        >
                                                            招待する
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Generated Code Modal/Display */}
                                {generatedCode && (
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        style={{ marginTop: "20px", padding: "15px", background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: "8px", textAlign: "center" }}
                                    >
                                        <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#856404" }}>招待コードを発行しました！</p>
                                        <p style={{ fontSize: "2rem", letterSpacing: "5px", margin: "10px 0", fontWeight: "bold" }}>
                                            {generatedCode}
                                        </p>
                                        <p style={{ fontSize: "0.85rem", color: "#856404" }}>
                                            このコードをお友達に教えてあげてください。<br />
                                            <strong>※ 有効期限は発行から24時間です。</strong>
                                        </p>
                                        <button onClick={() => setGeneratedCode(null)} style={{ marginTop: "10px", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>閉じる</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "messages" && (
                            <div>
                                <h3 style={{ marginBottom: "15px" }}>📩 メッセージ</h3>
                                {messages.length === 0 ? (
                                    <div style={{ padding: "40px", textAlign: "center", color: "#666", background: "#f9f9f9", borderRadius: "10px" }}>
                                        メッセージはありません
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {messages.map(msg => (
                                            <div key={msg.id} style={{
                                                padding: "15px",
                                                border: "2px solid #eee",
                                                borderRadius: "15px",
                                                backgroundColor: msg.status.read ? "white" : "#fff9db",
                                                position: "relative",
                                                transition: "all 0.2s"
                                            }}>
                                                {!msg.status.read && (
                                                    <span style={{
                                                        position: "absolute", top: "10px", right: "10px",
                                                        background: "var(--color-red)", color: "white",
                                                        fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
                                                        fontWeight: "bold"
                                                    }}>
                                                        NEW
                                                    </span>
                                                )}
                                                <h4 style={{ margin: "0 0 8px 0", paddingRight: "40px" }}>{msg.title}</h4>
                                                <p style={{ margin: "0 0 10px 0", fontSize: "0.95rem", whiteSpace: "pre-wrap", color: "#444" }}>
                                                    {msg.content}
                                                </p>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                                                    <span style={{ fontSize: "0.8rem", color: "#888" }}>
                                                        {msg.createdAt?.toDate().toLocaleString() || "日時不明"}
                                                    </span>
                                                    <div style={{ display: "flex", gap: "10px" }}>
                                                        {!msg.status.read && (
                                                            <button
                                                                onClick={() => handleReadMessage(msg.id)}
                                                                style={{ border: "none", background: "none", color: "var(--primary)", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" }}
                                                            >
                                                                既読にする
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            style={{ border: "none", background: "none", color: "#e74c3c", cursor: "pointer", fontSize: "0.85rem" }}
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "release" && (
                            <div>
                                <h3 style={{ marginBottom: "15px" }}>🚀 リリースノート</h3>
                                <div style={{
                                    backgroundColor: "#f9f9f9",
                                    padding: "20px",
                                    borderRadius: "15px",
                                    fontSize: "0.95rem",
                                    lineHeight: "1.6",
                                    maxHeight: "400px",
                                    overflowY: "auto",
                                    border: "1px solid #eee"
                                }}>
                                    <h4 style={{ color: "var(--primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "5px" }}>v1.0.0-beta (初回テストリリース)</h4>
                                    <p style={{ marginTop: "10px" }}>初回のテストリリースにて提供される、「にこにこひろば」の全機能一覧です。</p>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>📱 アプリ機能一覧</h5>
                                    <div style={{ paddingLeft: "10px" }}>
                                        <p style={{ fontWeight: "bold", margin: "10px 0 5px 0" }}>💬 コミュニケーション (SNS)</p>
                                        <ul style={{ paddingLeft: "20px" }}>
                                            <li><strong>タイムライン</strong>: テキストを使った投稿が可能です。</li>
                                            <li><strong>リアクション</strong>: スタンプを使ってお友達の投稿に反応できます。</li>
                                            <li><strong>グループ機能</strong>: 仲良しの友達や所属ごとのグループで会話ができます。</li>
                                        </ul>

                                        <p style={{ fontWeight: "bold", margin: "15px 0 5px 0" }}>🎮 ゲーム・お楽しみ要素</p>
                                        <ul style={{ paddingLeft: "20px" }}>
                                            <li><strong>プロフィール＆ペット</strong>: 投稿でXPを獲得してペットを育てられます。</li>
                                            <li><strong>にこにこクイズ</strong>: 投稿前の学習クイズ。年齢に合わせて難易度調整が可能です。</li>
                                            <li><strong>ゲーム作成リクエスト</strong>: 自分の考えたゲームをリクエストしたり、おともだちのゲームを遊べます。自分の想いを言葉にする練習にもなります。</li>
                                        </ul>

                                        <p style={{ fontWeight: "bold", margin: "15px 0 5px 0" }}>🛡️ 安心・安全設計</p>
                                        <ul style={{ paddingLeft: "20px" }}>
                                            <li><strong>ひらがなモード</strong>: UIは平仮名を中心に設計されています。</li>
                                            <li><strong>使いすぎ防止機能</strong>: おやすみモードやゲーム時間制限で健全な利用をサポートします。</li>
                                            <li><strong>NGワードフィルター</strong>: 不適切な言葉の投稿を自動でブロックします。</li>
                                        </ul>
                                    </div>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>🛠️ システム管理者機能</h5>
                                    <ul style={{ paddingLeft: "20px" }}>
                                        <li><strong>ユーザー・組織管理</strong>: 登録情報や所属・グループの一元管理。</li>
                                        <li><strong>リクエスト対応</strong>: ゲーム作成リクエストの処理とゲームURLの自動連携。</li>
                                        <li><strong>システム設定</strong>: NGワードの管理や開発者向けツール。</li>
                                    </ul>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>⚠️ 注意点</h5>
                                    <p style={{ fontSize: "0.85rem", color: "#666" }}>
                                        ※ 今回のリリースはテスト版です。データのバックアップは定期的に行われています。
                                    </p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button onClick={handleLogout} className="btn" style={{ color: "#d63031", background: "none", border: "1px solid #d63031", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}>
                                ログアウト
                            </button>
                            <button onClick={onClose} style={{ color: "#888", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
                                閉じる
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
