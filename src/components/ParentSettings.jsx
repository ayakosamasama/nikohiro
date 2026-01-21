"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { getAffiliations } from "../services/affiliationService"; // Import affiliation service
import { addRequest } from "../services/requestService";
import { updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function ParentSettings({ isOpen, onClose }) {
    const { user, refreshProfile } = useAuth(); // Destructure refreshProfile

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
    const [showPets, setShowPets] = useState(true);

    // Affiliation State
    const [affiliations, setAffiliations] = useState([]); // Affiliations list
    const [selectedAffiliation, setSelectedAffiliation] = useState(""); // User's current affiliation

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
                // Load Show Pets
                if (profile.settings && profile.settings.showPets !== undefined) {
                    setShowPets(profile.settings.showPets);
                }
                // Load Affiliation
                setSelectedAffiliation(profile.affiliationId || "");
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
        setLoading(true);
        try {
            await updateUserProfile(user.uid, {
                quizSettings,
                usageLimit,
                "settings.showPets": showPets,
                affiliationId: selectedAffiliation // Save selected affiliation
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

                {!isAuthenticated ? (
                    // Gatekeeper
                    <div style={{ textAlign: "center" }}>
                        <p style={{ marginBottom: "15px" }}>パスワードを入力してください（初期: 2525）</p>
                        <input
                            id="tutorial-parent-pin-input"
                            type="password"
                            value={inputPin}
                            onChange={(e) => setInputPin(e.target.value)}
                            placeholder="****"
                            style={{
                                fontSize: "2rem", textAlign: "center", letterSpacing: "10px",
                                width: "200px", padding: "10px", marginBottom: "20px"
                            }}
                        />
                        {authError && <p style={{ color: "red", marginBottom: "15px" }}>{authError}</p>}
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button id="tutorial-parent-cancel-btn" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "10px", border: "none" }}>キャンセル</button>
                            <button id="tutorial-parent-login-btn" onClick={handleLogin} className="btn btn-primary" style={{ padding: "10px 30px" }}>OK</button>
                        </div>
                    </div>
                ) : (
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
                                { id: "time", label: "利用時間", tid: "tutorial-tab-time" },
                                { id: "password", label: "パスワード", tid: "tutorial-tab-password" },
                                { id: "request", label: "申請・要望", tid: "tutorial-tab-request" },
                                { id: "affiliation", label: "所属", tid: "tutorial-tab-affiliation" },
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
                                {/* 1. Arithmetic & Shapes */}
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

                                    <div style={{ marginBottom: "10px" }}>
                                        <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px", fontSize: "0.9rem" }}>答えの最大数 (1〜100)</label>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <input type="range" min="1" max="100" value={quizSettings.maxAnswer} onChange={(e) => setQuizSettings({ ...quizSettings, maxAnswer: parseInt(e.target.value) })} style={{ flex: 1 }} />
                                            <span style={{ fontWeight: "bold", fontSize: "1.1rem", width: "40px" }}>{quizSettings.maxAnswer}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. Language */}
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
                            <div>
                                <h3 style={{ marginBottom: "15px" }}>おやすみモード設定</h3>
                                <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "20px" }}>
                                    指定した時間はアプリを使えなくします。（夜更かし防止など）
                                </p>

                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.1rem" }}>
                                        <input
                                            type="checkbox"
                                            checked={usageLimit.enabled}
                                            onChange={(e) => setUsageLimit({ ...usageLimit, enabled: e.target.checked })}
                                            style={{ transform: "scale(1.5)" }}
                                        />
                                        機能を有効にする
                                    </label>
                                </div>

                                {usageLimit.enabled && (
                                    <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px" }}>
                                        <div style={{ marginBottom: "15px" }}>
                                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>開始時間（寝る時間）</label>
                                            <input
                                                type="time"
                                                value={usageLimit.start}
                                                onChange={(e) => setUsageLimit({ ...usageLimit, start: e.target.value })}
                                                style={{ fontSize: "1.2rem", padding: "5px" }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: "15px" }}>
                                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>終了時間（起きる時間）</label>
                                            <input
                                                type="time"
                                                value={usageLimit.end}
                                                onChange={(e) => setUsageLimit({ ...usageLimit, end: e.target.value })}
                                                style={{ fontSize: "1.2rem", padding: "5px" }}
                                            />
                                        </div>
                                        <p style={{ color: "red", fontSize: "0.9rem" }}>
                                            ※ {usageLimit.start} から {usageLimit.end} の間はアプリが開けなくなります。
                                        </p>
                                    </div>
                                )}

                                <hr style={{ margin: "30px 0", border: "none", borderTop: "1px solid #eee" }} />

                                <h3 style={{ marginBottom: "15px" }}>ペット機能</h3>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "1.1rem" }}>
                                        <input
                                            type="checkbox"
                                            checked={showPets}
                                            onChange={(e) => setShowPets(e.target.checked)}
                                            style={{ transform: "scale(1.5)" }}
                                        />
                                        ペットを表示する
                                    </label>
                                    <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "5px", marginLeft: "28px" }}>
                                        チェックを外すと、ペットのお世話や表示が隠れます。
                                    </p>
                                </div>

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
                                        type="text"
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
                                        type="text"
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
                                    所属を設定すると、同じ所属のお友達やグループだけが表示されるようになります。<br />
                                    「所属なし（共通）」を選ぶと、誰とでも交流できるパブリックエリアになります。
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {affiliations.map(aff => {
                                        const isSelected = selectedAffiliation === aff.id || (!selectedAffiliation && aff.id === "default");
                                        return (
                                            <label key={aff.id} style={{
                                                display: "flex", alignItems: "center", padding: "15px",
                                                border: `2px solid ${isSelected ? "var(--primary)" : "#eee"} `,
                                                borderRadius: "10px", cursor: "pointer",
                                                backgroundColor: isSelected ? "#fff9f0" : "white",
                                                transition: "all 0.2s"
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="affiliation"
                                                    value={aff.id}
                                                    checked={isSelected}
                                                    onChange={() => setSelectedAffiliation(aff.id)}
                                                    style={{ marginRight: "10px", transform: "scale(1.5)" }}
                                                />
                                                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{aff.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    id="tutorial-save-affiliation-btn"
                                    onClick={handleSaveSettings}
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ width: "100%", padding: "12px", marginTop: "20px" }}
                                >
                                    設定を保存する
                                </button>
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
                                    <h4 style={{ color: "var(--primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "5px" }}>v1.0.0 (初回リリース)</h4>
                                    <p style={{ marginTop: "10px" }}>子供たちのための、やさしくて楽しいSNS「**にこにこひろば（Nikohiro）**」へようこそ！</p>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>🌟 ニコヒロとは？</h5>
                                    <p>言葉の大切さを学びながら、安心してお友達や家族とつながることができる子供向けSNSです。NGワードチェックや算数クイズを通じて、「考える力」と「思いやりの心」を育みます。</p>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>🚀 主な機能</h5>
                                    <ul style={{ paddingLeft: "20px" }}>
                                        <li><strong>きもちの投稿</strong>: 20種類以上の絵文字から気分を選んで投稿。</li>
                                        <li><strong>にこにこペット</strong>: 成長する相棒！投稿で貯まる経験値でペットが進化します。（成長は一日一回です）</li>
                                        <li><strong>グループ/所属機能</strong>: 学校や習い事など、自分たちのコミュニティで交流。</li>
                                        <li><strong>セーフティフィルター</strong>: 傷つける言葉を自動検知してアドバイス。</li>
                                        <li><strong>算数クイズ連携</strong>: 投稿前の暗算で学習習慣をサポート。</li>
                                    </ul>

                                    <h5 style={{ marginTop: "20px", marginBottom: "10px" }}>🏁 はじめかた</h5>
                                    <p>新規登録後のチュートリアルで、使い方を楽しくスムーズに学ぶことができます。</p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: "30px", textAlign: "right" }}>
                            <button onClick={onClose} style={{ color: "#888", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
                                閉じる
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
