process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const PORT = process.env.PORT || 5000;

// 1. Generate Script (Featherless)
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    const prompt = `Write a short script for a ${duration}-second video about: "${idea}". Tone: ${tone}. Language MUST be ${language}. Only output spoken words. Do not include stage directions.`;

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
            res.json({ success: true, script: data.choices[0].message.content.replace(/["*]/g, '') });
        } else {
            res.status(400).json({ success: false, message: "AI response failed." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Generate Video using D-ID
app.post('/generate-video', async (req, res) => {
    const { script, imageBase64, language } = req.body;

    try {
        console.log("⏳ Starting D-ID Generation Workflow...");
        
        // A: Upload Image to ImgBB (D-ID needs a public URL)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const form = new URLSearchParams();
        form.append('key', process.env.IMGBB_API_KEY);
        form.append('image', base64Data);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success) throw new Error("Image upload to ImgBB failed. Check API key.");
        const imageUrl = imgbbData.data.url;
        console.log("✅ Image hosted:", imageUrl);

        // B: Setup D-ID Authentication & Voice (Fixed to match your .env variable)
        const didAuth = `Basic ${Buffer.from(process.env.D_ID_API_KEY).toString('base64')}`;
        const voiceId = language.includes("Tamil") ? "ta-IN-PallaviNeural" : "en-US-JennyNeural";

        // C: Create Talk on D-ID
        console.log("🎬 Requesting video from D-ID...");
        const talkResponse = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': didAuth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_url: imageUrl,
                script: {
                    type: "text",
                    input: script.substring(0, 500), // Safety limit for credits
                    provider: { type: "microsoft", voice_id: voiceId }
                },
                config: { fluent: true, pad_audio: 0 }
            })
        });

        const talkData = await talkResponse.json();
        if (!talkData.id) throw new Error("Failed to create D-ID Talk: " + JSON.stringify(talkData));
        const talkId = talkData.id;

        // D: Poll D-ID until the video is finished rendering
        console.log(`🔄 Polling D-ID for completion (ID: ${talkId})...`);
        let finalVideoUrl = null;
        
        for (let i = 0; i < 30; i++) { // Try for ~60 seconds
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            
            const pollResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                method: 'GET',
                headers: { 'Authorization': didAuth }
            });
            const pollData = await pollResponse.json();
            
            if (pollData.status === 'done') {
                finalVideoUrl = pollData.result_url;
                break;
            } else if (pollData.status === 'error') {
                throw new Error("D-ID Rendering Error");
            }
        }

        if (!finalVideoUrl) throw new Error("Video generation timed out.");

        console.log("✅ Video Generated Successfully!");
        res.json({ success: true, result_url: finalVideoUrl });

    } catch (error) {
        console.error("❌ Generation Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));