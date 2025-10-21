// General UI Logic
let currentMode = 'gemini';

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadStats();
    loadSavedConversations();
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
    
    const clickedButton = event?.target?.closest('.menu-btn');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const modeElement = document.getElementById(`${mode}Mode`);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    // Якщо переходимо в бібліотеку - відобразити її
    if (mode === 'library') {
        displayLibrary();
    }
}

// Завантаження теми
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}

// Перемикання теми
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        icon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        icon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Перемикання sidebar (мобільна версія)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('mobile-open');
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
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
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
        // Ctrl+K - Пошук
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
        
        // Ctrl+S - Зберегти
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (currentMode === 'gemini' || currentMode === 'deepseek') {
                saveConversation(currentMode);
            }
        }
        
        // Ctrl+Enter - Відправити повідомлення
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (currentMode === 'gemini') {
                sendGeminiMessage();
            } else if (currentMode === 'deepseek') {
                sendDeepseekMessage();
            } else if (currentMode === 'image') {
                generateImage();
            }
        }
        
        // Escape - Закрити модальні вікна
        if (e.key === 'Escape') {
            closeSearch();
            closeDiffViewer();
            closePreview();
            closeSaveModal();
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
    // Приблизно 1 токен = 4 символи для англійської, ~2 для української
    return Math.ceil(text.length / 3);
}

// Очищення чату
function clearChat(mode) {
    if (!confirm('⚠️ Очистити історію цього чату?')) return;
    
    if (mode === 'gemini') {
        geminiHistory = [];
        document.getElementById('geminiMessages').innerHTML = '';
    } else if (mode === 'deepseek') {
        deepseekHistory = [];
        document.getElementById('deepseekMessages').innerHTML = '';
        codeFiles = {};
        codeHistory = {};
        document.getElementById('fileTabs').innerHTML = '';
        document.getElementById('codeContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>Немає файлів</h3>
                <p>Код з'явиться тут після відповіді AI</p>
            </div>
        `;
    } else if (mode === 'image') {
        imageHistory = [];
        document.getElementById('imageGallery').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎨</div>
                <h3>Генерація зображень</h3>
                <p>Опиши що хочеш згенерувати (використовує DALL-E 3 через Pollinations.ai)</p>
            </div>
        `;
    }
    
    alert('✅ Чат очищено!');
}

// Пошук в історії
function openSearch() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    modal.classList.add('active');
    input.focus();
    
    input.oninput = function() {
        searchMessages(this.value);
    };
}

function closeSearch() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function searchMessages(query) {
    const results = document.getElementById('searchResults');
    if (!query.trim()) {
        results.innerHTML = '';
        return;
    }
    
    const history = currentMode === 'gemini' ? geminiHistory : deepseekHistory;
    const matches = [];
    
    history.forEach((msg, index) => {
        const content = msg.content || msg.parts?.[0]?.text || '';
        if (content.toLowerCase().includes(query.toLowerCase())) {
            matches.push({ index, content, role: msg.role });
        }
    });
    
    if (matches.length === 0) {
        results.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Нічого не знайдено</div>';
        return;
    }
    
    results.innerHTML = matches.map(match => {
        const preview = match.content.substring(0, 150) + '...';
        return `
            <div class="search-result-item" onclick="scrollToMessage(${match.index})">
                <div class="search-result-text">${escapeHtml(preview)}</div>
                <div class="search-result-meta">${match.role === 'user' ? '👤 Ви' : '🤖 AI'} • Повідомлення #${match.index + 1}</div>
            </div>
        `;
    }).join('');
}

function scrollToMessage(index) {
    closeSearch();
    const messagesDiv = document.getElementById(currentMode === 'gemini' ? 'geminiMessages' : 'deepseekMessages');
    const messages = messagesDiv.querySelectorAll('.message');
    if (messages[index]) {
        messages[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        messages[index].style.animation = 'highlight 2s ease';
    }
}

// Екранування HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Анімація виділення
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0%, 100% { background: transparent; }
        50% { background: rgba(102, 126, 234, 0.3); }
    }
`;
document.head.appendChild(style);
