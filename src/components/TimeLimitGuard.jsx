"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/userService";

export default function TimeLimitGuard({ children }) {
    const { user } = useAuth();
    const [blocked, setBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const checkLimit = async () => {
            try {
                const profile = await getUserProfile(user.uid);
                if (profile && profile.usageLimit && profile.usageLimit.enabled) {
                    const { start, end } = profile.usageLimit;
                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes();

                    const [startH, startM] = start.split(":").map(Number);
                    const [endH, endM] = end.split(":").map(Number);

                    const startTime = startH * 60 + startM;
                    const endTime = endH * 60 + endM;

                    // Logic:
                    // If start < end (e.g. 13:00 to 14:00), block if start <= current < end
                    // If start > end (e.g. 21:00 to 06:00), block if current >= start OR current < end

                    let isBlocked = false;
                    if (startTime < endTime) {
                        if (currentTime >= startTime && currentTime < endTime) isBlocked = true;
                    } else {
                        if (currentTime >= startTime || currentTime < endTime) isBlocked = true;
                    }

                    setBlocked(isBlocked);
                } else {
                    setBlocked(false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        checkLimit();
        // Check every minute
        const interval = setInterval(checkLimit, 60000);
        return () => clearInterval(interval);
    }, [user]);

    if (loading) return null; // Or just render children to avoid flash? Better null or spinner if strict.

    if (blocked) {
        return (
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "#2d3436", zIndex: 9999,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                color: "white", textAlign: "center", padding: "20px"
            }}>
                <div style={{ fontSize: "5rem", marginBottom: "20px" }}>🌙</div>
                <h1 style={{ marginBottom: "20px" }}>おやすみモード</h1>
                <p style={{ fontSize: "1.2rem" }}>いまは おやすみのじかんです。<br />また あした あそぼうね！</p>
                {/* Emergency Override for parents could go here, e.g. unlock with PIN logic duplicated */}
            </div>
        );
    }

    return children;
}
