"use client";
import React from "react";
import { ITEMS } from "../data/gameData";

export default function AvatarDisplay({ avatar, size = 100 }) {
    // Default empty avatar parts if not provided
    const headId = avatar?.head;
    const bodyId = avatar?.body;
    const accId = avatar?.accessory;

    const headItem = ITEMS.find(i => i.id === headId);
    const bodyItem = ITEMS.find(i => i.id === bodyId);
    const accItem = ITEMS.find(i => i.id === accId);

    // Base Face (Always visible)
    const baseFace = "🙂"; // Default face

    return (
        <div style={{ width: size, height: size, position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* Background/Base */}
            <div style={{ fontSize: size * 0.8, position: "absolute", zIndex: 1 }}>
                {baseFace}
            </div>

            {/* Body (Clothes) - Rendered lower */}
            {bodyItem && (
                <div style={{ fontSize: size * 0.5, position: "absolute", bottom: 0, zIndex: 2 }}>
                    {bodyItem.emoji}
                </div>
            )}

            {/* Head (Hat) - Rendered higher */}
            {headItem && (
                <div style={{ fontSize: size * 0.5, position: "absolute", top: -size * 0.2, zIndex: 3 }}>
                    {headItem.emoji}
                </div>
            )}

            {/* Accessory - Position depends on type, simplfied here */}
            {accItem && (
                <div style={{ fontSize: size * 0.4, position: "absolute", top: size * 0.1, right: -size * 0.1, zIndex: 4 }}>
                    {accItem.emoji}
                </div>
            )}
        </div>
    );
}
