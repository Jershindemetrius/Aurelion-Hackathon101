let selectedAvatarBase64 = null; 
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

// Avatar Library Functions
function saveToLibrary() {
    if (!selectedAvatarBase64) return;
    if (savedAvatars.length >= 4) savedAvatars.shift(); // Keep last 4
    savedAvatars.push(selectedAvatarBase64);
    localStorage.setItem('creovate_avatars', JSON.stringify(savedAvatars));
    renderLibrary();
    alert("Avatar saved to library!");
}

function renderLibrary() {
    libraryGrid.innerHTML = '';
    savedAvatars.forEach((avatar, index) => {
        const img = document.createElement('img');
        img.src = avatar;
        img.className = 'library-thumb';
        img.onclick = () => setAvatar(avatar);
        libraryGrid.appendChild(img);
    });
}

// Generate Script (Featherless AI)
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
    output.value = "Writing script... (Connecting to Creovate AI)";

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
        btn.innerText = "Generate Script";
    }
}

// Generate Video (D-ID & ImgBB)
async function generateVideo() {
    const script = document.getElementById("scriptOutput").value;
    const format = document.getElementById("videoFormat").value;
    const hasCoolers = document.getElementById("hasCoolers").checked;
    const videoBox = document.getElementById("videoPreview");
    const downloadBtn = document.getElementById("downloadBtn");
    const btn = document.getElementById("generateVideoBtn");

    if (!script.trim() || !selectedAvatarBase64) return alert("Requires script and avatar!");

    btn.disabled = true;
    btn.innerText = "Generating Video...";
    downloadBtn.disabled = true;
    
    videoBox.innerHTML = `
        <div style="text-align: center;">
            <div class="loader"></div>
            <p style="margin-top: 10px; color: #94a3b8;">Processing End-to-End Workflow...<br>Please wait up to 60 seconds.</p>
        </div>
    `;

    try {
        const response = await fetch("http://localhost:5000/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                script: script,
                imageBase64: selectedAvatarBase64,
                format: format,
                hasCoolers: hasCoolers
            })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message || "Unknown error");

        // Polling loop to check if D-ID video is ready
        checkVideoStatus(data.id, videoBox, downloadBtn, btn);

    } catch (error) {
        videoBox.innerHTML = `<div style="color: #ef4444; padding: 20px;">⚠️ ${error.message}</div>`;
        btn.disabled = false;
        btn.innerText = "Generate Avatar Video";
    }
}

async function checkVideoStatus(id, videoBox, downloadBtn, btn) {
    const interval = setInterval(async () => {
        const res = await fetch(`http://localhost:5000/check-video/${id}`);
        const data = await res.json();

        if (data.status === 'done') {
            clearInterval(interval);
            videoBox.innerHTML = `
                <video controls width="100%" style="border-radius: 8px; max-height: 100%;">
                    <source src="${data.result_url}" type="video/mp4">
                </video>
            `;
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => window.open(data.result_url, "_blank");
            btn.disabled = false;
            btn.innerText = "Generate Avatar Video";
        } else if (data.status === 'error') {
            clearInterval(interval);
            videoBox.innerHTML = `<div style="color: #ef4444;">⚠️ Generation failed at D-ID.</div>`;
            btn.disabled = false;
            btn.innerText = "Generate Avatar Video";
        }
    }, 5000); // Check every 5 seconds
}