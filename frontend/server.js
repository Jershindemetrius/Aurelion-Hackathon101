process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const PORT = process.env.PORT || 5000;

// 1. Generate Script (Google Gemini 2.5 Flash)
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    const prompt = `Write a short script for a ${duration}-second video about: "${idea}". Tone: ${tone}. Language MUST be ${language}. Only output spoken words. Do not include stage directions.`;

    try {
        // FIXED: Pointing to the active gemini-2.5-flash model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            let generatedText = data.candidates[0].content.parts[0].text;
            res.json({ success: true, script: generatedText.replace(/["*]/g, '').trim() });
        } else if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            res.status(400).json({ success: false, message: `Gemini Error: ${data.error.message}` });
        } else {
            res.status(400).json({ success: false, message: "Unknown AI response failure." });
        }
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Real NLP Caption Generation (Google Gemini 2.5 Flash)
app.post('/generate-caption', async (req, res) => {
    const { script, platform } = req.body;
    const prompt = `You are an expert social media manager. Read this video script: "${script}". Write a highly engaging, viral caption optimized for ${platform}. Include 3-4 relevant hashtags. Only output the caption text.`;

    try {
        // FIXED: Pointing to the active gemini-2.5-flash model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            let generatedText = data.candidates[0].content.parts[0].text;
            res.json({ success: true, caption: generatedText.replace(/["*]/g, '').trim() });
        } else if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            res.status(400).json({ success: false, message: `Gemini Error: ${data.error.message}` });
        } else {
            res.status(400).json({ success: false, message: "Unknown NLP failure." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Generate Video using D-ID
app.post('/generate-video', async (req, res) => {
    const { script, imageBase64, language, voice } = req.body;

    try {
        console.log("⏳ Starting D-ID Generation Workflow...");
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const form = new URLSearchParams();
        form.append('key', process.env.IMGBB_API_KEY);
        form.append('image', base64Data);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success) throw new Error("Image upload to ImgBB failed. Check API key.");
        const imageUrl = imgbbData.data.url;

        const didAuth = `Basic ${Buffer.from(process.env.D_ID_API_KEY).toString('base64')}`;
        const voiceId = voice || (language.includes("Tamil") ? "ta-IN-PallaviNeural" : "en-US-JennyNeural");

        console.log(`🎬 Requesting video from D-ID using voice: ${voiceId}...`);
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
                    input: script.substring(0, 500),
                    provider: { type: "microsoft", voice_id: voiceId }
                },
                config: { 
                    stitch: true,  
                    pad_audio: 0.0 
                }
            })
        });

        const talkData = await talkResponse.json();
        if (!talkData.id) throw new Error("Failed to create D-ID Talk: " + JSON.stringify(talkData));
        const talkId = talkData.id;

        console.log(`🔄 Polling D-ID for completion (ID: ${talkId})...`);
        let finalVideoUrl = null;
        
        for (let i = 0; i < 30; i++) { 
            await new Promise(resolve => setTimeout(resolve, 2000)); 
            
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