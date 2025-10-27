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
    console.log('📦 Initializing core modules...');

    // Перевірити чи всі core модулі завантажені
    const requiredModules = {
        appState: window.appState,
        eventBus: window.eventBus,
        chatState: window.chatState
    };

    const missing = [];
    for (const [name, module] of Object.entries(requiredModules)) {
        if (!module) {
            missing.push(name);
            console.error(`❌ ${name} not found`);
        }
    }

    if (missing.length > 0) {
        console.warn(`⚠️ Some core modules are missing: ${missing.join(', ')}`);
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

    console.log('✅ Core modules initialized');
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ UI
// ========================================

function initUI() {
    console.log('🎨 Initializing UI...');

    // Theme
    if (window.themeSwitcher) {
        themeSwitcher.init();
        console.log('✅ Theme Switcher initialized');
    }

    // Event listeners для sidebar
    setupSidebarNavigation();

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
    if (!container) {
        console.error('❌ pageContainer not found');
        return;
    }

    // Очистити контейнер
    container.innerHTML = '';

    // Завантажити контент з невеликою затримкою
    setTimeout(() => {
        try {
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
                    container.innerHTML = '<div style="padding: 40px; text-align: center;"><h1>404 - Page not found</h1></div>';
            }
        } catch (error) {
            console.error('Error loading page:', error);
            container.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <h1>❌ Помилка завантаження</h1>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }, 100);
}

// ========================================
// DASHBOARD
// ========================================

function loadDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <h1>📊 Dashboard</h1>
                <p>Огляд активності та статистики</p>
            </div>
            <div id="dashboardContent" class="dashboard-content">
                <div style="padding: 40px; text-align: center;">
                    <p>📊 Dashboard готовий до роботи</p>
                </div>
            </div>
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
        <div class="chat-section" style="width: 100%; height: 100vh; display: flex; flex-direction: column;">
            <div class="header">
                <div class="header-left">
                    <h1>✨ Gemini Chat</h1>
                </div>
                <div class="header-actions">
                    <button onclick="if(window.saveGeminiConversation) saveGeminiConversation()" class="save-chat-btn" title="Зберегти розмову">💾 Зберегти</button>
                    <button onclick="if(window.clearGeminiChat) clearGeminiChat()" class="clear-chat-btn" title="Очистити чат">🗑️ Очистити</button>
                </div>
            </div>
            <div id="geminiMessages" class="messages" style="flex: 1; overflow-y: auto; padding: 20px;">
                <div class="empty-state">
                    <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">✨</div>
                    <h3>Gemini Chat</h3>
                    <p>Почніть розмову з AI асистентом</p>
                </div>
            </div>
            <div class="input-area">
                <div class="input-wrapper">
                    <textarea id="geminiInput" placeholder="Напиши повідомлення... (Ctrl+Enter для відправки)" rows="1"></textarea>
                    <button id="geminiSendBtn">Надіслати</button>
                </div>
                <div class="shortcuts-hint">
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd> для відправки
                </div>
            </div>
        </div>
    `;

    // Ініціалізувати Gemini Chat
    if (window.geminiChat) {
        setTimeout(() => {
            geminiChat.init();
        }, 100);
    } else {
        console.warn('⚠️ Gemini Chat not loaded');
    }
}
// ========================================
// DEEPSEEK CODER
// ========================================

function loadDeepSeekCoder(container) {
    container.innerHTML = `
        <div style="display: flex; width: 100%; height: 100vh;">
            <div id="deepseekChatSection" class="chat-section" style="flex: 1; display: flex; flex-direction: column;">
                <div class="header">
                    <div class="header-left">
                        <h1>💻 DeepSeek Coder</h1>
                    </div>
                    <div class="header-actions">
                        <button onclick="if(window.saveDeepseekProject) saveDeepseekProject()" class="save-chat-btn" title="Зберегти проект">💾 Зберегти</button>
                        <button onclick="if(window.clearDeepseekChat) clearDeepseekChat()" class="clear-chat-btn" title="Очистити чат">🗑️ Очистити</button>
                        <button onclick="toggleCodeSection()" class="preview-toggle-btn" title="Показати/сховати код">👁️ Код</button>
                    </div>
                </div>
                <div id="deepseekMessages" class="messages" style="flex: 1; overflow-y: auto; padding: 20px;">
                    <div class="empty-state">
                        <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">💻</div>
                        <h3>DeepSeek Coder</h3>
                        <p>Опишіть що хочете створити</p>
                    </div>
                </div>
                <div class="input-area">
                    <div class="input-wrapper">
                        <textarea id="deepseekInput" placeholder="Опиши що створити... (Ctrl+Enter)" rows="2"></textarea>
                        <button id="deepseekSendBtn">Створити</button>
                    </div>
                </div>
            </div>
            <div id="codeSection" class="code-section collapsed" style="width: 45%; display: none; flex-direction: column; border-left: 2px solid var(--border-primary);">
                <div class="code-header" style="padding: 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-primary);">
                    <h2>📝 Згенерований код</h2>
                </div>
                <div id="fileTabs" class="file-tabs" style="display: flex; gap: 0; overflow-x: auto; background: var(--bg-secondary);"></div>
                <div id="codeContent" class="code-content" style="flex: 1; overflow-y: auto; padding: 20px;"></div>
            </div>
        </div>
    `;

    // Ініціалізувати DeepSeek Chat
    if (window.deepseekChat) {
        setTimeout(() => {
            deepseekChat.init();
        }, 100);
    } else {
        console.warn('⚠️ DeepSeek Chat not loaded');
    }

    // Helper functions
    window.toggleCodeSection = function() {
        const codeSection = document.getElementById('codeSection');
        if (codeSection) {
            const isHidden = codeSection.style.display === 'none';
            codeSection.style.display = isHidden ? 'flex' : 'none';
        }
    };
}

// ========================================
// IMAGE GENERATOR
// ========================================

function loadImageGenerator(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100vh; background: var(--bg-primary);">
            <div class="header">
                <div class="header-left">
                    <h1>🖼️ Image Generator</h1>
                </div>
                <div class="header-actions">
                    <button onclick="if(window.clearImageGallery) clearImageGallery()" class="clear-chat-btn">🗑️ Очистити</button>
                </div>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px;">
                <div style="max-width: 800px; margin: 0 auto 20px;">
                    <div class="input-wrapper" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                        <textarea id="imageInput" placeholder="Опиши зображення яке хочеш згенерувати..." rows="3" style="width: 100%; padding: 12px; background: var(--bg-primary); border: 2px solid var(--border-primary); border-radius: 8px; color: var(--text-primary); font-size: 14px; resize: vertical;"></textarea>
                        <button id="imageSendBtn" style="width: 100%; margin-top: 12px; padding: 12px; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Генерувати</button>
                    </div>
                </div>
                <div id="imageGallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🎨</div>
                        <h3>Генерація зображень</h3>
                        <p>Опиши що хочеш згенерувати</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.imageGeneratorCore) {
        setTimeout(() => {
            imageGeneratorCore.init();
        }, 100);
    }
}

// ========================================
// PLANNER
// ========================================

function loadPlanner(container) {
    container.innerHTML = `
        <div class="planner-container">
            <div class="header">
                <div class="header-left">
                    <h1>📅 Планувальник</h1>
                </div>
                <div class="header-actions">
                    <button onclick="if(window.openCreatePlanModal) openCreatePlanModal()" class="btn-primary">➕ Новий план</button>
                </div>
            </div>
            <div id="plannerContent" class="planner-content" style="flex: 1; overflow-y: auto; padding: 20px;">
                <div style="padding: 40px; text-align: center;">
                    <p>📅 Планувальник готовий</p>
                </div>
            </div>
        </div>
    `;

    if (window.plannerCore) {
        setTimeout(() => {
            plannerCore.render();
        }, 100);
    }
}

// ========================================
// MEMORY
// ========================================

function loadMemory(container) {
    container.innerHTML = `
        <div class="memory-container">
            <div class="header">
                <div class="header-left">
                    <h1>🧠 Пам'ять агента</h1>
                </div>
                <div class="header-actions">
                    <button onclick="if(window.openCreateMemoryModal) openCreateMemoryModal()" class="btn-primary">➕ Додати спогад</button>
                </div>
            </div>
            <div id="memoryContent" class="memory-content" style="flex: 1; overflow-y: auto; padding: 20px;">
                <div style="padding: 40px; text-align: center;">
                    <p>🧠 Пам'ять агента готова</p>
                </div>
            </div>
        </div>
    `;

    if (window.memoryManagerCore) {
        setTimeout(() => {
            memoryManagerCore.render();
        }, 100);
    }
}

// ========================================
// LIBRARY
// ========================================

function loadLibrary(container) {
    container.innerHTML = `
        <div class="library-container">
            <div class="header">
                <div class="header-left">
                    <h1>📚 Бібліотека</h1>
                </div>
            </div>
            <div id="libraryContent" class="library-content" style="flex: 1; overflow-y: auto; padding: 20px;">
                <div style="padding: 40px; text-align: center;">
                    <p>📚 Бібліотека готова</p>
                </div>
            </div>
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
        <div class="settings-container">
            <div class="settings-header">
                <h1>⚙️ Налаштування</h1>
                <p>Конфігурація AI Assistant Hub</p>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <h2>🔑 API Ключі</h2>
                    <div class="setting-item">
                        <label>Gemini API Key:</label>
                        <input type="password" id="geminiApiKey" placeholder="AIza..." style="width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary);">
                        <small>Отримайте ключ на <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a></small>
                        <button onclick="saveGeminiApiKey()" class="btn-primary" style="margin-top: 8px;">Зберегти</button>
                    </div>
                    <div class="setting-item">
                        <label>Groq API Key:</label>
                        <input type="password" id="groqApiKey" placeholder="gsk_..." style="width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary);">
                        <small>Отримайте ключ на <a href="https://console.groq.com" target="_blank">Groq Console</a></small>
                        <button onclick="saveGroqApiKey()" class="btn-primary" style="margin-top: 8px;">Зберегти</button>
                    </div>
                </div>
                <div class="settings-section">
                    <h2>🎨 Інтерфейс</h2>
                    <div class="setting-item">
                        <label>Тема:</label>
                        <select id="themeSelect" onchange="changeTheme(this.value)" style="width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary);">
                            <option value="dark">Темна</option>
                            <option value="light">Світла</option>
                        </select>
                    </div>
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
        const currentTheme = appState.getTheme();
        
        const geminiInput = document.getElementById('geminiApiKey');
        const groqInput = document.getElementById('groqApiKey');
        const themeSelect = document.getElementById('themeSelect');
        
        if (geminiInput && geminiKey) {
            geminiInput.value = geminiKey.substring(0, 10) + '...';
        }
        if (groqInput && groqKey) {
            groqInput.value = groqKey.substring(0, 10) + '...';
        }
        if (themeSelect && currentTheme) {
            themeSelect.value = currentTheme;
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
    if (!key || key.endsWith('...')) {
        alert('Введіть новий API ключ');
        return;
    }
    
    if (window.appState) {
        appState.setApiKey('gemini', key);
    } else {
        localStorage.setItem('gemini_api_key', key);
    }
    
    alert('✅ Gemini API ключ збережено');
    
    setTimeout(() => {
        input.value = key.substring(0, 10) + '...';
    }, 100);
};

window.saveGroqApiKey = function() {
    const input = document.getElementById('groqApiKey');
    if (!input) return;
    
    const key = input.value.trim();
    if (!key || key.endsWith('...')) {
        alert('Введіть новий API ключ');
        return;
    }
    
    if (window.appState) {
        appState.setApiKey('groq', key);
    } else {
        localStorage.setItem('groq_api_key', key);
    }
    
    alert('✅ Groq API ключ збережено');
    
    setTimeout(() => {
        input.value = key.substring(0, 10) + '...';
    }, 100);
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
            console.warn('⚠️ Browser compatibility issues:', compatibility.missing);
        }

        // 2. Ініціалізувати Core
        await initCoreModules();

        // 3. Ініціалізувати UI
        initUI();

        // 4. Завантажити початковий режим
        const defaultMode = AppConfig.defaultMode;
        switchMode(defaultMode);

        console.log('✅ AI Assistant Hub ready!');

    } catch (error) {
        console.error('❌ App initialization failed:', error);
        
        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-primary);">
                    <h1>❌ Помилка ініціалізації</h1>
                    <p style="color: var(--text-secondary); margin: 20px 0;">${error.message}</p>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: var(--accent-primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">🔄 Перезавантажити</button>
                </div>
            `;
        }
    }
}

// ========================================
// START APP
// ========================================

window.addEventListener('load', () => {
    console.log('📦 All scripts loaded, initializing app...');
    setTimeout(initApp, 200);
});

console.log('✅ app.js loaded');
