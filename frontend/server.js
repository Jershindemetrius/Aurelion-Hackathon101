require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

const PORT = process.env.PORT || 5000;

// 1. Generate Script Route (Featherless AI)
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    
    const prompt = `Act as an expert content creator. Write a script for a ${duration}-second video about: "${idea}". 
    The tone should be ${tone}. The language MUST be ${language}. 
    Only output the spoken script, no stage directions.`;

    try {
        // Note: Replace with the actual Featherless endpoint if it differs
        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-2-7b-chat-hf", // Replace with your preferred model
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        res.json({ success: true, script: data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Generate Video Route
app.post('/generate-video', async (req, res) => {
    const { script, imageBase64, format, hasCoolers } = req.body;

    try {
        // Step A: Upload Image to ImgBB to get a public URL
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const form = new URLSearchParams();
        form.append('key', process.env.IMGBB_API_KEY);
        form.append('image', base64Data);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: form
        });
        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success) throw new Error("Image upload failed");
        const imageUrl = imgbbData.data.url;

        // Step B: Send to D-ID
        // Adding stitching configuration to help with the "coolers" and formatting
        const didPayload = {
            source_url: imageUrl,
            script: {
                type: "text",
                input: script,
                provider: { type: "microsoft", voice_id: "en-US-JennyNeural" } // Change voice based on language later
            },
            config: {
                fluent: "false",
                pad_audio: "0.0",
                stitch: true, // Helps with accessories like coolers
                result_format: "mp4"
            }
        };

        const didResponse = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${process.env.D_ID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(didPayload)
        });

        const didData = await didResponse.json();
        if (didData.id) {
            res.json({ success: true, id: didData.id });
        } else {
            throw new Error(didData.message || "D-ID API Error");
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Check Video Status Route (D-ID Processing takes time)
app.get('/check-video/:id', async (req, res) => {
    try {
        const response = await fetch(`https://api.d-id.com/talks/${req.params.id}`, {
            headers: { 'Authorization': `Basic ${process.env.D_ID_API_KEY}` }
        });
        const data = await response.json();
        res.json({ status: data.status, result_url: data.result_url });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));