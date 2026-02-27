// ===============================
// Camera & Avatar Logic
// ===============================
let selectedAvatarBase64 = null; 
const cameraContainer = document.getElementById("cameraContainer");
const webcam = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const avatarPreviewContainer = document.getElementById("avatarPreviewContainer");
const avatarPreview = document.getElementById("avatarPreview");
const imageUpload = document.getElementById("imageUpload");
let cameraStream = null;

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
        alert("Could not access camera. Please check your permissions.");
        console.error("Camera Error:", err);
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
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    cameraContainer.style.display = "none";
}

function setAvatar(base64Data) {
    selectedAvatarBase64 = base64Data;
    avatarPreview.src = base64Data;
    avatarPreviewContainer.style.display = "block";
}

// ===============================
// Generate Script
// ===============================
async function generateScript() {
    const idea = document.getElementById("ideaInput").value;
    const tone = document.getElementById("tone").value;
    const language = document.getElementById("language").value;
    const duration = document.getElementById("duration").value;
    const output = document.getElementById("scriptOutput");
    const btn = document.getElementById("generateScriptBtn");

    if (!idea.trim()) {
        alert("Please enter a content idea first!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Generating Script...";
    output.value = "Writing script...";

    try {
        const response = await fetch("http://localhost:5000/generate-script", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea, tone, language, duration })
        });

        const data = await response.json();

        if (data.success) {
            output.value = data.script; 
        } else {
            output.value = "Error: " + data.message;
        }
    } catch (error) {
        output.value = "Failed to connect to backend server. Is Node.js running?";
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerText = "Generate Script";
    }
}

// ===============================
// Generate Video
// ===============================
async function generateVideo() {
    const script = document.getElementById("scriptOutput").value;
    const videoBox = document.getElementById("videoPreview");
    const downloadBtn = document.getElementById("downloadBtn");
    const btn = document.getElementById("generateVideoBtn");

    if (!script.trim() || script.startsWith("Error:") || script.startsWith("Failed") || script === "Writing script...") {
        alert("Please generate a valid script first!");
        return;
    }
    if (!selectedAvatarBase64) {
        alert("Please select or capture an avatar image first!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Generating Video...";
    downloadBtn.disabled = true;
    
    videoBox.innerHTML = `
        <div style="text-align: center;">
            <div class="loader"></div>
            <p style="margin-top: 10px; color: #94a3b8;">Sending to D-ID... This takes up to 30 seconds.</p>
        </div>
    `;

    try {
        const response = await fetch("http://localhost:5000/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                script: script,
                imageBase64: selectedAvatarBase64 
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Unknown server error");
        }

        videoBox.innerHTML = `
            <video controls width="100%" style="border-radius: 8px; max-height: 100%;">
                <source src="${data.videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;

        downloadBtn.disabled = false;
        downloadBtn.onclick = () => window.open(data.videoUrl, "_blank");

    } catch (error) {
        console.error(error);
        videoBox.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px;">
                <p>⚠️ ${error.message}</p>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.innerText = "Generate Avatar Video";
    }
}