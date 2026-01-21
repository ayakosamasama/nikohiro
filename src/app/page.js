"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import PostForm from "../components/PostForm";
import Timeline from "../components/Timeline";
import GroupList from "../components/GroupList";
import TutorialModal from "../components/TutorialModal"; // Added import
import { subscribeToGroups, subscribeToUserGroups } from "../services/groupService";
import { updateUserProfile } from "../services/userService";

export default function Home() {
  const { user, login, signup } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [joinedGroupIds, setJoinedGroupIds] = useState([]);
  const [allGroups, setAllGroups] = useState([]); // For tab labels
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'friends', 'group'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'groups'
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Fetch joined groups for authenticated user
  useEffect(() => {
    if (user) {
      const unsubUser = subscribeToUserGroups(user.uid, (ids) => setJoinedGroupIds(ids));
      const unsubGroups = subscribeToGroups((groups) => setAllGroups(groups));
      return () => {
        unsubUser();
        unsubGroups();
      };
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const cred = await signup(email, password);
        // Save initial profile
        await updateUserProfile(cred.user.uid, {
          displayName: name,
          themeColor: "orange" // default
        });
        setIsTutorialOpen(true);
      }
    } catch (err) {
      console.error(err);
      let msg = "エラーが発生しました";
      if (err.code === "auth/weak-password") msg = "パスワードは6文字以上にしてください";
      else if (err.code === "auth/email-already-in-use") msg = "そのメールアドレスはすでに登録されています";
      else if (err.code === "auth/invalid-email") msg = "メールアドレスの形式が正しくありません";
      else if (err.code === "auth/user-not-found") msg = "ユーザーが見つかりません";
      else if (err.code === "auth/wrong-password") msg = "パスワードが違います";
      else if (err.code === "auth/too-many-requests") msg = "回数が多すぎます。しばらく待ってから試してください";

      setError(msg);
    }
  };

  if (user) {
    // Determine which groups are joined (for filter tabs)
    const myGroups = allGroups.filter(g => joinedGroupIds.includes(g.id));

    return (
      <div style={{ maxWidth: "600px", margin: "20px auto", paddingBottom: "50px" }}>
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <button
            onClick={() => setIsTutorialOpen(true)}
            style={{
              background: "white", border: "1px solid #ddd",
              padding: "5px 10px", borderRadius: "15px",
              cursor: "pointer", fontSize: "0.9rem", color: "#636e72"
            }}
          >
            ❓ 使い方を見る
          </button>
        </div>

        {/* Main Navigation (Home vs Groups) */}
        <div style={{ display: "flex", marginBottom: "20px", background: "white", borderRadius: "30px", padding: "5px", boxShadow: "var(--shadow-sm)" }}>
          <button
            id="tutorial-home-tab"
            onClick={() => setActiveTab("home")}
            style={{
              flex: 1, padding: "10px", borderRadius: "25px", border: "none", fontWeight: "bold",
              background: activeTab === "home" ? "var(--primary)" : "transparent",
              color: activeTab === "home" ? "white" : "var(--color-grey)", cursor: "pointer"
            }}
          >
            🏠 ひろば
          </button>
          <button
            id="tutorial-groups-tab"
            onClick={() => setActiveTab("groups")}
            style={{
              flex: 1, padding: "10px", borderRadius: "25px", border: "none", fontWeight: "bold",
              background: activeTab === "groups" ? "var(--primary)" : "transparent",
              color: activeTab === "groups" ? "white" : "var(--color-grey)", cursor: "pointer"
            }}
          >
            🔍 さがす
          </button>
        </div>

        {activeTab === "groups" ? (
          <GroupList />
        ) : (
          <>
            {/* Timeline Filter and List */}

            {/* Filter Tabs (Horizontal Scroll) */}
            <div style={{ margin: "20px -20px", padding: "0 20px", overflowX: "auto", display: "flex", gap: "10px", scrollbarWidth: "none" }}>
              <button
                onClick={() => { setFilterMode("all"); setSelectedGroupId(null); }}
                style={{
                  whiteSpace: "nowrap", padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: "bold",
                  background: filterMode === "all" ? "var(--primary)" : "#ddd",
                  color: filterMode === "all" ? "white" : "black", cursor: "pointer"
                }}
              >
                🌏 みんな
              </button>
              <button
                onClick={() => { setFilterMode("friends"); setSelectedGroupId(null); }}
                style={{
                  whiteSpace: "nowrap", padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: "bold",
                  background: filterMode === "friends" ? "var(--primary)" : "#ddd",
                  color: filterMode === "friends" ? "white" : "black", cursor: "pointer"
                }}
              >
                🤝 おなじグループ
              </button>

              {myGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => { setFilterMode("group"); setSelectedGroupId(group.id); }}
                  style={{
                    whiteSpace: "nowrap", padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: "bold",
                    background: selectedGroupId === group.id ? group.color : "#ddd",
                    color: selectedGroupId === group.id ? "white" : "black", cursor: "pointer",
                    border: selectedGroupId === group.id ? "none" : `2px solid ${group.color}`
                  }}
                >
                  {group.emoji} {group.name}
                </button>
              ))}
            </div>

            <Timeline filterMode={filterMode} userGroups={joinedGroupIds} selectedGroupId={selectedGroupId} />
          </>
        )}

        {/* Floating Action Button (FAB) for Post */}
        {activeTab === "home" && (
          <button
            onClick={() => setIsPostModalOpen(true)}
            style={{
              position: "fixed",
              bottom: "30px",
              right: "30px",
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              background: "var(--primary)",
              color: "white",
              border: "none",
              boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              cursor: "pointer",
              zIndex: 100,
              transition: "transform 0.2s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            title="きもちを投稿する"
          >
            ✏️
          </button>
        )}

        {/* Post Modal Overlay */}
        {isPostModalOpen && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px"
          }}>
            <div style={{ width: "100%", maxWidth: "500px", animation: "modalIn 0.3s ease" }}>
              <PostForm
                userGroups={joinedGroupIds}
                onClose={() => setIsPostModalOpen(false)}
                onSuccess={() => setIsPostModalOpen(false)}
              />
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes modalIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "400px",
      margin: "50px auto",
      background: "white",
      padding: "30px",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)",
      textAlign: "center"
    }}>
      <h2 style={{ color: "var(--primary)", marginBottom: "20px" }}>
        {isLogin ? "おかえりなさい！" : "はじめまして！"}
      </h2>

      {error && <p style={{ color: "var(--color-red)", marginBottom: "10px" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "15px",
            borderRadius: "var(--radius-sm)",
            border: "2px solid #ddd",
            fontSize: "1rem"
          }}
        />
        {!isLogin && (
          <input
            type="text"
            placeholder="おなまえ（ニックネーム）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              padding: "15px",
              borderRadius: "var(--radius-sm)",
              border: "2px solid #ddd",
              fontSize: "1rem"
            }}
          />
        )}
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "15px",
            borderRadius: "var(--radius-sm)",
            border: "2px solid #ddd",
            fontSize: "1rem"
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ fontSize: "1.2rem", marginTop: "10px" }}>
          {isLogin ? "ログインする" : "とうろくする"}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-grey)",
          textDecoration: "underline",
          marginTop: "20px",
          cursor: "pointer"
        }}
      >
        {isLogin ? "あたらしくはじめる" : "ログインはこちら"}
      </button>
    </div>
  );
}
