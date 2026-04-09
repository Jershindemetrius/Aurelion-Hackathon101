process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data'); 

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5000;

// ─── Utility: Sleep ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Utility: Gemini Call ─────────────────────────────────────────────────────
async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const raw = await response.text();
        throw new Error(`Gemini returned non-JSON response: ${raw.substring(0, 200)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`Gemini API Error: ${data.error.message}`);
    return data.candidates[0].content.parts[0].text.replace(/["*]/g, '').trim();
}

// ─── 1. Generate Script ───────────────────────────────────────────────────────
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    if (!idea || !tone || !language || !duration) return res.status(400).json({ success: false, message: 'Missing fields.' });

    const prompt = `Write a short, engaging script for a ${duration}-second video about: "${idea}". Tone: ${tone}. Language MUST be ${language}. Only output spoken words.`;
    try {
        res.json({ success: true, script: await callGemini(prompt) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 2. Generate Caption ─────────────────────────────────────────────────────
app.post('/generate-caption', async (req, res) => {
    const { script, platform } = req.body;
    if (!script || !platform) return res.status(400).json({ success: false, message: 'Missing fields.' });

    const prompt = `Read this video script: "${script}". Write a viral caption optimized for ${platform} with 3-4 hashtags. Output ONLY the caption.`;
    try {
        res.json({ success: true, caption: await callGemini(prompt) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 3. Upload Image to ImgBB (UPDATED) ───────────────────────────────────────
// ─── 3. Upload Image to ImgBB (BUFFER FIX) ────────────────────────────────────
async function uploadToImgBB(imageBase64) {
    if (!process.env.IMGBB_API_KEY) {
        throw new Error("IMGBB_API_KEY is missing from your .env file.");
    }

    // 1. Strip the data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 2. Convert the giant text string into a proper binary Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 3. Package it as a real file, which bypasses WAF/Cloudflare text limits
    const form = new FormData();
    form.append('key', process.env.IMGBB_API_KEY);
    form.append('image', imageBuffer, { 
        filename: 'avatar.jpg', 
        contentType: 'image/jpeg' 
    });

    const response = await fetch('https://api.imgbb.com/1/upload', { 
        method: 'POST', 
        body: form, 
        headers: form.getHeaders() 
    });
    
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (error) {
        console.error("ImgBB Raw Response:", responseText.substring(0, 500));
        throw new Error(`ImgBB rejected the upload. File might still be too large, but WAF was bypassed.`);
    }

    if (!data.success) {
        throw new Error(`ImgBB upload failed: ${data?.error?.message || 'Unknown error'}`);
    }
    
    return data.data.url;
}

// ─── 4. D-ID: Create Talking Avatar Video ────────────────────────────────────
async function createDIDVideo(imageUrl, script, voice, didKey) {
    console.log('🎬 Creating D-ID talking avatar video...');
    
    // D-ID API endpoint for creating talks
    const url = 'https://api.d-id.com/talks';
    
    const payload = {
        source_url: imageUrl,
        script: {
            type: 'text',
            input: script,
            provider: {
                type: 'microsoft',
                voice_id: voice || 'en-US-JennyNeural'
            }
        },
        config: {
            fluent: true,
            pad_audio: 0.0
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${didKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error || !data.id) {
        throw new Error(`D-ID creation failed: ${JSON.stringify(data)}`);
    }

    console.log(`✅ D-ID talk created with ID: ${data.id}`);
    return data.id;
}

// ─── 5. D-ID: Poll for Video Status ──────────────────────────────────────────
async function pollDIDStatus(talkId, didKey) {
    const MAX_POLLS = 60;
    const POLL_INTERVAL_MS = 3000;
    
    console.log(`🔄 Polling D-ID status for talk_id: ${talkId}`);

    for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL_MS);
        console.log(`  Poll ${i + 1}/${MAX_POLLS}...`);

        const response = await fetch(`https://api.d-id.com/talks/${talkId}`, {
            headers: {
                'Authorization': `Basic ${didKey}`
            }
        });

        const data = await response.json();
        const status = data.status;

        if (status === 'done') {
            console.log('✅ Video ready:', data.result_url);
            return data.result_url;
        }

        if (status === 'error' || status === 'rejected') {
            throw new Error(`D-ID rendering failed: ${data.error?.description || 'Unknown error'}`);
        }

        // Status could be: created, processing, done, error, rejected
    }

    throw new Error('Video generation timed out. Please try again.');
}

// ─── 6. Generate Video (D-ID Integration) ─────────────────────────────────────
app.post('/generate-video', async (req, res) => {
    const { script, imageBase64, voice, format } = req.body;

    if (!script || !imageBase64) {
        return res.status(400).json({ success: false, message: 'Missing script or image.' });
    }

    const didKey = process.env.DID_API_KEY;
    if (!didKey) {
        return res.status(500).json({ success: false, message: 'DID_API_KEY not set in .env' });
    }

    try {
        // Step 1: Upload image to ImgBB to get a public URL
        console.log('📸 Uploading image to ImgBB...');
        const imageUrl = await uploadToImgBB(imageBase64);
        console.log('✅ Image uploaded:', imageUrl);

        // Step 2: Create D-ID talking avatar
        const talkId = await createDIDVideo(imageUrl, script, voice, didKey);

        // Step 3: Poll for video completion
        const videoUrl = await pollDIDStatus(talkId, didKey);

        // Return success with video URL
        res.json({ 
            success: true, 
            result_url: videoUrl,
            imgbb_url: imageUrl 
        });

    } catch (error) {
        console.error('❌ [/generate-video]', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        keys: { 
            gemini: !!process.env.GEMINI_API_KEY, 
            did: !!process.env.DID_API_KEY, 
            imgbb: !!process.env.IMGBB_API_KEY 
        } 
    });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));