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

// --- API Functions ---

async function generateScript() {
    const idea = document.getElementById("ideaInput").value;
    const tone = document.getElementById("tone").value;
    const language = document.getElementById("language").value;
    const duration = document.getElementById("duration").value;
    const output = document.getElementById("scriptOutput");
    const btn = document.getElementById("generateScriptBtn");

    if (!idea.trim()) return alert("Please enter a content idea first!");

    btn.disabled = true;
    btn.innerText = "Generating Script...";
    output.value = "Writing script... (Connecting to AI)";

    try {
        const response = await fetch("http://localhost:5000/generate-script", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea, tone, language, duration })
        });
        const data = await response.json();
        output.value = data.success ? data.script : "Error: " + data.message;
    } catch (error) {
        output.value = "Failed to connect to backend.";
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Generate Script";
    }
}

async function generateVideo() {
    const script = document.getElementById("scriptOutput").value;
    const language = document.getElementById("language").value;
    
    const videoBox = document.getElementById("videoPreview");
    const downloadBtn = document.getElementById("downloadBtn");
    const btn = document.getElementById("generateVideoBtn");

    if (!script.trim()) return alert("Please generate or type a script first!");
    if (!selectedAvatarBase64) return alert("Please select or capture an avatar image!");

    btn.disabled = true;
    btn.innerText = "🎬 Rendering Video... (Takes ~30s)";
    if (downloadBtn) downloadBtn.disabled = true;
    
    videoBox.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loader"></div>
            <p style="margin-top: 15px; color: #94a3b8;">
                Rendering Video via D-ID Studio...<br>
                Please wait while we animate your avatar.
            </p>
        </div>
    `;

    try {
        const response = await fetch("http://localhost:5000/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                script: script,
                imageBase64: selectedAvatarBase64,
                language: language
            })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message || "Failed to generate video.");

        finalVideoUrl = data.result_url;
        
        // Render video with crossOrigin anonymous so we can load subtitles securely
        videoBox.innerHTML = `
            <video controls crossorigin="anonymous" width="100%" style="border-radius: 8px; max-height: 100%; transition: all 0.3s ease;">
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
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 20px; border-radius: 8px;">
                ⚠️ <strong>Error:</strong> ${error.message}<br>
                <small>Check your terminal running server.js for more details.</small>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "Generate Avatar Video";
    }
}

// --- REAL Post-Production Functions ---

function updateStatus(message) {
    const status = document.getElementById("editStatus");
    status.innerText = message;
    setTimeout(() => { status.innerText = ""; }, 3000);
}

function addSubtitles() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const scriptText = document.getElementById("scriptOutput").value;
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        // Create a basic WebVTT file in memory based on the script
        let vtt = "WEBVTT\n\n";
        vtt += `00:00:00.000 --> 00:01:00.000\n${scriptText}\n`;
        
        const blob = new Blob([vtt], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Remove old track if exists
        const oldTrack = video.querySelector("track");
        if(oldTrack) oldTrack.remove();

        // Add new track dynamically
        const track = document.createElement("track");
        track.kind = "captions";
        track.label = "English";
        track.srclang = "en";
        track.src = url;
        track.default = true;
        
        video.appendChild(track);
        video.textTracks[0].mode = "showing";
        updateStatus("✅ Subtitles successfully attached!");
    }
}

function enhanceVideo() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        // Toggle CSS hardware-accelerated enhancement
        if (video.style.filter) {
            video.style.filter = "";
            updateStatus("🔄 Enhancement removed.");
        } else {
            video.style.filter = "contrast(1.15) saturate(1.2) brightness(1.05)";
            updateStatus("✅ Color grading & enhancement applied!");
        }
    }
}

let bgmAudio = null;
function addBGM() {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    
    if (video) {
        if (!bgmAudio) {
            // Royalty-free background track from Pixabay
            bgmAudio = new Audio("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3");
            bgmAudio.loop = true;
            bgmAudio.volume = 0.15; // Soft volume behind the avatar's voice
        }
        
        // Sync the music dynamically with video play/pause
        video.onplay = () => bgmAudio.play();
        video.onpause = () => bgmAudio.pause();
        video.onended = () => { bgmAudio.pause(); bgmAudio.currentTime = 0; };
        
        updateStatus("✅ Background music synchronized!");
    }
}

function generateCaption() {
    const box = document.getElementById("captionBox");
    const platform = document.getElementById("socialPlatform").value;
    
    if (platform === 'instagram') {
        box.value = "🚀 Watch this AI Avatar in action! Built with Creovate. \n\n#AI #CreatorEconomy #TechTrends #Reels";
    } else if (platform === 'linkedin') {
        box.value = "The creator economy is shifting towards automation. Here is my latest analysis on AI-driven workflows.\n\n#ArtificialIntelligence #Innovation #EdTech";
    } else {
        box.value = "AI Avatar workflow explained! Subscribe for more. #Shorts #AI";
    }
}

function schedulePost() {
    const dateVal = document.getElementById("scheduleDate").value;
    const platform = document.getElementById("socialPlatform").value;
    const caption = document.getElementById("captionBox").value;
    
    if (!finalVideoUrl || !dateVal) return alert("Please generate a video and select a date first!");

    // Convert local date to ICS format (YYYYMMDDTHHMMSSZ)
    const date = new Date(dateVal);
    const startString = date.toISOString().replace(/-|:|\.\d+/g, '');
    const endString = new Date(date.getTime() + 15 * 60000).toISOString().replace(/-|:|\.\d+/g, ''); // 15 mins later

    // Build the calendar invite file contents
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${startString}\nDTEND:${endString}\nSUMMARY:Publish ${platform.toUpperCase()} Video\nDESCRIPTION:Time to post your Creovate Avatar Video!\\n\\nCaption:\\n${caption.replace(/\n/g, '\\n')}\\n\\nVideo Link:\\n${finalVideoUrl}\nEND:VEVENT\nEND:VCALENDAR`;

    // Trigger download of the calendar file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Creovate_Post_${platform}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ Calendar invite downloaded! Open it to save to your Google/Outlook Calendar.`);
}