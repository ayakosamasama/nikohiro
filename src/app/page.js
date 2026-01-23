"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import PostForm from "../components/PostForm";
import Timeline from "../components/Timeline";
import GroupList from "../components/GroupList";
import TutorialModal from "../components/TutorialModal"; // Added import
import ReleaseNotesModal from "../components/ReleaseNotesModal";
import { subscribeToGroups, subscribeToUserGroups } from "../services/groupService";
import { updateUserProfile, getUserProfile } from "../services/userService";
import PetScreen from "../components/PetScreen";
import GameRequestModal from "../components/GameRequestModal";

const APP_VERSION = "1.0.0-beta";

export default function Home() {
  const { user, login, signup, refreshProfile, isMaintenance } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [joinedGroupIds, setJoinedGroupIds] = useState([]);
  const [affiliationGroups, setAffiliationGroups] = useState([]); // All groups in current affiliation
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'friends', 'group'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'groups', 'pet'
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [showPets, setShowPets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");

  // Affiliation State
  const [selectedAffiliation, setSelectedAffiliation] = useState(null);
  const [affiliationOptions, setAffiliationOptions] = useState([]);

  // Restore local subscriptions
  useEffect(() => {
    if (user) {
      const unsubGroups = subscribeToGroups(selectedAffiliation, (groups) => setAffiliationGroups(groups));
      const unsubJoinedGroups = subscribeToUserGroups(user.uid, (ids) => setJoinedGroupIds(ids));
      return () => {
        unsubGroups();
        unsubJoinedGroups();
      };
    }
  }, [user, selectedAffiliation]);

  // Affiliation Initialization Logic
  useEffect(() => {
    if (user && !selectedAffiliation) {
      const currentAffiliations = user.affiliations || [];
      if (currentAffiliations.length > 0) {
        if (currentAffiliations.length === 1) {
          setSelectedAffiliation(currentAffiliations[0]);
        } else {
          import("../services/affiliationService").then(({ getAffiliations }) => {
            getAffiliations().then(all => {
              const myAffiliations = all.filter(a => currentAffiliations.includes(a.id));
              setAffiliationOptions(myAffiliations);
              if (!selectedAffiliation) {
                setSelectedAffiliation(user.affiliationId || currentAffiliations[0]);
              }
            }).catch(e => console.error("Home: Affiliation error", e));
          });
        }
      } else {
        setSelectedAffiliation(user.affiliationId || "default");
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(profile => {
        if (profile?.settings?.showPets !== undefined) {
          setShowPets(profile.settings.showPets);
        }
        if (profile?.lastViewedVersion !== APP_VERSION && !isTutorialOpen && profile) {
          setIsReleaseNotesOpen(true);
        }
      });
    }
  }, [user, isTutorialOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        // Validation for Signup
        if (!invitationCode) {
          setError("招待コードを入力してください（必須）");
          setIsSubmitting(false);
          return;
        }

        // Check Invitation Code
        // Dynamic import to avoid SSR issues or circular deps
        const { validateInvitation } = await import("../services/invitationService");
        const result = await validateInvitation(invitationCode);

        if (!result.isValid) {
          setError(result.error || "無効な招待コードです。");
          setIsSubmitting(false);
          return;
        }

        const cred = await signup(email, password);


        let gameUrl = null;
        // Setup default game file
        try {
          const res = await fetch("/api/user/setup-game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: cred.user.uid })
          });
          if (res.ok) {
            const data = await res.json();
            gameUrl = data.path;
          }
        } catch (fileErr) {
          console.error("Failed to setup default game file:", fileErr);
        }

        // Save initial profile with gameUrl & Affiliation
        await updateUserProfile(cred.user.uid, {
          displayName: name,
          themeColor: "orange", // default
          gameUrl: gameUrl || "",
          affiliations: [result.affiliationId],
          affiliationId: result.affiliationId
        });

        // Ensure context is updated with new profile data
        await refreshProfile();

        setIsTutorialOpen(true);
      }
    } catch (err) {
      // Only log unexpected errors to avoid dev overlay for common auth errors
      const knownErrors = [
        "auth/weak-password",
        "auth/email-already-in-use",
        "auth/invalid-email",
        "auth/user-not-found",
        "auth/wrong-password",
        "auth/invalid-credential",
        "auth/too-many-requests"
      ];
      if (!knownErrors.includes(err.code)) {
        console.error(err);
      }

      let msg = err.message || "エラーが発生しました";
      if (err.code === "auth/weak-password") msg = "パスワードは6文字以上にしてください";
      else if (err.code === "auth/email-already-in-use") msg = "そのメールアドレスはすでに登録されています";
      else if (err.code === "auth/invalid-email") msg = "メールアドレスの形式が正しくありません";
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "メールアドレス または パスワードが ちがいます";
      }
      else if (err.code === "auth/too-many-requests") msg = "回数が多すぎます。しばらく待ってから試してください";

      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    // Determine which groups are joined (those we follow)
    const myJoinedGroups = affiliationGroups.filter(g => joinedGroupIds.includes(g.id));

    return (
      <div style={{ maxWidth: "600px", margin: "20px auto", paddingBottom: "50px" }}>
        <TutorialModal
          isOpen={isTutorialOpen}
          onClose={() => {
            setIsTutorialOpen(false);
            // Trigger release notes after tutorial if version mismatch
            getUserProfile(user.uid).then(profile => {
              if (profile?.lastViewedVersion !== APP_VERSION) {
                setIsReleaseNotesOpen(true);
              }
            });
          }}
        />

        <ReleaseNotesModal
          isOpen={isReleaseNotesOpen}
          onClose={async () => {
            setIsReleaseNotesOpen(false);
            // Save viewed version to profile
            try {
              await updateUserProfile(user.uid, { lastViewedVersion: APP_VERSION });
            } catch (e) {
              console.error("Failed to save viewed version", e);
            }
          }}
        />



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

          {showPets && (
            <button
              id="tutorial-pet-tab"
              onClick={() => setActiveTab("pet")}
              style={{
                flex: 1, padding: "10px", borderRadius: "25px", border: "none", fontWeight: "bold",
                background: activeTab === "pet" ? "var(--primary)" : "transparent",
                color: activeTab === "pet" ? "white" : "var(--color-grey)", cursor: "pointer"
              }}
            >
              🐶 ペット
            </button>

          )}

          <button
            onClick={() => setIsTutorialOpen(true)}
            style={{
              padding: "10px", borderRadius: "25px", border: "none",
              background: "transparent", color: "var(--color-grey)",
              cursor: "pointer", fontSize: "1.2rem",
              marginLeft: "5px"
            }}
            title="使い方を見る"
          >
            ❓
          </button>
        </div>

        {
          activeTab === "groups" ? (
            <GroupList />
          ) : activeTab === "pet" ? (
            <div style={{ height: "calc(100vh - 200px)", background: "white", borderRadius: "20px", boxShadow: "var(--shadow-sm)" }}>
              <PetScreen />
            </div>
          ) : (
            <>
              {/* Timeline Filter and List */}

              {/* Row 1: Affiliations - Compact Pill Design */}
              {affiliationOptions.length > 1 && (
                <div className="hide-scrollbar" style={{ margin: "5px -20px 5px -20px", padding: "0 20px", overflowX: "auto", display: "flex", gap: "8px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {affiliationOptions.map(aff => (
                    <button
                      key={aff.id}
                      onClick={() => {
                        setSelectedAffiliation(aff.id);
                        setFilterMode("all");
                        setSelectedGroupId(null);
                      }}
                      style={{
                        whiteSpace: "nowrap", padding: "4px 12px", borderRadius: "15px", border: "none", fontWeight: "bold",
                        background: (selectedAffiliation === aff.id) ? "var(--primary)" : "white",
                        color: (selectedAffiliation === aff.id) ? "white" : "#666",
                        border: (selectedAffiliation === aff.id) ? "none" : "1px solid #eee",
                        cursor: "pointer", fontSize: "0.85rem",
                        boxShadow: (selectedAffiliation === aff.id) ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                      }}
                    >
                      🏫 {aff.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Row 2: Group Icons - Compact Pill Design */}
              <div className="hide-scrollbar" style={{ margin: "5px -20px 10px -20px", padding: "0 20px", overflowX: "auto", display: "flex", gap: "8px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <button
                  onClick={() => {
                    setFilterMode("all");
                    setSelectedGroupId(null);
                  }}
                  style={{
                    whiteSpace: "nowrap", padding: "4px 12px", borderRadius: "15px", border: "none", fontWeight: "bold",
                    background: (filterMode === "all") ? "var(--primary)" : "#eee",
                    color: (filterMode === "all") ? "white" : "#666", cursor: "pointer", fontSize: "0.85rem",
                    boxShadow: (filterMode === "all") ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  🌏 すべてのグループ
                </button>

                {myJoinedGroups
                  .map(group => (
                    <button
                      key={group.id}
                      onClick={() => { setFilterMode("group"); setSelectedGroupId(group.id); }}
                      style={{
                        whiteSpace: "nowrap", padding: "4px 10px", borderRadius: "15px", border: "none", fontWeight: "bold",
                        background: selectedGroupId === group.id ? group.color : "#eee",
                        color: selectedGroupId === group.id ? "white" : "#666", cursor: "pointer",
                        border: selectedGroupId === group.id ? "none" : `1px solid ${group.color}44`,
                        fontSize: "1.1rem",
                        boxShadow: selectedGroupId === group.id ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                        minWidth: "36px"
                      }}
                      title={group.name}
                    >
                      {group.emoji}
                    </button>
                  ))}
              </div>

              <Timeline
                filterMode={filterMode}
                userGroups={joinedGroupIds}
                selectedGroupId={selectedGroupId}
                selectedAffiliation={selectedAffiliation}
              />
            </>
          )
        }

        {/* Floating Action Button (FAB) for Post */}
        {
          activeTab === "home" && (
            <button
              id="tutorial-post-fab"
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
          )
        }

        {/* Floating Action Button (FAB) for Game */}
        {
          activeTab === "home" && (
            <button
              id="tutorial-game-fab"
              onClick={() => setIsGameModalOpen(true)}
              style={{
                position: "fixed",
                bottom: "30px",
                right: "110px", // Pushed further left
                width: "65px",
                height: "65px",
                borderRadius: "50%",
                background: "#9b59b6", // Purple for game
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
              title="ゲームをつくって！"
            >
              🎮
            </button>
          )
        }

        {/* Post Modal Overlay */}
        {
          isPostModalOpen && (
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
                  isTutorialMode={isTutorialOpen}
                />
              </div>
            </div>
          )
        }

        <GameRequestModal
          isOpen={isGameModalOpen}
          onClose={() => setIsGameModalOpen(false)}
        />

        <style jsx global>{`
          @keyframes modalIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>


      </div >
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

      {isMaintenance && (
        <div style={{
          background: "#fff5f5",
          border: "2px solid var(--color-red)",
          borderRadius: "12px",
          padding: "15px",
          marginBottom: "20px",
          color: "var(--color-red)",
          fontWeight: "bold",
          fontSize: "0.9rem",
          animation: "pulse 2s infinite"
        }}>
          🚧 現在メンテナンス中です 🚧<br />
          <span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>
            管理ユーザー以外はログインできません。
          </span>
        </div>
      )}

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
          <>
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
            <div style={{ textAlign: "left" }}>
              <label style={{ fontSize: "0.8rem", color: "#666", fontWeight: "bold", marginLeft: "4px" }}>
                招待コード (6桁) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="例: A1B2C3"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                required
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "var(--radius-sm)",
                  border: "2px solid #ff8e53",
                  fontSize: "1rem",
                  letterSpacing: "2px",
                  fontWeight: "bold",
                  marginTop: "4px"
                }}
              />
            </div>
          </>
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
        <button
          type="submit"
          className="btn btn-primary"
          style={{ fontSize: "1.2rem", marginTop: "10px", opacity: isSubmitting ? 0.7 : 1 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "処理中..." : (isLogin ? "ログインする" : "とうろくする")}
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
