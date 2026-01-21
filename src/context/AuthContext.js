"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

import { getUserProfile } from "../services/userService";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                // Load theme and admin status
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile) {
                        if (profile.themeColor) {
                            const colorVar = `var(--color-${profile.themeColor})`;
                            document.documentElement.style.setProperty("--primary", colorVar);
                        }
                        // Add isAdmin to user object
                        if (profile.isAdmin) {
                            user.isAdmin = true;
                        }
                    }
                } catch (e) {
                    console.error("Profile load failed", e);
                }
            } else {
                setUser(null);
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

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
