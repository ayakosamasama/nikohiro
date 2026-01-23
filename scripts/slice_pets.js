const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function sliceImage(inputPath, outputDir, petId, rows = 2, cols = 4) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        const width = metadata.width;
        const height = metadata.height;

        const cellWidth = Math.floor(width / cols);
        const cellHeight = Math.floor(height / rows);

        console.log(`Processing ${inputPath}: ${width}x${height} -> Cell: ${cellWidth}x${cellHeight}`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let count = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (count >= 8) break; // Only need 8 stages

                const outputFilename = `${petId}_lv${count}.png`;
                const outputPath = path.join(outputDir, outputFilename);

                await image
                    .clone()
                    .extract({ left: c * cellWidth, top: r * cellHeight, width: cellWidth, height: cellHeight })
                    .toFile(outputPath);

                console.log(`Saved ${outputFilename}`);
                count++;
            }
        }
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error);
    }
}

// Configuration
const assignments = [
    {
        input: "C:/Users/ayasa/.gemini/antigravity/brain/32f33729-2101-46fd-b75a-8913607d43a2/pixel_pet_dog_evolution_1769159291317.png",
        output: "public/pet/pet09",
        id: "pet_09"
    },
    {
        input: "C:/Users/ayasa/.gemini/antigravity/brain/32f33729-2101-46fd-b75a-8913607d43a2/pixel_pet_cat_evolution_1769159310582.png",
        output: "public/pet/pet10",
        id: "pet_10"
    },
    {
        input: "C:/Users/ayasa/.gemini/antigravity/brain/32f33729-2101-46fd-b75a-8913607d43a2/pixel_pet_dragon_evolution_1769159328920.png",
        output: "public/pet/pet11",
        id: "pet_11"
    }
];

(async () => {
    for (const task of assignments) {
        await sliceImage(task.input, task.output, task.id);
    }
})();
