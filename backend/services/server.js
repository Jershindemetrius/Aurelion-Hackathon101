require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.post("/generate-video", async (req, res) => {
    try {
        const { script } = req.body;

        // 🔥 Call Featherless API
        const response = await axios.post(
            "https://api.featherless.ai/v1/generate",  // <-- Replace with real endpoint
            {
                script: script,
                avatar: "default",
                format: "vertical"
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            videoUrl: response.data.video_url
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Video generation failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});