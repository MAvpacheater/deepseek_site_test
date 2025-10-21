// General UI Logic
let currentMode = 'gemini';

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadStats();
    loadSavedConversations();
    loadPlans();
    loadMemories();
    initializeInputs();
    initializeShortcuts();
    loadTheme();
    updateStats();
});

// Перемикання режимів
function switchMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event?.target?.closest('.menu-btn')?.classList.add('active');
    
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const modeElement = document.getElementById(`${mode}Mode`);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    if (mode === 'library') {
        displayLibrary();
    } else if (mode === 'planner') {
        displayPlans();
    } else if (mode === 'memory') {
        displayMemories();
    }
}

// Завантаження теми
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = '☀️';
    }
}

// Перемикання теми
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        if (icon) icon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        if (icon) icon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Перемикання sidebar (мобільна версія)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Ініціалізація полів вводу
function initializeInputs() {
    const inputs = ['geminiInput', 'deepseekInput', 'imageInput'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                if (inputId === 'geminiInput') {
                    sendGeminiMessage();
                } else if (inputId === 'deepseekInput') {
                    sendDeepseekMessage();
                } else if (inputId === 'imageInput') {
                    generateImage();
                }
            }
        });
    });
}

// Ініціалізація гарячих клавіш
function initializeShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (currentMode === 'gemini' || currentMode === 'deepseek') {
                saveConversation(currentMode);
            }
        }
        
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
            const preview = document.getElementById('previewPanel');
            if (preview) preview.classList.remove('active');
        }
    });
}

// Додавання повідомлення в чат
function addMessage(text, sender, messagesId) {
    const messagesDiv = document.getElementById(messagesId);
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text || '(Код у правій панелі)';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Підрахунок токенів (приблизний)
function estimateTokens(text) {
    return Math.ceil(text.length / 3);
}

// Очищення чату
function clearChat(mode) {
    if (!confirm('⚠️ Очистити історію цього чату?')) return;
    
    if (mode === 'gemini') {
        if (typeof geminiHistory !== 'undefined') geminiHistory = [];
        const msgs = document.getElementById('geminiMessages');
        if (msgs) msgs.innerHTML = '';
    } else if (mode === 'deepseek') {
        if (typeof deepseekHistory !== 'undefined') deepseekHistory = [];
        if (typeof codeFiles !== 'undefined') window.codeFiles = {};
        if (typeof codeHistory !== 'undefined') window.codeHistory = {};
        
        const msgs = document.getElementById('deepseekMessages');
        if (msgs) msgs.innerHTML = '';
        
        const tabs = document.getElementById('fileTabs');
        if (tabs) tabs.innerHTML = '';
        
        const content = document.getElementById('codeContent');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>Немає файлів</h3>
                    <p>Код з'явиться тут після відповіді AI</p>
                </div>
            `;
        }
    } else if (mode === 'image') {
        if (typeof imageHistory !== 'undefined') imageHistory = [];
        const gallery = document.getElementById('imageGallery');
        if (gallery) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <h3>Генерація зображень</h3>
                    <p>Опиши що хочеш згенерувати</p>
                </div>
            `;
        }
    }
    
    alert('✅ Чат очищено!');
}

// Екранування HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Закрити модальне вікно
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}
