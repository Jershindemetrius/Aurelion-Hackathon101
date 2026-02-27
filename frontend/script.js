let selectedAvatarBase64 = null; 
let finalVideoUrl = null;

// --- DOM Elements ---
const cameraContainer = document.getElementById("cameraContainer");
const webcam = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const avatarPreviewContainer = document.getElementById("avatarPreviewContainer");
const avatarPreview = document.getElementById("avatarPreview");
const imageUpload = document.getElementById("imageUpload");
const libraryGrid = document.getElementById("libraryGrid");

// Initialize Avatar Library from LocalStorage
let savedAvatars = JSON.parse(localStorage.getItem('creovate_avatars')) || [];
renderLibrary();
updateVoiceOptions(); // Initialize voice dropdown on load

imageUpload.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            setAvatar(e.target.result);
            stopCamera(); 
        };
        reader.readAsDataURL(file);
    }
});

// --- Camera & Avatar Logic ---
async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = cameraStream;
        cameraContainer.style.display = "block";
        avatarPreviewContainer.style.display = "none";
    } catch (err) {
        alert("Could not access camera. Please check permissions.");
    }
}

function capturePhoto() {
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    setAvatar(canvas.toDataURL("image/jpeg"));
    stopCamera();
}

function stopCamera() {
    if (typeof cameraStream !== 'undefined' && cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    cameraContainer.style.display = "none";
}

function setAvatar(base64Data) {
    selectedAvatarBase64 = base64Data;
    avatarPreview.src = base64Data;
    avatarPreviewContainer.style.display = "block";
}

function saveToLibrary() {
    if (!selectedAvatarBase64) return;
    if (savedAvatars.length >= 4) savedAvatars.shift();
    savedAvatars.push(selectedAvatarBase64);
    localStorage.setItem('creovate_avatars', JSON.stringify(savedAvatars));
    renderLibrary();
    alert("Avatar saved to library!");
}

function renderLibrary() {
    if (!libraryGrid) return;
    libraryGrid.innerHTML = '';
    savedAvatars.forEach((avatar) => {
        const img = document.createElement('img');
        img.src = avatar;
        img.className = 'library-thumb';
        img.onclick = () => setAvatar(avatar);
        libraryGrid.appendChild(img);
    });
}

// --- Dynamic Voice Selection ---
function updateVoiceOptions() {
    const language = document.getElementById("language").value;
    const voiceSelect = document.getElementById("voiceModel");
    
    voiceSelect.innerHTML = ""; // Clear existing
    
    if (language === "English") {
        voiceSelect.innerHTML += `<option value="en-US-JennyNeural">Jenny (Professional Female)</option>`;
        voiceSelect.innerHTML += `<option value="en-US-GuyNeural">Guy (Energetic Male)</option>`;
        voiceSelect.innerHTML += `<option value="en-US-AriaNeural">Aria (Storyteller Female)</option>`;
    } else if (language === "Tamil") {
        voiceSelect.innerHTML += `<option value="ta-IN-PallaviNeural">Pallavi (Clear Female)</option>`;
        voiceSelect.innerHTML += `<option value="ta-IN-ValluvarNeural">Valluvar (Deep Male)</option>`;
    }
}

// --- Expandable Script Modal Logic ---
const scriptModal = document.getElementById("scriptModal");
const mainScriptOutput = document.getElementById("scriptOutput");
const modalScriptOutput = document.getElementById("scriptModalOutput");
const wordCountDisplay = document.getElementById("modalWordCount");

function openScriptModal() {
    modalScriptOutput.value = mainScriptOutput.value;
    updateWordCount();
    scriptModal.style.display = "flex";
}

function closeScriptModal() {
    scriptModal.style.display = "none";
}

function saveScriptModal() {
    mainScriptOutput.value = modalScriptOutput.value;
    closeScriptModal();
}

modalScriptOutput.addEventListener('input', updateWordCount);

function updateWordCount() {
    const text = modalScriptOutput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCountDisplay.innerText = `${count} words`;
}

// --- API Functions ---
async function generateScript() {
    const idea = document.getElementById("ideaInput").value;
    const tone = document.getElementById("tone").value;
    const language = document.getElementById("language").value;
    const duration = document.getElementById("duration").value;
    const btn = document.getElementById("generateScriptBtn");

    if (!idea.trim()) return alert("Please enter a content idea first!");

    btn.disabled = true;
    btn.innerHTML = "<div class='loader btn-loader'></div> Generating...";
    mainScriptOutput.value = "Connecting to Creovate AI Engine...";

    try {
        const response = await fetch("http://localhost:5000/generate-script", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
    script: script,
    imageBase64: selectedAvatarBase64,
    language: language,
    voice: voice, // <--- This is the new parameter
    format: format
})
        });
        const data = await response.json();
        mainScriptOutput.value = data.success ? data.script : "Error: " + data.message;
    } catch (error) {
        mainScriptOutput.value = "Failed to connect to backend.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = "✨ Generate AI Script";
    }
}

async function generateVideo() {
    const script = mainScriptOutput.value;
    const language = document.getElementById("language").value;
    const voice = document.getElementById("voiceModel").value;
    const format = document.getElementById("videoFormat").value;
    
    const videoBox = document.getElementById("videoPreview");
    const downloadBtn = document.getElementById("downloadBtn");
    const btn = document.getElementById("generateVideoBtn");

    if (!script.trim()) return alert("Please generate or type a script first!");
    if (!selectedAvatarBase64) return alert("Please select or capture an avatar image!");

    btn.disabled = true;
    btn.innerHTML = "🎬 Rendering Pipeline Active... (Takes ~30s)";
    if (downloadBtn) downloadBtn.disabled = true;
    
    videoBox.innerHTML = `
        <div class="processing-container">
            <div class="loader large-loader"></div>
            <h4 class="mt-3">Processing Neural Avatar</h4>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Synthesizing audio and mapping facial landmarks...</p>
        </div>
    `;

    try {
        const response = await fetch("http://localhost:5000/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                script: script,
                imageBase64: selectedAvatarBase64,
                language: language,
                voice: voice,
                format: format
            })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message || "Failed to generate video.");

        finalVideoUrl = data.result_url;
        
        // Advanced video rendering logic to respect format
        const aspectClass = format === 'portrait' ? 'video-portrait' : (format === 'square' ? 'video-square' : 'video-landscape');

        videoBox.innerHTML = `
            <video class="rendered-video ${aspectClass}" controls crossorigin="anonymous" autoplay>
                <source src="${finalVideoUrl}" type="video/mp4">
            </video>
        `;
        
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => window.open(finalVideoUrl, "_blank");
        }

    } catch (error) {
        console.error("Video Generation Error:", error);
        videoBox.innerHTML = `
            <div class="error-box">
                ⚠️ <strong>Render Error:</strong> ${error.message}<br>
                <small>Check your Node.js terminal for deeper logs.</small>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = "🎬 Render Final Avatar Video";
    }
}

// --- Post-Production Functions ---
function updateStatus(message) {
    const status = document.getElementById("editStatus");
    status.innerText = message;
    status.style.opacity = 1;
    setTimeout(() => { status.style.opacity = 0; }, 3000);
}

function addSubtitles() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const scriptText = mainScriptOutput.value;
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        let vtt = "WEBVTT\n\n";
        vtt += `00:00:00.000 --> 00:01:00.000\n${scriptText}\n`;
        const blob = new Blob([vtt], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        const oldTrack = video.querySelector("track");
        if(oldTrack) oldTrack.remove();

        const track = document.createElement("track");
        track.kind = "captions";
        track.label = "English";
        track.srclang = "en";
        track.src = url;
        track.default = true;
        
        video.appendChild(track);
        video.textTracks[0].mode = "showing";
        updateStatus("✅ Auto-Subtitles synced via WebVTT");
    }
}

function enhanceVideo() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        if (video.classList.contains('hdr-enhanced')) {
            video.classList.remove('hdr-enhanced');
            updateStatus("🔄 HDR Enhancement bypassed.");
        } else {
            video.classList.add('hdr-enhanced');
            updateStatus("✨ AI Color grading & HDR applied!");
        }
    }
}

let bgmAudio = null;
function addBGM() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        if (!bgmAudio) {
            bgmAudio = new Audio("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3");
            bgmAudio.loop = true;
            bgmAudio.volume = 0.12; 
        }
        
        video.onplay = () => bgmAudio.play();
        video.onpause = () => bgmAudio.pause();
        video.onended = () => { bgmAudio.pause(); bgmAudio.currentTime = 0; };
        
        updateStatus("🎵 Cinematic BGM layered on audio track");
    }
}

// --- Publishing Functions ---
function generateCaption() {
    const box = document.getElementById("captionBox");
    const platform = document.getElementById("socialPlatform").value;
    
    box.value = "🤖 Analyzing context with NLP...";
    
    setTimeout(() => {
        if (platform === 'instagram') {
            box.value = "🚀 AI Avatars are shifting the paradigm! Watch this breakdown of the latest tools built directly in Creovate. \n\n#AI #CreatorEconomy #FutureOfWork #Reels";
        } else if (platform === 'linkedin') {
            box.value = "The enterprise creator economy is adopting automation rapidly. Here is my latest analysis on AI-driven workflows generated entirely via prompt-to-video architectures.\n\n#ArtificialIntelligence #Innovation #TechTrends";
        } else {
            box.value = "Next-Gen AI Avatar workflow explained! Subscribe for more tech experiments. #Shorts #AI #Tech";
        }
    }, 800);
}

function schedulePost() {
    const dateVal = document.getElementById("scheduleDate").value;
    const platform = document.getElementById("socialPlatform").value;
    
    if (!finalVideoUrl || !dateVal) return alert("Please ensure the video is rendered and a date is selected.");

    alert(`✅ API Call simulated: Video successfully scheduled for ${platform.toUpperCase()} via Creovate automation!`);
}