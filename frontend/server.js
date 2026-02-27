process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const Replicate = require('replicate');
const googleTTS = require('google-tts-api');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const PORT = process.env.PORT || 5000;

// 1. Generate Script (Featherless)
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    const prompt = `Write a short script for a ${duration}-second video about: "${idea}". Tone: ${tone}. Language MUST be ${language}. Only output spoken words.`;

    try {
        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mistralai/Mistral-7B-Instruct-v0.2",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            res.json({ success: true, script: data.choices[0].message.content });
        } else {
            res.status(400).json({ success: false, message: "AI response failed." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Generate Video (ImgBB + Google TTS + SadTalker)
app.post('/generate-video', async (req, res) => {
    const { script, imageBase64, format, language } = req.body;

    try {
        console.log("⏳ Starting End-to-End Generation...");
        
        // A: Upload Image to ImgBB
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const form = new URLSearchParams();
        form.append('key', process.env.IMGBB_API_KEY);
        form.append('image', base64Data);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
        const rawImgbbText = await imgbbResponse.text(); 
        
        let imgbbData;
        try { imgbbData = JSON.parse(rawImgbbText); } 
        catch (err) { throw new Error("Firewall blocked the upload. Use Hotspot."); }
        
        if (!imgbbData.success) throw new Error("Image upload failed.");
        const imageUrl = imgbbData.data.url;
        console.log("✅ Image uploaded to ImgBB");

        // B: Generate Audio from Script
        const ttsLang = language.includes("Tamil") ? "ta" : "en";
        const shortScript = script.substring(0, 199); // Google TTS free limit protection
        
        console.log(`🎤 Generating ${language} Audio...`);
        const audioBase64 = await googleTTS.getAudioBase64(shortScript, { lang: ttsLang, slow: false });
        const audioDataUri = `data:audio/mp3;base64,${audioBase64}`;

        // C: Send to SadTalker on Replicate
        console.log("🎬 Sending to Replicate (SadTalker). This takes 30-60s...");
        const output = await replicate.run(
            "cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
            {
                input: {
                    source_image: imageUrl,
                    driven_audio: audioDataUri,
                    still: true, // Keeps head steady for cooling glasses
                    enhancer: "gfpgan"
                }
            }
        );

        console.log("✅ Video Generated!");
        res.json({ success: true, result_url: output });

    } catch (error) {
        console.error("❌ Server Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Creovate Server running on port ${PORT}`));