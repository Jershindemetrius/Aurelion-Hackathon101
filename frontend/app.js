// --- View Navigation ---
function switchView(viewId, element) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    
    // Show target view
    const targetView = document.getElementById(viewId);
    if(targetView) targetView.classList.add('active');
    
    // Update sidebar active states
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(element) {
        element.classList.add('active');
    }
    
    // Close notification panel if open
    const notifPanel = document.getElementById('notif-panel');
    if(notifPanel) notifPanel.classList.remove('show');
}

// --- Theme & Notifications ---
let isDarkMode = true;
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if(!themeIcon) return; // Safety check

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
    const badge = document.getElementById('notif-badge');
    
    if(!panel) return; // Safety check

    panel.classList.toggle('show');
    if(panel.classList.contains('show')) {
        unreadCount = 0;
        if(badge) {
            badge.classList.remove('active');
            badge.innerText = '0';
        }
    }
}

// Close notifications when clicking outside the panel
document.addEventListener('click', function(event) {
    const notifWrapper = document.querySelector('.notif-wrapper');
    const notifPanel = document.getElementById('notif-panel');
    
    // Only run this if both elements actually exist on the page
    if (notifWrapper && notifPanel) {
        if (!notifWrapper.contains(event.target)) {
            notifPanel.classList.remove('show');
        }
    }
});

function addNotification(type) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = type === 'Script' ? 'Your AI script is ready for review.' : `Your AI generated ${type.toLowerCase()} is ready for download!`;
    
    notifications.unshift({ type, message, time: timeNow });
    unreadCount++;
    
    const badge = document.getElementById('notif-badge');
    if(badge) {
        badge.innerText = unreadCount;
        badge.classList.add('active');
    }
    renderNotifications();
}

function renderNotifications() {
    const listEl = document.getElementById('notif-list');
    if(!listEl) return; // Safety check
    
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
    const badge = document.getElementById('notif-badge');
    if(badge) badge.classList.remove('active');
    renderNotifications();
}

// --- AI Scripting Logic ---
function selectLength(btn) {
    const lengthSelector = document.getElementById('length-selector');
    if(!lengthSelector) return;

    const buttons = lengthSelector.children;
    for(let b of buttons) { b.classList.remove('active'); }
    btn.classList.add('active');
}

function simulateScriptGeneration() {
    const loader = document.getElementById('script-loader');
    const resultDiv = document.getElementById('script-result');
    const textarea = document.getElementById('editable-script');
    const langSelect = document.getElementById('script-lang');
    
    if(!loader || !resultDiv || !textarea || !langSelect) return;

    const lang = langSelect.value;
    
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
    const textarea = document.getElementById('editable-script');
    const videoScriptBox = document.getElementById('final-video-script');
    
    if(!textarea || !videoScriptBox) return;

    const scriptText = textarea.value;
    
    // Transfer text
    videoScriptBox.value = scriptText;
    
    // Highlight the target box temporarily
    videoScriptBox.style.borderColor = 'var(--success)';
    setTimeout(() => videoScriptBox.style.borderColor = 'var(--border)', 1500);

    // Switch view to Video Gen
    const videoNavBtn = document.querySelectorAll('.nav-item')[2];
    switchView('video-gen', videoNavBtn);
}

// --- Simulate Image/Video Processing ---
function simulateGeneration(outputId, type) {
    const outputArea = document.getElementById(outputId);
    if(!outputArea) return;

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