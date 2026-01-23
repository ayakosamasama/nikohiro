"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getUserProfile } from "../services/userService";
import { subscribeToSystemConfig } from "../services/adminService";
import { subscribeToUserGroups } from "../services/groupService";
import { subscribeToMessages } from "../services/messageService";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Add profile state
    const [loading, setLoading] = useState(true);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [groupIds, setGroupIds] = useState([]);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);

    // Maintenance Listener
    useEffect(() => {
        const unsub = subscribeToSystemConfig((config) => {
            const isMaint = !!config?.maintenanceMode;
            setIsMaintenance(isMaint);

            // Critical: Forced logout if maintenance is ON and user is NOT admin
            if (isMaint && user && !user.isAdmin) {
                console.log("Maintenance mode active: Logging out non-admin user.");
                signOut(auth);
            }
        });
        return () => unsub();
    }, [user, user?.isAdmin]);

    // Group & Message Subscriptions
    // 1. Group Subscription
    useEffect(() => {
        if (user) {
            const unsubGroups = subscribeToUserGroups(user.uid, (ids) => {
                // Avoid redundant updates if IDs haven't changed (shallow comparison)
                setGroupIds(prev => {
                    if (prev.length === ids.length && prev.every((val, index) => val === ids[index])) {
                        return prev;
                    }
                    return ids;
                });
            }, () => setLoading(false));
            return () => unsubGroups();
        } else {
            setGroupIds([]);
        }
    }, [user]);

    // 2. Message Subscription (Depends on Groups)
    useEffect(() => {
        if (user) {
            const unsubMessages = subscribeToMessages({
                uid: user.uid,
                affiliationIds: user.affiliations || [],
                groupIds: groupIds
            }, (msgs) => {
                const unread = msgs.filter(m => !m.status?.read).length;
                setUnreadMessageCount(unread);
            }, () => setLoading(false));
            return () => unsubMessages();
        } else {
            setUnreadMessageCount(0);
        }
    }, [user, user?.affiliations, groupIds]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const fetchedProfile = await getUserProfile(u.uid);
                if (fetchedProfile?.themeColor) {
                    const colorVar = `var(--color-${fetchedProfile.themeColor})`;
                    document.documentElement.style.setProperty("--primary", colorVar);
                }

                // Sync important properties to user object for compat
                u.isAdmin = !!fetchedProfile?.isAdmin;
                u.affiliationId = fetchedProfile?.affiliationId;
                u.affiliations = fetchedProfile?.affiliations || (fetchedProfile?.affiliationId ? [fetchedProfile.affiliationId] : []);

                setProfile(fetchedProfile);
                setUser(u);
            } else {
                document.documentElement.style.setProperty("--primary", "var(--color-orange)");
                setProfile(null);
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Secondary check: if maintenance is on and newly logged in user is NOT admin
        const fetchedProfile = await getUserProfile(cred.user.uid);
        if (isMaintenance && !fetchedProfile?.isAdmin) {
            await signOut(auth);
            throw new Error("現在メンテナンス中のため、管理ユーザー以外はログインできません。");
        }
        return cred;
    };

    const signup = (email, password) => {
        if (isMaintenance) {
            throw new Error("現在メンテナンス中のため、新規登録はできません。");
        }
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    // refreshProfile now re-fetches the profile
    const refreshProfile = async () => {
        if (user) {
            const fetchedProfile = await getUserProfile(user.uid);
            if (fetchedProfile?.themeColor) {
                const colorVar = `var(--color-${fetchedProfile.themeColor})`;
                document.documentElement.style.setProperty("--primary", colorVar);
            }
            user.isAdmin = !!fetchedProfile?.isAdmin;
            user.affiliationId = fetchedProfile?.affiliationId;
            user.affiliations = fetchedProfile?.affiliations || (fetchedProfile?.affiliationId ? [fetchedProfile.affiliationId] : []);

            // Sync display props for immediate UI update
            if (fetchedProfile.photoURL) user.photoURL = fetchedProfile.photoURL;
            if (fetchedProfile.displayName) user.displayName = fetchedProfile.displayName;

            setProfile(fetchedProfile);
            // Force user update to trigger shallow effects if needed, though properties are mutated
            setUser({ ...user });
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile, // Expose profile
            isAdmin: user?.isAdmin || false,
            affiliationId: user?.affiliationId || null,
            affiliations: user?.affiliations || [],
            groupIds,
            unreadMessageCount,
            isMaintenance,
            login, signup, logout, loading, refreshProfile
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
