"use client";
import React from "react";
import { PETS, getPetImage } from "../data/gameData";

export default function PetDisplay({ pet, size = 60 }) {
    if (!pet || !pet.type) return null;

    const imageUrl = getPetImage(pet.type, pet.level || 0);

    return (
        <div style={{ textAlign: "center" }}>
            <div style={{
                width: size, height: size, margin: "0 auto",
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center"
            }} />
            <div style={{ fontSize: size * 0.3, fontWeight: "bold", color: "#555", marginTop: "5px" }}>
                Lv.{pet.level || 0}
            </div>
        </div>
    );
}
