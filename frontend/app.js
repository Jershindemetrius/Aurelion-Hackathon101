// --- View Navigation ---
function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(element) {
        element.classList.add('active');
    }
    
    document.getElementById('notif-panel').classList.remove('show');
}

// --- Theme & Notifications ---
let isDarkMode = true;
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        body.classList.remove('light-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

let unreadCount = 0;
let notifications = [];

function toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    panel.classList.toggle('show');
    if(panel.classList.contains('show')) {
        unreadCount = 0;
        document.getElementById('notif-badge').classList.remove('active');
        document.getElementById('notif-badge').innerText = '0';
    }
}

// Close notifications when clicking outside the panel
document.addEventListener('click', function(event) {
    const notifWrapper = document.querySelector('.notif-wrapper');
    if (!notifWrapper.contains(event.target)) {
        document.getElementById('notif-panel').classList.remove('show');
    }
});

function addNotification(type) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = type === 'Script' ? 'Your AI script is ready for review.' : `Your AI generated ${type.toLowerCase()} is ready for download!`;
    notifications.unshift({ type, message, time: timeNow });
    unreadCount++;
    const badge = document.getElementById('notif-badge');
    badge.innerText = unreadCount;
    badge.classList.add('active');
    renderNotifications();
}

function renderNotifications() {
    const listEl = document.getElementById('notif-list');
    listEl.innerHTML = '';
    if (notifications.length === 0) {
        listEl.innerHTML = '<div class="notif-item empty-state" style="justify-content: center; color: var(--text-muted); padding: 2rem 1rem;">No new notifications</div>';
        return;
    }
    notifications.forEach(notif => {
        let iconClass = 'fa-check';
        if(notif.type === 'Video') iconClass = 'fa-film';
        if(notif.type === 'Image') iconClass = 'fa-image';
        if(notif.type === 'Script') iconClass = 'fa-pen-nib';
        
        const itemHTML = `
            <div class="notif-item">
                <div class="notif-icon"><i class="fa-solid ${iconClass}"></i></div>
                <div class="notif-content">
                    <p><strong>${notif.type} Complete</strong><br>${notif.message}</p>
                    <span class="notif-time">${notif.time}</span>
                </div>
            </div>
        `;
        listEl.insertAdjacentHTML('beforeend', itemHTML);
    });
}

function clearNotifications() {
    notifications = [];
    unreadCount = 0;
    document.getElementById('notif-badge').classList.remove('active');
    renderNotifications();
}

// --- AI Scripting Logic ---
function selectLength(btn) {
    const buttons = document.getElementById('length-selector').children;
    for(let b of buttons) { b.classList.remove('active'); }
    btn.classList.add('active');
}

function simulateScriptGeneration() {
    const loader = document.getElementById('script-loader');
    const resultDiv = document.getElementById('script-result');
    const textarea = document.getElementById('editable-script');
    const lang = document.getElementById('script-lang').value;
    
    resultDiv.style.display = 'none';
    loader.style.display = 'block';

    setTimeout(() => {
        loader.style.display = 'none';
        if(lang === 'tamil') {
            textarea.value = "வணக்கம்! இன்னைக்கு நாம AI எப்படி சாஃப்ட்வேர் டெவலப்மெண்ட் உலகத்தை மாத்த போகுதுன்னு பாக்க போறோம். கோடிங் பண்றது இனி கஷ்டம் இல்ல. AI டூல்ஸ் யூஸ் பண்ணி நாம எப்படி ஸ்மார்ட்டா ஒர்க் பண்ணலாம்னு இந்த வீடியோல முழுசா பாப்போம். ஸ்கிப் பண்ணாம பாருங்க!";
        } else {
            textarea.value = "Hey everyone! Today we're diving into how AI is completely transforming software development. Coding is no longer just about memorizing syntax. We'll explore how you can use AI tools to work smarter and build faster. Stick around!";
        }
        resultDiv.style.display = 'block';
        addNotification('Script');
    }, 2000);
}

function sendToVideoGen() {
    const scriptText = document.getElementById('editable-script').value;
    const videoScriptBox = document.getElementById('final-video-script');
    
    // Transfer text
    videoScriptBox.value = scriptText;
    
    // Highlight the target box temporarily to show it updated
    videoScriptBox.style.borderColor = 'var(--success)';
    setTimeout(() => videoScriptBox.style.borderColor = 'var(--border)', 1500);

    // Switch view to Video Gen
    switchView('video-gen', document.querySelectorAll('.nav-item')[2]);
}

// --- Simulate Image/Video Processing ---
function simulateGeneration(outputId, type) {
    const outputArea = document.getElementById(outputId);
    const loader = outputArea.querySelector('.loader');
    const statusText = outputArea.querySelector('.status-text');

    loader.style.display = 'block';
    statusText.innerText = 'Analyzing prompt and generating via AI Pipeline...';
    outputArea.style.borderColor = 'var(--primary)';
    outputArea.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';

    setTimeout(() => {
        loader.style.display = 'none';
        statusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 2rem; margin-bottom: 10px;"></i><br>${type} Generation Complete! Ready for download.`;
        outputArea.style.borderColor = 'var(--success)';
        outputArea.style.backgroundColor = document.body.classList.contains('light-mode') 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(16, 185, 129, 0.05)';

        addNotification(type);
    }, 3000);
}