import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ═══════════════════════════════════════════
// FIREBASE INITIALIZATION
// ═══════════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyDqOPA5Lul3NQJofyJvUQBFZb5DAPry7UM",
    authDomain: "creovate-101.firebaseapp.com",
    projectId: "creovate-101",
    storageBucket: "creovate-101.firebasestorage.app",
    messagingSenderId: "479670114683",
    appId: "1:479670114683:web:0d5fab68e95294a94445de",
    measurementId: "G-X2VWJZQEK5"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ═══════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════
let selectedAvatarBase64 = null;
let finalVideoUrl        = null;
let userDocRef           = null;

// Auth Check
const userStr = localStorage.getItem('currentUser');
if (!userStr) { window.location.href = "login.html"; }
const user = JSON.parse(userStr);
userDocRef = doc(db, "users", user.email);

// ═══════════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════════
const cameraContainer        = document.getElementById("cameraContainer");
const webcam                 = document.getElementById("webcam");
const canvas                 = document.getElementById("canvas");
const avatarPreviewContainer = document.getElementById("avatarPreviewContainer");
const avatarPreview          = document.getElementById("avatarPreview");
const imageUpload            = document.getElementById("imageUpload");
const libraryGrid            = document.getElementById("libraryGrid");
const themeToggleBtn         = document.getElementById('themeToggle');
const mainScriptOutput       = document.getElementById("scriptOutput");
const modalScriptOutput      = document.getElementById("scriptModalOutput");
const wordCountDisplay       = document.getElementById("modalWordCount");

// ═══════════════════════════════════════════
// FLATPICKR CALENDAR
// ═══════════════════════════════════════════
flatpickr("#scheduleDate", {
    enableTime: true,
    dateFormat: "Y-m-d h:i K",
    minDate: "today",
});

// ═══════════════════════════════════════════
// FIREBASE PROFILE LOAD
// ═══════════════════════════════════════════
const initProfile = async () => {
    try {
        const userDoc = await getDoc(userDocRef);
        let data = {};
        if (userDoc.exists()) {
            data = userDoc.data();
        } else {
            data = { name: user.name, email: user.email, theme: "dark", plan: "Premium Plan", avatar: "" };
            await setDoc(userDocRef, data);
        }

        document.getElementById('sidebarName').innerText     = data.name  || user.name;
        document.getElementById('sidebarPlan').innerText     = data.plan  || "Premium Plan";
        document.getElementById('settingsNameDisplay').innerText  = data.name  || user.name;
        document.getElementById('settingsEmailDisplay').innerText = data.email || user.email;

        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || user.name)}&background=6366f1&color=fff`;
        const activeAvatar  = data.avatar || defaultAvatar;

        document.getElementById('sidebarAvatar').src           = activeAvatar;
        document.getElementById('sidebarAvatar').style.display = "block";
        document.getElementById('settingsAvatarPreview').src   = activeAvatar;

        const darkToggle = document.getElementById('darkToggle');
        const body       = document.querySelector('.theme-body');
        const root       = document.documentElement;

        darkToggle.checked = data.theme !== 'light';
        if (!darkToggle.checked) {
            body.classList.add('light-mode');
            root.classList.add('light-mode');
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        document.getElementById('sidebarPlan').innerText = "Database Offline";
    }
};
initProfile();

// ═══════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════
const navs  = ['navStudio', 'navLibrary', 'navAnalytics', 'navSettings'];
const views = ['studioView', 'libraryView', 'analyticsView', 'settingsView'];
const pageTitle    = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

function switchTab(activeNavId, activeViewId, title, subtitle) {
    navs.forEach(id  => document.getElementById(id).classList.remove('active'));
    views.forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById(activeNavId).classList.add('active');
    document.getElementById(activeViewId).style.display = 'block';
    pageTitle.innerText    = title;
    pageSubtitle.innerText = subtitle;
}

document.getElementById('navStudio').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('navStudio', 'studioView', "Creator Studio Workspace", "End-to-End Workflow: AI Script → Render → Publish");
});
document.getElementById('navLibrary').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('navLibrary', 'libraryView', "Video Asset Library", "Manage and re-edit your previously generated content");
    renderVideoHistory();
});
document.getElementById('navAnalytics').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('navAnalytics', 'analyticsView', "Advanced Usage Analytics", "Track your productivity, goals, and rendering history");
    loadAnalyticsData();
});
document.getElementById('navSettings').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('navSettings', 'settingsView', "Account Settings", "Manage your profile, preferences, and integrations");
});

// ═══════════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════════
function applyTheme(isLightMode) {
    const newTheme = isLightMode ? 'light' : 'dark';
    document.documentElement.classList.toggle('light-mode', isLightMode);
    document.querySelector('.theme-body').classList.toggle('light-mode', isLightMode);
    document.getElementById('darkToggle').checked = !isLightMode;
    localStorage.setItem('creovate_theme', newTheme);
    if (document.getElementById('analyticsView').style.display === 'block') loadAnalyticsData();
    if (userDocRef) updateDoc(userDocRef, { theme: newTheme }).catch(err => console.error(err));
}

themeToggleBtn.addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('light-mode')));
document.getElementById('darkToggle').addEventListener('change', (e) => applyTheme(!e.target.checked));

// ═══════════════════════════════════════════
// SETTINGS CONTROLS
// ═══════════════════════════════════════════
document.getElementById('changeAvatarBtn').onclick = () => document.getElementById('settingsFileInput').click();
document.getElementById('settingsFileInput').addEventListener('change', function () {
    if (!this.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        document.getElementById('settingsAvatarPreview').src = base64;
        document.getElementById('sidebarAvatar').src         = base64;
        await updateDoc(userDocRef, { avatar: base64 });
    };
    reader.readAsDataURL(this.files[0]);
});
document.getElementById('removeAvatarBtn').onclick = async () => {
    const name = document.getElementById('settingsNameDisplay').innerText;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    document.getElementById('settingsAvatarPreview').src = defaultAvatar;
    document.getElementById('sidebarAvatar').src         = defaultAvatar;
    await updateDoc(userDocRef, { avatar: "" });
};
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('creovate_theme');
    window.location.href = "login.html";
});

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════
const IDLE_LIMIT     = 60000;
const DEFAULT_GOAL_SEC = 7200;
let startTime    = Date.now();
let lastActivity = Date.now();
let idle         = false;
let myChart      = null;

function todayStr() { return new Date().toISOString().split("T")[0]; }

["mousemove", "keydown", "click", "scroll"].forEach(evt => {
    window.addEventListener(evt, () => { lastActivity = Date.now(); idle = false; });
});

setInterval(() => {
    if (Date.now() - lastActivity > IDLE_LIMIT) idle = true;
    const seconds = idle ? 0 : Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById("liveTimer");
    if (el) el.innerText = formatTime(seconds);
}, 1000);

function saveTime() {
    if (idle) return;
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    let usage = JSON.parse(localStorage.getItem("usageData")) || {};
    if (!usage[todayStr()]) usage[todayStr()] = 0;
    usage[todayStr()] += seconds;
    localStorage.setItem("usageData", JSON.stringify(usage));
}
window.addEventListener("beforeunload", saveTime);
window.addEventListener("pagehide",     saveTime);

function getGoals()       { return JSON.parse(localStorage.getItem("dailyGoals")) || {}; }
function getGoalSeconds() { return getGoals()[todayStr()] || DEFAULT_GOAL_SEC; }

window.saveGoal = function () {
    const val  = document.getElementById("goalInput").value;
    const unit = document.getElementById("goalUnit").value;
    if (!val || val <= 0) return alert("Enter a valid value");
    const seconds = unit === "hr" ? val * 3600 : val * 60;
    const goals   = getGoals();
    goals[todayStr()] = Number(seconds);
    localStorage.setItem("dailyGoals", JSON.stringify(goals));
    toggleGoalView(true);
    loadAnalyticsData();
};
window.enableGoalEdit = function () { toggleGoalView(false); };

function toggleGoalView(hasGoal) {
    document.getElementById("goalSetArea").classList.toggle("hidden", hasGoal);
    document.getElementById("goalViewArea").classList.toggle("hidden", !hasGoal);
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
}
function formatShort(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

function loadAnalyticsData() {
    const usage = JSON.parse(localStorage.getItem("usageData")) || {};
    const table = document.getElementById("weeklyTable");
    table.innerHTML = `<tr><th>Date</th><th>Time Spent</th></tr>`;

    const labels = []; const values = []; let weekTotal = 0; const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d  = new Date(); d.setDate(today.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        const sec = usage[ds] || 0;
        labels.push(ds.substring(5));
        values.push(Math.round(sec / 60));
        weekTotal += sec;
        const row = document.createElement("tr");
        row.innerHTML = `<td>${ds}</td><td><strong>${formatShort(sec)}</strong></td>`;
        row.onclick   = () => document.getElementById("dailyDetail").innerText = `📅 ${ds} Session: ${formatTime(sec)} Total`;
        table.appendChild(row);
    }

    document.getElementById("todayTime").innerText = formatShort(usage[todayStr()] || 0);
    document.getElementById("weekTime").innerText  = formatShort(weekTotal);

    const goalSec  = getGoalSeconds();
    const todaySec = usage[todayStr()] || 0;
    toggleGoalView(!!getGoals()[todayStr()]);
    document.getElementById("goalBar").style.width  = Math.min((todaySec / goalSec) * 100, 100) + "%";
    document.getElementById("goalText").innerText   = goalSec >= 3600
        ? `Daily Target: ${Math.round(goalSec / 3600)} hr`
        : `Daily Target: ${Math.round(goalSec / 60)} min`;

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(); d.setDate(today.getDate() - i);
        if ((usage[d.toISOString().split("T")[0]] || 0) > 0) streak++; else break;
    }
    document.getElementById("streak").innerText = streak + " days";

    const isLight   = document.documentElement.classList.contains('light-mode');
    const textColor = isLight ? '#64748b' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    if (myChart) myChart.destroy();
    myChart = new Chart(document.getElementById("weekChart").getContext('2d'), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Minutes Active",
                data: values,
                backgroundColor: isLight ? '#4f46e5' : '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}

// ═══════════════════════════════════════════
// STUDIO PIPELINE — STATE
// ═══════════════════════════════════════════
let savedAvatars = JSON.parse(localStorage.getItem('creovate_avatars'))        || [];
let savedVideos  = JSON.parse(localStorage.getItem('creovate_video_history')) || [];

renderLibrary();
renderVideoHistory();
window.updateVoiceOptions = updateVoiceOptions;
updateVoiceOptions();

// ── Watch Step 1 dropdowns to keep Step 3 summary in sync ─────────────────
['language', 'voiceModel', 'videoFormat', 'duration'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncRenderSummary);
});
syncRenderSummary(); // initial render

function syncRenderSummary() {
    const languageEl = document.getElementById("language");
    const voiceEl    = document.getElementById("voiceModel");
    const formatEl   = document.getElementById("videoFormat");
    const durationEl = document.getElementById("duration");

    const voiceName = voiceEl?.options[voiceEl.selectedIndex]?.text || "—";
    const langName  = languageEl?.value || "English";
    const fmtText   = formatEl?.options[formatEl.selectedIndex]?.text || "—";
    const durVal    = durationEl?.value;
    const durText   = durVal ? `${durVal} Seconds` : "—";

    const s = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    s("summaryVoice",    voiceName);
    s("summaryLanguage", langName);
    s("summaryFormat",   fmtText.split("(")[0].trim());
    s("summaryDuration", durText);
}

// ═══════════════════════════════════════════
// IMAGE UPLOAD & CAMERA
// ═══════════════════════════════════════════
imageUpload.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) { window.setAvatar(e.target.result); window.stopCamera(); };
        reader.readAsDataURL(file);
    }
});

let cameraStream = null;

window.startCamera = async function () {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = cameraStream;
        cameraContainer.style.display        = "block";
        avatarPreviewContainer.style.display = "none";
    } catch (err) { alert("Could not access camera. Please check permissions."); }
};

window.capturePhoto = function () {
    canvas.width  = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    canvas.getContext("2d").drawImage(webcam, 0, 0, canvas.width, canvas.height);
    window.setAvatar(canvas.toDataURL("image/jpeg"));
    window.stopCamera();
};

window.stopCamera = function () {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraContainer.style.display = "none";
};

window.setAvatar = function (base64Data) {
    selectedAvatarBase64             = base64Data;
    avatarPreview.src                = base64Data;
    avatarPreviewContainer.style.display = "block";
};

window.saveToLibrary = function () {
    if (!selectedAvatarBase64) return;
    if (savedAvatars.length >= 4) savedAvatars.shift();
    savedAvatars.push(selectedAvatarBase64);
    localStorage.setItem('creovate_avatars', JSON.stringify(savedAvatars));
    renderLibrary();
    alert("Avatar saved to library!");
};

function renderLibrary() {
    if (!libraryGrid) return;
    libraryGrid.innerHTML = '';
    savedAvatars.forEach((avatar) => {
        const img = document.createElement('img');
        img.src       = avatar;
        img.className = 'library-thumb';
        img.onclick   = () => window.setAvatar(avatar);
        libraryGrid.appendChild(img);
    });
}

// ═══════════════════════════════════════════
// VOICE OPTIONS (driven by Language select in Step 1)
// ═══════════════════════════════════════════
function updateVoiceOptions() {
    const language   = document.getElementById("language").value;
    const voiceSelect = document.getElementById("voiceModel");
    voiceSelect.innerHTML = "";

    if (language === "English") {
        voiceSelect.innerHTML = `
            <option value="2f72ee82b83d4b00af16c4771d611752">Eric (Professional Male)</option>
            <option value="1bd001e7e50f421d891986aad5158bc8">Sara (Clear Female)</option>
            <option value="0f81d8db02b347b98ff2aab495e8652c">Christopher (Storyteller Male)</option>
        `;
    } else if (language === "Tamil") {
        voiceSelect.innerHTML = `
            <option value="0d4f263e80d84f8db7f8e8749aeb05e6">Anjali (Clear Female)</option>
            <option value="e131d90479ab4fb4bdfd5ab910d67664">Karthik (Deep Male)</option>
        `;
    }
    syncRenderSummary();
}

// ═══════════════════════════════════════════
// SCRIPT MODAL
// ═══════════════════════════════════════════
const scriptModal = document.getElementById("scriptModal");

window.openScriptModal = function () {
    modalScriptOutput.value = mainScriptOutput.value;
    updateWordCount();
    scriptModal.style.display = "flex";
};
window.closeScriptModal = function () { scriptModal.style.display = "none"; };
window.saveScriptModal  = function () { mainScriptOutput.value = modalScriptOutput.value; window.closeScriptModal(); };

modalScriptOutput.addEventListener('input', updateWordCount);
function updateWordCount() {
    const text = modalScriptOutput.value.trim();
    wordCountDisplay.innerText = `${text ? text.split(/\s+/).length : 0} words`;
}

// ═══════════════════════════════════════════
// CORE APIs
// ═══════════════════════════════════════════

// ── Generate Script ────────────────────────
window.generateScript = async function () {
    const idea = document.getElementById("ideaInput").value;
    const btn  = document.getElementById("generateScriptBtn");
    if (!idea.trim()) return alert("Please enter a content idea first!");

    btn.disabled   = true;
    btn.innerHTML  = "<div class='loader btn-loader'></div> Generating...";
    mainScriptOutput.value = "Connecting to Creovate AI Engine...";

    try {
        const response = await fetch("http://localhost:5000/generate-script", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idea,
                tone:     document.getElementById("tone").value,
                language: document.getElementById("language").value,
                duration: document.getElementById("duration").value
            })
        });
        const data = await response.json();
        mainScriptOutput.value = data.success ? data.script : "Error: " + data.message;
    } catch (error) {
        mainScriptOutput.value = "⚠️ Failed to connect to backend. Is the server running on port 5000?";
    } finally {
        btn.disabled  = false;
        btn.innerHTML = "✨ Generate AI Script";
    }
};

// ── Generate Video ─────────────────────────
window.generateVideo = async function () {
    const script = mainScriptOutput.value;
    const format = document.getElementById("videoFormat").value;
    const btn    = document.getElementById("generateVideoBtn");
    const videoBox = document.getElementById("videoPreview");

    if (!script.trim())          return alert("Please generate or type a script first!");
    if (!selectedAvatarBase64)   return alert("Please select or capture an avatar image in Step 2!");

    btn.disabled  = true;
    btn.innerHTML = "🎬 Rendering Pipeline Active... (Takes ~30-60s)";
    document.getElementById("downloadBtn").disabled = true;
    videoBox.innerHTML = `
        <div class="processing-container">
            <div class="loader large-loader"></div>
            <h4 class="mt-3">Processing HeyGen Neural Avatar</h4>
            <p style="color:var(--text-muted); font-size:0.9rem;">Synthesizing audio and mapping facial landmarks...</p>
        </div>`;

    try {
        const response = await fetch("http://localhost:5000/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                script,
                imageBase64: selectedAvatarBase64,
                language:    document.getElementById("language").value,
                voice:       document.getElementById("voiceModel").value,
                format
            })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "Failed to generate video.");

        finalVideoUrl = data.result_url;
        const aspectClass = format === 'portrait' ? 'video-portrait' : (format === 'square' ? 'video-square' : 'video-landscape');
        videoBox.innerHTML = `<video class="rendered-video ${aspectClass}" controls crossorigin="anonymous" autoplay><source src="${finalVideoUrl}" type="video/mp4"></video>`;

        const dlBtn = document.getElementById("downloadBtn");
        dlBtn.disabled = false;
        dlBtn.onclick  = () => window.open(finalVideoUrl, "_blank");
        saveVideoToHistory(finalVideoUrl, format);

    } catch (error) {
        videoBox.innerHTML = `<div class="error-box">⚠️ <strong>Render Error:</strong> ${error.message}<br><small>Check your Node.js terminal for deeper logs.</small></div>`;
    } finally {
        btn.disabled  = false;
        btn.innerHTML = "🎬 Render Final Avatar Video";
    }
};

// ═══════════════════════════════════════════
// VIDEO HISTORY
// ═══════════════════════════════════════════
function saveVideoToHistory(url, format) {
    savedVideos.unshift({ url, format, date: new Date().toISOString() });
    if (savedVideos.length > 15) savedVideos.pop();
    localStorage.setItem('creovate_video_history', JSON.stringify(savedVideos));
    renderVideoHistory();
}

function renderVideoHistory() {
    const grid = document.getElementById("videoHistoryGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (savedVideos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px; background:rgba(255,255,255,0.05); border-radius:var(--radius-md);">
                <span style="font-size:2rem; display:block; margin-bottom:10px;">📭</span>
                <p style="color:var(--text-muted);">No videos rendered yet.</p>
            </div>`;
        return;
    }
    savedVideos.forEach((video) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        if (video.format === 'landscape') div.style.aspectRatio = '16/9';
        if (video.format === 'square')    div.style.aspectRatio = '1/1';
        div.innerHTML = `
            <video src="${video.url}" muted loop playsinline></video>
            <div class="history-meta">
                <span>📅 ${new Date(video.date).toLocaleDateString()}</span>
                <span class="history-badge">▶ Open</span>
            </div>`;
        div.onclick       = () => window.loadVideoIntoPlayer(video.url, video.format);
        div.onmouseenter  = (e) => e.currentTarget.querySelector('video').play();
        div.onmouseleave  = (e) => { const v = e.currentTarget.querySelector('video'); v.pause(); v.currentTime = 0; };
        grid.appendChild(div);
    });
}

window.loadVideoIntoPlayer = function (url, format) {
    finalVideoUrl = url;
    const aspectClass = format === 'portrait' ? 'video-portrait' : (format === 'square' ? 'video-square' : 'video-landscape');
    document.getElementById("videoPreview").innerHTML = `<video class="rendered-video ${aspectClass}" controls crossorigin="anonymous" autoplay><source src="${url}" type="video/mp4"></video>`;
    const dlBtn = document.getElementById("downloadBtn");
    dlBtn.disabled = false;
    dlBtn.onclick  = () => window.open(url, "_blank");
    document.getElementById("navStudio").click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ═══════════════════════════════════════════
// POST-PRODUCTION TOOLS
// ═══════════════════════════════════════════
function updateStatus(message) {
    const status = document.getElementById("editStatus");
    status.innerText  = message;
    status.style.opacity = 1;
    setTimeout(() => { status.style.opacity = 0; }, 3000);
}

window.addSubtitles = function () {
    if (!finalVideoUrl) return alert("Generate or load a video first!");
    const video = document.querySelector("#videoPreview video");
    if (video) {
        const blob     = new Blob(["WEBVTT\n\n00:00:00.000 --> 00:01:00.000\n" + (mainScriptOutput.value || "Auto-generated captions") + "\n"], { type: 'text/vtt' });
        const oldTrack = video.querySelector("track");
        if (oldTrack) oldTrack.remove();
        const track   = document.createElement("track");
        track.kind    = "captions";
        track.label   = "English";
        track.srclang = "en";
        track.src     = URL.createObjectURL(blob);
        track.default = true;
        video.appendChild(track);
        video.textTracks[0].mode = "showing";
        updateStatus("✅ Auto-Subtitles synced via WebVTT");
    }
};

window.enhanceVideo = function () {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    if (video) {
        video.classList.toggle('hdr-enhanced');
        updateStatus(video.classList.contains('hdr-enhanced') ? "✨ AI Color grading & HDR applied!" : "🔄 HDR Enhancement bypassed.");
    }
};

let bgmAudio = null;
window.addBGM = function () {
    if (!finalVideoUrl) return alert("Generate a video first!");
    const video = document.querySelector("#videoPreview video");
    if (video) {
        if (!bgmAudio) {
            bgmAudio         = new Audio("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3");
            bgmAudio.loop    = true;
            bgmAudio.volume  = 0.12;
        }
        video.onplay  = () => bgmAudio.play();
        video.onpause = () => bgmAudio.pause();
        video.onended = () => { bgmAudio.pause(); bgmAudio.currentTime = 0; };
        updateStatus("🎵 Cinematic BGM layered on audio track");
    }
};

// ═══════════════════════════════════════════
// NLP CAPTION GENERATOR
// ═══════════════════════════════════════════
window.generateCaption = async function () {
    const script   = mainScriptOutput.value;
    const box      = document.getElementById("captionBox");
    const platform = document.getElementById("socialPlatform").value;

    if (!script.trim()) return alert("Please generate a video script first!");
    box.value = "🤖 Analyzing context with NLP (Creovate AI)...";

    try {
        const response = await fetch("http://localhost:5000/generate-caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script, platform })
        });
        const data = await response.json();
        box.value = data.success ? data.caption : "⚠️ " + data.message;
    } catch (error) {
        box.value = "⚠️ Failed to connect to NLP Engine. Is the server running on port 5000?";
    }
};

// ═══════════════════════════════════════════
// ICS SCHEDULER
// ═══════════════════════════════════════════
window.schedulePost = function () {
    const dateVal  = document.getElementById("scheduleDate").value;
    const platform = document.getElementById("socialPlatform").value;
    const caption  = document.getElementById("captionBox").value;

    if (!finalVideoUrl || !dateVal) return alert("Please generate a video and select a Schedule Time first!");

    const date        = new Date(dateVal);
    const startString = date.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    const endString   = new Date(date.getTime() + 15 * 60000).toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${startString}`,
        `DTEND:${endString}`,
        `SUMMARY:Publish ${platform.toUpperCase()} Video`,
        `DESCRIPTION:Time to post your Creovate Avatar Video!\\n\\nCaption:\\n${caption.replace(/\n/g, '\\n')}\\n\\nVideo Link:\\n${finalVideoUrl}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `Creovate_Post_${platform}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`✅ Post Scheduled! Calendar invite downloaded.`);
};