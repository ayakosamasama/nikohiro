import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Default Game Template
const DEFAULT_GAME_TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>わたしのゲーム</title>
    <style>
        body { font-family: "M PLUS Rounded 1c", sans-serif; text-align: center; padding: 20px; background-color: #f0f8ff; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        h1 { margin-bottom: 10px; color: #ff6b6b; }
        p { font-size: 1.2rem; line-height: 1.6; }
        .game-area { margin: 30px 0; font-size: 4rem; animation: bounce 2s infinite; }
        button { font-size: 1.2rem; padding: 12px 30px; cursor: pointer; background: #4ecdc4; color: white; border: none; border-radius: 50px; font-weight: bold; transition: transform 0.1s; }
        button:active { transform: scale(0.95); }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    </style>
    <!-- Font for cute look -->
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <h1>🎮 わたしのゲーム</h1>
        <p>ここは あなただけの ゲームページだよ。<br>まだ ゲームは できていないみたい。</p>
        
        <div class="game-area">🚧</div>
        
        <p>「ゲームを つくる」ボタンから<br>リクエストを おくってみてね！</p>
        
        <button onclick="alert('リクエストしてね！')">わかった！</button>
    </div>

    <!-- Game Guard (Play Time Limit) -->
    <script src="/scripts/game-guard.js"></script>
</body>
</html>`;

export async function POST(request) {
    try {
        const body = await request.json();
        const { uid } = body;

        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }

        // Define path: public/games/<uid>.html
        const gamesDir = path.join(process.cwd(), "public", "games");
        const filePath = path.join(gamesDir, `${uid}.html`);

        // Ensure directory exists
        if (!fs.existsSync(gamesDir)) {
            fs.mkdirSync(gamesDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, DEFAULT_GAME_TEMPLATE, "utf8");
        console.log(`Created default game file for user ${uid} at ${filePath}`);

        return NextResponse.json({ success: true, path: `/games/${uid}.html` });

    } catch (error) {
        console.error("Failed to create game file:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
