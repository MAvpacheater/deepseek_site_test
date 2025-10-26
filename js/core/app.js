// 🚀 AI Assistant Hub - Main Application Entry Point (FIXED)

console.log('🚀 Starting AI Assistant Hub...');

// ========================================
// ГЛОБАЛЬНІ КОНСТАНТИ
// ========================================

const AppConfig = {
    name: 'AI Assistant Hub',
    version: '1.0.0',
    defaultMode: 'dashboard',
    features: {
        gemini: true,
        deepseek: true,
        imageGenerator: true,
        planner: true,
        memory: true,
        library: true
    }
};

// ========================================
// ПЕРЕВІРКА БРАУЗЕРА
// ========================================

function checkBrowserCompatibility() {
    const features = {
        localStorage: typeof Storage !== 'undefined',
        indexedDB: !!window.indexedDB,
        fetch: typeof fetch === 'function',
        webCrypto: !!(window.crypto && window.crypto.subtle)
    };

    const missing = [];
    for (const [feature, supported] of Object.entries(features)) {
        if (!supported) {
            missing.push(feature);
        }
    }

    if (missing.length > 0) {
        console.warn('⚠️ Missing features:', missing);
        return { compatible: false, missing };
    }

    console.log('✅ Browser compatibility check passed');
    return { compatible: true, missing: [] };
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ CORE МОДУЛІВ
// ========================================

async function initCoreModules() {
    console.log('📦 Loading data...');

    // Перевірити чи всі core модулі завантажені
    const requiredModules = {
        appState: window.appState,
        eventBus: window.eventBus
    };

    const missing = [];
    for (const [name, module] of Object.entries(requiredModules)) {
        if (!module) {
            missing.push(name);
            console.error(`❌ ${name} not found`);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Core modules missing: ${missing.join(', ')}`);
    }

    // Ініціалізувати IndexedDB якщо є
    if (window.indexedDBService) {
        try {
            await indexedDBService.init();
            console.log('✅ IndexedDB initialized');
        } catch (error) {
            console.warn('⚠️ IndexedDB init failed:', error);
        }
    }

    console.log('✅ Core modules loaded');
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ UI
// ========================================

function initUI() {
    console.log('🎨 Initializing UI...');

    // Theme
    if (window.themeSwitcher) {
        themeSwitcher.init();
    }

    // Event listeners для sidebar
    setupSidebarNavigation();

    // Modal Manager
    if (window.modalManager) {
        modalManager.init();
    }

    // Toast Manager
    if (window.toastManager) {
        toastManager.init();
    }

    // Loading Manager
    if (window.loadingManager) {
        loadingManager.init();
    }

    console.log('✅ UI initialized');
}

// ========================================
// SIDEBAR NAVIGATION
// ========================================

function setupSidebarNavigation() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    
    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode) {
                switchMode(mode);
            }
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (window.themeSwitcher) {
                themeSwitcher.toggle();
            }
        });
    }
}

// ========================================
// ПЕРЕМИКАННЯ РЕЖИМІВ
// ========================================

function switchMode(mode) {
    console.log(`🔄 Switching to: ${mode}`);

    // Оновити active стан в меню
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });

    // Завантажити контент
    loadPageContent(mode);

    // Оновити state
    if (window.appState) {
        appState.setMode(mode);
    }

    // Emit event
    if (window.eventBus) {
        eventBus.emit('mode:change', { mode });
    }
}

// ========================================
// ЗАВАНТАЖЕННЯ КОНТЕНТУ
// ========================================

function loadPageContent(mode) {
    const container = document.getElementById('pageContainer');
    if (!container) return;

    container.innerHTML = '';

    switch (mode) {
        case 'dashboard':
            loadDashboard(container);
            break;
        case 'gemini':
            loadGeminiChat(container);
            break;
        case 'deepseek':
            loadDeepSeekCoder(container);
            break;
        case 'image':
            loadImageGenerator(container);
            break;
        case 'planner':
            loadPlanner(container);
            break;
        case 'memory':
            loadMemory(container);
            break;
        case 'library':
            loadLibrary(container);
            break;
        case 'settings':
            loadSettings(container);
            break;
        default:
            container.innerHTML = '<h1>404 - Page not found</h1>';
    }
}

// ========================================
// DASHBOARD
// ========================================

function loadDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>📊 Dashboard</h1>
            <p>Огляд активності та статистики</p>
        </div>
        <div id="dashboardContent" class="dashboard-content">
            <div class="loading">Завантаження...</div>
        </div>
    `;

    if (window.dashboardManager) {
        setTimeout(() => {
            dashboardManager.render();
        }, 100);
    }
}

// ========================================
// GEMINI CHAT
// ========================================

function loadGeminiChat(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>✨ Gemini Chat</h1>
            <div class="page-actions">
                <button onclick="clearGeminiChat()" class="btn-secondary">🗑️ Очистити</button>
                <button onclick="saveGeminiChat()" class="btn-secondary">💾 Зберегти</button>
            </div>
        </div>
        <div class="chat-container">
            <div id="geminiMessages" class="messages-container"></div>
            <div class="chat-input-container">
                <textarea id="geminiInput" placeholder="Напиши повідомлення... (Ctrl+Enter для відправки)" rows="1"></textarea>
                <button id="geminiSendBtn" class="btn-primary">Надіслати</button>
            </div>
        </div>
    `;

    if (window.geminiChat) {
        setTimeout(() => {
            geminiChat.renderMessages();
        }, 100);
    }
}

// ========================================
// DEEPSEEK CODER
// ========================================

function loadDeepSeekCoder(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>💻 DeepSeek Coder</h1>
            <div class="page-actions">
                <button onclick="importFromGitHub()" class="btn-secondary">🐙 GitHub</button>
                <button onclick="clearDeepseekChat()" class="btn-secondary">🗑️ Очистити</button>
            </div>
        </div>
        <div class="coder-layout">
            <div id="deepseekChatSection" class="chat-section" style="width: 55%;">
                <div id="deepseekMessages" class="messages-container"></div>
                <div class="chat-input-container">
                    <textarea id="deepseekInput" placeholder="Опиши що створити... (Ctrl+Enter)" rows="2"></textarea>
                    <button id="deepseekSendBtn" class="btn-primary">Створити</button>
                </div>
            </div>
            <div id="codeSection" class="code-section collapsed">
                <div class="code-header">
                    <select id="fileSelector">
                        <option value="">Виберіть файл...</option>
                    </select>
                    <button onclick="togglePreview()" class="btn-secondary">👁️ Прев'ю</button>
                </div>
                <div id="fileTabs" class="file-tabs"></div>
                <div id="codeContent" class="code-content"></div>
                <div id="previewPanel" class="preview-panel">
                    <iframe id="previewFrame" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>
            </div>
        </div>
    `;

    if (window.deepseekChat) {
        setTimeout(() => {
            deepseekChat.renderMessages();
        }, 100);
    }
}

// ========================================
// IMAGE GENERATOR
// ========================================

function loadImageGenerator(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🖼️ Image Generator</h1>
            <div class="page-actions">
                <button onclick="clearImageGallery()" class="btn-secondary">🗑️ Очистити</button>
            </div>
        </div>
        <div class="image-generator-container">
            <div class="generator-input">
                <textarea id="imageInput" placeholder="Опиши зображення яке хочеш згенерувати..." rows="3"></textarea>
                <button id="imageSendBtn" class="btn-primary">Генерувати</button>
            </div>
            <div id="imageGallery" class="image-gallery">
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <h3>Генерація зображень</h3>
                    <p>Опиши що хочеш згенерувати та натисни Enter</p>
                </div>
            </div>
        </div>
    `;

    if (window.imageGallery) {
        setTimeout(() => {
            imageGallery.render();
        }, 100);
    }
}

// ========================================
// PLANNER
// ========================================

function loadPlanner(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>📅 Планувальник</h1>
            <div class="page-actions">
                <button onclick="plannerCore.openCreateModal()" class="btn-primary">➕ Новий план</button>
            </div>
        </div>
        <div id="plannerContent" class="planner-content">
            <div class="loading">Завантаження планів...</div>
        </div>
    `;

    if (window.plannerCore) {
        // Завантажити через планувальник
    }
}

// ========================================
// MEMORY
// ========================================

function loadMemory(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🧠 Пам'ять агента</h1>
            <div class="page-actions">
                <button onclick="memoryManagerCore.openCreateModal()" class="btn-primary">➕ Додати спогад</button>
            </div>
        </div>
        <div id="memoryContent" class="memory-content">
            <div class="loading">Завантаження спогадів...</div>
        </div>
    `;

    if (window.memoryManagerCore) {
        // Завантажити спогади
    }
}

// ========================================
// LIBRARY
// ========================================

function loadLibrary(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>📚 Бібліотека</h1>
            <div class="page-actions">
                <input type="text" id="librarySearch" placeholder="Пошук...">
            </div>
        </div>
        <div class="library-filters">
            <button class="filter-btn active" onclick="filterByType('all')">Всі</button>
            <button class="filter-btn" onclick="filterByType('gemini')">Gemini</button>
            <button class="filter-btn" onclick="filterByType('deepseek')">DeepSeek</button>
            <button class="filter-btn" onclick="filterByType('favorites')">⭐ Улюблені</button>
        </div>
        <div id="libraryContent" class="library-content">
            <div class="loading">Завантаження...</div>
        </div>
    `;

    if (window.libraryCore) {
        setTimeout(() => {
            libraryCore.loadAndDisplay();
        }, 100);
    }
}

// ========================================
// SETTINGS
// ========================================

function loadSettings(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>⚙️ Налаштування</h1>
        </div>
        <div class="settings-container">
            <div class="settings-section">
                <h2>🔑 API Ключі</h2>
                <div class="setting-item">
                    <label>Gemini API Key:</label>
                    <input type="password" id="geminiApiKey" placeholder="AIza...">
                    <button onclick="saveGeminiApiKey()" class="btn-primary">Зберегти</button>
                </div>
                <div class="setting-item">
                    <label>Groq API Key:</label>
                    <input type="password" id="groqApiKey" placeholder="gsk_...">
                    <button onclick="saveGroqApiKey()" class="btn-primary">Зберегти</button>
                </div>
            </div>
            <div class="settings-section">
                <h2>🎨 Інтерфейс</h2>
                <div class="setting-item">
                    <label>Тема:</label>
                    <select id="themeSelect" onchange="changeTheme(this.value)">
                        <option value="dark">Темна</option>
                        <option value="light">Світла</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    loadCurrentSettings();
}

function loadCurrentSettings() {
    if (window.appState) {
        const geminiKey = appState.getApiKey('gemini');
        const groqKey = appState.getApiKey('groq');
        
        const geminiInput = document.getElementById('geminiApiKey');
        const groqInput = document.getElementById('groqApiKey');
        
        if (geminiInput && geminiKey) {
            geminiInput.value = geminiKey.substring(0, 10) + '...';
        }
        if (groqInput && groqKey) {
            groqInput.value = groqKey.substring(0, 10) + '...';
        }
    }
}

// ========================================
// SETTINGS FUNCTIONS
// ========================================

window.saveGeminiApiKey = function() {
    const input = document.getElementById('geminiApiKey');
    if (!input) return;
    
    const key = input.value.trim();
    if (!key || key.endsWith('...')) return;
    
    if (window.appState) {
        appState.setApiKey('gemini', key);
    } else {
        localStorage.setItem('gemini_api_key', key);
    }
    
    if (window.showToast) {
        showToast('✅ Gemini API ключ збережено', 'success');
    }
};

window.saveGroqApiKey = function() {
    const input = document.getElementById('groqApiKey');
    if (!input) return;
    
    const key = input.value.trim();
    if (!key || key.endsWith('...')) return;
    
    if (window.appState) {
        appState.setApiKey('groq', key);
    } else {
        localStorage.setItem('groq_api_key', key);
    }
    
    if (window.showToast) {
        showToast('✅ Groq API ключ збережено', 'success');
    }
};

window.changeTheme = function(theme) {
    if (window.themeSwitcher) {
        themeSwitcher.setTheme(theme);
    }
};

// ========================================
// ГЛОБАЛЬНІ ФУНКЦІЇ
// ========================================

window.switchMode = switchMode;

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initApp() {
    try {
        console.log('🚀 Starting AI Assistant Hub...');

        // 1. Перевірити браузер
        const compatibility = checkBrowserCompatibility();
        if (!compatibility.compatible) {
            alert('⚠️ Ваш браузер не підтримує деякі функції: ' + compatibility.missing.join(', '));
        }

        // 2. Ініціалізувати Core
        await initCoreModules();

        // 3. Ініціалізувати UI
        initUI();

        // 4. Завантажити початковий режим
        const defaultMode = AppConfig.defaultMode;
        switchMode(defaultMode);

        console.log('✅ AI Assistant Hub ready!');
        
        if (window.showToast) {
            showToast('✅ AI Assistant Hub готовий до роботи!', 'success', 3000);
        }

    } catch (error) {
        console.error('❌ App initialization failed:', error);
        
        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <h1>❌ Помилка ініціалізації</h1>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn-primary">🔄 Перезавантажити</button>
                </div>
            `;
        }
    }
}

// ========================================
// START APP
// ========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('✅ app.js loaded');
