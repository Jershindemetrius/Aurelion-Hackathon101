require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*
  POST /generate-video
  Receives: { script: "text" }
  Returns: { videoUrl: "..." }
*/
app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script || script.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Script is required"
      });
    }

    console.log("Received script:", script);

    // 🔥 Featherless API Call
    const featherResponse = await axios.post(
      "https://api.featherless.ai/v1/generate", // 🔁 Replace with real endpoint
      {
        script: script,
        avatar: "default",
        format: "vertical"
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    // Adjust based on Featherless response structure
    const videoUrl = featherResponse.data.video_url;

    if (!videoUrl) {
      return res.status(500).json({
        success: false,
        message: "No video URL returned from Featherless"
      });
    }

    return res.status(200).json({
      success: true,
      videoUrl: videoUrl
    });

  } catch (error) {
    console.error("Error generating video:", error.message);

    return res.status(500).json({
      success: false,
      message: "Video generation failed",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});