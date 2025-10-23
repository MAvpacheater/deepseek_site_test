// General UI Logic - FIXED VERSION
let currentMode = 'gemini';

// Безпечні утиліти
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (e) {
        console.warn(`Invalid selector: ${selector}`);
        return null;
    }
}

function safeQuerySelectorAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (e) {
        console.warn(`Invalid selector: ${selector}`);
        return [];
    }
}

// Безпечна робота з localStorage
const StorageManager = {
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded');
                alert('⚠️ Сховище переповнене! Очисти старі дані.');
            } else {
                console.error('localStorage error:', e);
            }
            return false;
        }
    },
    
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('localStorage parse error:', e);
            return defaultValue;
        }
    },
    
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('localStorage remove error:', e);
            return false;
        }
    }
};

// Менеджер подій для уникнення витоків пам'яті
const EventManager = {
    listeners: new Map(),
    
    add(element, event, handler, options = {}) {
        if (!element) return;
        
        const key = `${element.id || Math.random()}-${event}`;
        
        // Видалити старий listener якщо є
        if (this.listeners.has(key)) {
            const oldHandler = this.listeners.get(key);
            element.removeEventListener(event, oldHandler);
        }
        
        element.addEventListener(event, handler, options);
        this.listeners.set(key, { element, event, handler });
    },
    
    remove(element, event) {
        if (!element) return;
        
        const key = `${element.id || Math.random()}-${event}`;
        
        if (this.listeners.has(key)) {
            const { handler } = this.listeners.get(key);
            element.removeEventListener(event, handler);
            this.listeners.delete(key);
        }
    },
    
    removeAll() {
        for (const [key, { element, event, handler }] of this.listeners) {
            if (element) {
                element.removeEventListener(event, handler);
            }
        }
        this.listeners.clear();
    }
};

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    try {
        loadSettings();
        loadStats();
        loadSavedConversations();
        loadPlans();
        loadMemories();
        initializeInputs();
        initializeShortcuts();
        loadTheme();
        updateStats();
        console.log('✅ Додаток ініціалізовано');
    } catch (error) {
        console.error('❌ Помилка ініціалізації:', error);
        alert('Помилка завантаження додатку. Спробуй оновити сторінку.');
    }
});

// Перемикання режимів
function switchMode(mode) {
    if (!mode) {
        console.error('Mode is required');
        return;
    }
    
    currentMode = mode;
    
    // Видалити active з усіх кнопок
    const menuButtons = safeQuerySelectorAll('.menu-btn');
    menuButtons.forEach(btn => btn.classList.remove('active'));
    
    // Додати active до поточної кнопки
    const activeButton = event?.target?.closest('.menu-btn');
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Приховати всі режими
    const modeContents = safeQuerySelectorAll('.mode-content');
    modeContents.forEach(content => content.classList.remove('active'));
    
    // Показати поточний режим
    const modeElement = safeGetElement(`${mode}Mode`);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    // Оновити відображення для спеціальних режимів
    try {
        if (mode === 'library' && typeof displayLibrary === 'function') {
            displayLibrary();
        } else if (mode === 'planner' && typeof displayPlans === 'function') {
            displayPlans();
        } else if (mode === 'memory' && typeof displayMemories === 'function') {
            displayMemories();
        }
    } catch (error) {
        console.error(`Error switching to ${mode} mode:`, error);
    }
    
    // Закрити sidebar на мобільних
    const sidebar = safeGetElement('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
    }
}

// Завантаження теми
function loadTheme() {
    try {
        const theme = localStorage.getItem('theme') || 'dark';
        const icon = safeGetElement('themeIcon');
        
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (icon) icon.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            if (icon) icon.textContent = '🌙';
        }
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

// Перемикання теми
function toggleTheme() {
    try {
        const body = document.body;
        const icon = safeGetElement('themeIcon');
        
        if (body.classList.contains('light-theme')) {
            body.classList.remove('light-theme');
            if (icon) icon.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('light-theme');
            if (icon) icon.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        }
    } catch (error) {
        console.error('Error toggling theme:', error);
    }
}

// Перемикання sidebar (мобільна версія)
function toggleSidebar() {
    const sidebar = safeGetElement('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Ініціалізація полів вводу
function initializeInputs() {
    const inputs = ['geminiInput', 'deepseekInput', 'imageInput'];
    
    inputs.forEach(inputId => {
        const input = safeGetElement(inputId);
        if (!input) return;
        
        // Auto-resize
        EventManager.add(input, 'input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });

        // Ctrl+Enter для відправки
        EventManager.add(input, 'keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                
                try {
                    if (inputId === 'geminiInput' && typeof sendGeminiMessage === 'function') {
                        sendGeminiMessage();
                    } else if (inputId === 'deepseekInput' && typeof sendDeepseekMessage === 'function') {
                        sendDeepseekMessage();
                    } else if (inputId === 'imageInput' && typeof generateImage === 'function') {
                        generateImage();
                    }
                } catch (error) {
                    console.error('Error sending message:', error);
                    alert('❌ Помилка відправки повідомлення');
                }
            }
        });
    });
}

// Ініціалізація гарячих клавіш
function initializeShortcuts() {
    EventManager.add(document, 'keydown', (e) => {
        try {
            // Ctrl/Cmd + S - Зберегти
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if ((currentMode === 'gemini' || currentMode === 'deepseek') && 
                    typeof saveConversation === 'function') {
                    saveConversation(currentMode);
                }
            }
            
            // Ctrl/Cmd + K - Пошук
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = safeGetElement('librarySearch') || 
                                   safeGetElement('memorySearch');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Escape - Закрити модальні вікна
            if (e.key === 'Escape') {
                const modals = safeQuerySelectorAll('.modal.active');
                modals.forEach(modal => modal.classList.remove('active'));
                
                const preview = safeGetElement('previewPanel');
                if (preview && preview.classList.contains('active')) {
                    preview.classList.remove('active');
                }
            }
        } catch (error) {
            console.error('Error handling shortcut:', error);
        }
    });
}

// Додавання повідомлення в чат
function addMessage(text, sender, messagesId) {
    const messagesDiv = safeGetElement(messagesId);
    if (!messagesDiv) {
        console.error(`Messages container '${messagesId}' not found`);
        return;
    }
    
    try {
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
        
        // Scroll до низу
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('Error adding message:', error);
    }
}

// Підрахунок токенів (приблизний)
function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 3);
}

// Очищення чату
function clearChat(mode) {
    if (!confirm('⚠️ Очистити історію цього чату?')) return;
    
    try {
        if (mode === 'gemini') {
            if (typeof geminiHistory !== 'undefined') {
                window.geminiHistory = [];
            }
            const msgs = safeGetElement('geminiMessages');
            if (msgs) msgs.innerHTML = '';
            
        } else if (mode === 'deepseek') {
            if (typeof deepseekHistory !== 'undefined') {
                window.deepseekHistory = [];
            }
            if (typeof codeFiles !== 'undefined') {
                window.codeFiles = {};
            }
            if (typeof codeHistory !== 'undefined') {
                window.codeHistory = {};
            }
            
            const msgs = safeGetElement('deepseekMessages');
            if (msgs) msgs.innerHTML = '';
            
            const tabs = safeGetElement('fileTabs');
            if (tabs) tabs.innerHTML = '';
            
            const content = safeGetElement('codeContent');
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
            if (typeof imageHistory !== 'undefined') {
                window.imageHistory = [];
            }
            const gallery = safeGetElement('imageGallery');
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
    } catch (error) {
        console.error('Error clearing chat:', error);
        alert('❌ Помилка очищення чату');
    }
}

// Екранування HTML
function escapeHtml(text) {
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
    };
    
    return String(text).replace(/[&<>"'/]/g, char => map[char]);
}

// Закрити модальне вікно
function closeModal(modalId) {
    const modal = safeGetElement(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Очищення при вивантаженні сторінки
window.addEventListener('beforeunload', () => {
    EventManager.removeAll();
});

// Експорт функцій для глобального доступу
window.switchMode = switchMode;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.addMessage = addMessage;
window.estimateTokens = estimateTokens;
window.clearChat = clearChat;
window.escapeHtml = escapeHtml;
window.closeModal = closeModal;
window.safeGetElement = safeGetElement;
window.StorageManager = StorageManager;
window.EventManager = EventManager;
