process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data'); // Make sure you have this installed: npm install form-data

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5000;

// ─── Utility: Sleep ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Utility: Gemini Call ─────────────────────────────────────────────────────
async function callGemini(prompt) {
    // Using gemini-2.5-flash-lite to avoid high-demand quota errors
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
    if (!data.candidates?.length) throw new Error('Gemini returned no candidates.');
    return data.candidates[0].content.parts[0].text.replace(/["*]/g, '').trim();
}

// ─── 1. Generate Script ───────────────────────────────────────────────────────
app.post('/generate-script', async (req, res) => {
    const { idea, tone, language, duration } = req.body;
    if (!idea || !tone || !language || !duration) {
        return res.status(400).json({ success: false, message: 'Missing required fields: idea, tone, language, duration.' });
    }

    const prompt = `Write a short, engaging script for a ${duration}-second video about: "${idea}".
Tone: ${tone}.
Language MUST be ${language}.
Only output the spoken words. No stage directions, no scene notes, no quotes.`;

    try {
        const script = await callGemini(prompt);
        res.json({ success: true, script });
    } catch (error) {
        console.error('[/generate-script]', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 2. Generate Caption ─────────────────────────────────────────────────────
app.post('/generate-caption', async (req, res) => {
    const { script, platform } = req.body;
    if (!script || !platform) {
        return res.status(400).json({ success: false, message: 'Missing required fields: script, platform.' });
    }

    const prompt = `You are an expert social media manager.
Read this video script: "${script}"
Write a highly engaging, viral caption optimized for ${platform}.
Include 3-4 relevant hashtags. Output ONLY the caption text — no extra commentary.`;

    try {
        const caption = await callGemini(prompt);
        res.json({ success: true, caption });
    } catch (error) {
        console.error('[/generate-caption]', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 3. Upload Image to ImgBB ─────────────────────────────────────────────────
async function uploadToImgBB(imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const form = new FormData();
    form.append('key', process.env.IMGBB_API_KEY);
    form.append('image', base64Data);

    console.log('📸 Uploading image to ImgBB...');
    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: form,
        headers: form.getHeaders() 
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(`ImgBB upload failed: ${data?.error?.message || 'Unknown ImgBB error'}`);
    }

    console.log('✅ Image hosted at ImgBB:', data.data.url);
    return data.data.url;
}

// ─── 4. Generate Video (HeyGen V1 Fully Automated) ────────────────────────────
app.post('/generate-video', async (req, res) => {
    // Extracting format from frontend to map to HeyGen ratio
    const { script, imageBase64, voice, format } = req.body;

    if (!script || !imageBase64) {
        return res.status(400).json({ success: false, message: 'Missing required fields: script, imageBase64.' });
    }

    const heygenKey = process.env.HEYGEN_API_KEY;
    if (!heygenKey) return res.status(500).json({ success: false, message: 'HEYGEN_API_KEY not set in .env' });

    try {
        // Step 1: Upload to ImgBB to get a live URL
        const imgbbUrl = await uploadToImgBB(imageBase64);

        // Map the frontend format to HeyGen's expected ratio
        const ratioMap = {
            'portrait': '9:16',
            'landscape': '16:9',
            'square': '1:1'
        };
        const videoRatio = ratioMap[format] || '9:16';

        // Step 2: Submit video generation job to HeyGen v1
        console.log(`🎬 Submitting automated video job to HeyGen v1 (Ratio: ${videoRatio})...`);
        const heygenPayload = {
            background: "#000000",
            ratio: videoRatio,
            clips: [
                {
                    avatar_id: "Angela-inTshirt-20220820", // Placeholder required by v1 validation
                    avatar_style: "normal",
                    input_text: script.substring(0, 5000),
                    voice_id: voice || '2f72ee82b83d4b00af16c4771d611752',
                    talking_photo_url: imgbbUrl // Bypasses the v2 ID requirement!
                }
            ],
            test: false 
        };

        const generateResponse = await fetch('https://api.heygen.com/v1/video.generate', {
            method: 'POST',
            headers: {
                'X-Api-Key': heygenKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(heygenPayload)
        });

        const contentType = generateResponse.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const raw = await generateResponse.text();
            throw new Error(`HeyGen returned non-JSON (HTTP ${generateResponse.status}): ${raw.substring(0, 300)}`);
        }

        const generateData = await generateResponse.json();
        if (generateData.error) throw new Error(`HeyGen generate error: ${generateData.error.message || JSON.stringify(generateData.error)}`);
        if (!generateData.data?.video_id) throw new Error('HeyGen did not return a video_id. Response: ' + JSON.stringify(generateData));

        const videoId = generateData.data.video_id;
        console.log(`🔄 Polling HeyGen status for video_id: ${videoId}`);

        // Step 3: Poll for completion 
        const MAX_POLLS = 40;
        const POLL_INTERVAL_MS = 3000;

        for (let i = 0; i < MAX_POLLS; i++) {
            await sleep(POLL_INTERVAL_MS);
            console.log(`  Poll ${i + 1}/${MAX_POLLS}...`);

            const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
                headers: { 'X-Api-Key': heygenKey }
            });

            const statusData = await statusResponse.json();
            const status = statusData.data?.status;

            if (status === 'completed') {
                const finalVideoUrl = statusData.data.video_url || statusData.data.video_url_unwatermarked;
                console.log('✅ Video ready:', finalVideoUrl);
                return res.json({ success: true, result_url: finalVideoUrl, imgbb_url: imgbbUrl });
            }

            if (status === 'failed') {
                throw new Error(`HeyGen rendering failed. Error: ${statusData.data?.error?.detail || statusData.data?.error || 'Unknown'}`);
            }
        }

        throw new Error('Video generation timed out after ~2 minutes. Try again or check HeyGen dashboard.');

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
            heygen: !!process.env.HEYGEN_API_KEY,
            imgbb: !!process.env.IMGBB_API_KEY
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Creovate server running on http://localhost:${PORT}`);
    console.log(`   → Gemini key set: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`   → HeyGen key set: ${!!process.env.HEYGEN_API_KEY}`);
    console.log(`   → ImgBB  key set: ${!!process.env.IMGBB_API_KEY}`);
});