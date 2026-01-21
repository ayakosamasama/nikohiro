"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

import { getUserProfile } from "../services/userService";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Added profile state for reactivity
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                // Load theme and admin status
                try {
                    const profileData = await getUserProfile(u.uid);
                    if (profileData) {
                        if (profileData.themeColor) {
                            const colorVar = `var(--color-${profileData.themeColor})`;
                            document.documentElement.style.setProperty("--primary", colorVar);
                        }
                        // Add properties to user object instance
                        u.isAdmin = !!profileData.isAdmin;
                        u.affiliationId = profileData.affiliationId;
                        setProfile(profileData);
                    }
                } catch (e) {
                    console.error("Profile load failed", e);
                }
                setUser(u);
            } else {
                setUser(null);
                setProfile(null);
                document.documentElement.style.setProperty("--primary", "var(--color-orange)");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const refreshProfile = async () => {
        if (auth.currentUser) {
            const profileData = await getUserProfile(auth.currentUser.uid);
            if (profileData) {
                // Determine theme
                if (profileData.themeColor) {
                    const colorVar = `var(--color-${profileData.themeColor})`;
                    document.documentElement.style.setProperty("--primary", colorVar);
                }

                // Add properties to user object instance directly
                auth.currentUser.isAdmin = !!profileData.isAdmin;
                auth.currentUser.affiliationId = profileData.affiliationId;

                // Set profile to trigger re-renders in components using AuthContext
                setProfile({ ...profileData });
                // We also re-set user just in case, though it's the same ref
                setUser(auth.currentUser);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            isAdmin: profile?.isAdmin || false,
            affiliationId: profile?.affiliationId || null,
            login, signup, logout, loading, refreshProfile
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
