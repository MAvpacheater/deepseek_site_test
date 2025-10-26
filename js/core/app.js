// 🚀 App Entry Point - Ініціалізація всього додатку

class App {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.initOrder = [
            'errorHandler',
            'sanitizer',
            'storageManager',
            'appState',
            'eventBus',
            'chatState',
            'uiManager',
            'modalManager'
        ];
    }

    async init() {
        if (this.isInitialized) {
            console.warn('⚠️ App already initialized');
            return;
        }

        console.log('🚀 Starting AI Assistant Hub...');

        try {
            // 1. Перевірка браузера
            this.checkBrowserCompatibility();

            // 2. Ініціалізація критичних модулів
            await this.initCoreModules();

            // 3. Завантаження даних
            await this.loadData();

            // 4. Ініціалізація UI
            await this.initUI();

            // 5. Підписка на події
            this.setupEventListeners();

            // 6. Ініціалізація фічей
            await this.initFeatures();

            // 7. Фінальні налаштування
            this.finalize();

            this.isInitialized = true;
            console.log('✅ AI Assistant Hub ready!');

        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitError(error);
        }
    }

    checkBrowserCompatibility() {
        const required = {
            localStorage: typeof Storage !== 'undefined',
            indexedDB: 'indexedDB' in window,
            fetch: 'fetch' in window,
            Promise: typeof Promise !== 'undefined',
            async: typeof async !== 'undefined'
        };

        const missing = Object.entries(required)
            .filter(([, supported]) => !supported)
            .map(([feature]) => feature);

        if (missing.length > 0) {
            console.warn('⚠️ Missing features:', missing);
            if (missing.includes('localStorage')) {
                alert('❌ Ваш браузер не підтримує localStorage. Додаток може працювати некоректно.');
            }
        }
    }

    async initCoreModules() {
        for (const moduleName of this.initOrder) {
            try {
                const module = window[moduleName];
                if (module) {
                    this.modules.set(moduleName, module);
                    console.log(`✅ ${moduleName} loaded`);
                } else {
                    console.warn(`⚠️ ${moduleName} not found`);
                }
            } catch (error) {
                console.error(`❌ Failed to load ${moduleName}:`, error);
            }
        }
    }

    async loadData() {
        console.log('📦 Loading data...');

        // Завантажити історію чатів
        if (window.appState) {
            await appState.init();
        }

        // Завантажити збережені розмови
        if (window.storageManager) {
            try {
                const conversations = await storageManager.getConversations();
                console.log(`📚 Loaded ${conversations.length} conversations`);
            } catch (error) {
                console.error('Failed to load conversations:', error);
            }
        }
    }

    async initUI() {
        console.log('🎨 Initializing UI...');

        // Встановити початковий режим
        const currentMode = window.appState?.getMode() || 'dashboard';
        if (typeof switchMode === 'function') {
            switchMode(currentMode);
        }

        // Застосувати тему
        if (window.appState) {
            appState.applyTheme();
        }

        // Завантажити налаштування
        if (window.settingsManager) {
            await settingsManager.loadSettings();
        }
    }

    setupEventListeners() {
        // Відстежувати стан мережі
        window.addEventListener('online', () => {
            if (window.showToast) {
                showToast('🌐 Підключення відновлено', 'success', 3000);
            }
        });

        window.addEventListener('offline', () => {
            if (window.showToast) {
                showToast('⚠️ Немає підключення до інтернету', 'warning', 5000);
            }
        });

        // Очищення перед закриттям
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Відстежувати помилки
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'promise_rejection',
                    message: event.reason?.message || 'Promise rejected',
                    severity: 'medium'
                });
            }
        });
    }

    async initFeatures() {
        console.log('🎯 Initializing features...');

        // Ініціалізувати агента
        if (window.agent) {
            agent.loadMemoryFromStorage();
            agent.activate();
        }

        // Ініціалізувати планер
        if (window.plannerManager) {
            await plannerManager.loadPlans();
        }

        // Ініціалізувати пам'ять
        if (window.memoryManager) {
            await memoryManager.loadMemories();
        }

        // Очистити expired cache
        if (window.storageManager) {
            await storageManager.clearExpiredCache();
        }
    }

    finalize() {
        // Видалити preload клас
        document.body.classList.remove('preload');

        // Показати вітальне повідомлення (тільки перший раз)
        if (!localStorage.getItem('welcomed')) {
            this.showWelcomeMessage();
            localStorage.setItem('welcomed', 'true');
        }

        // Запустити автооновлення статистики
        this.startStatsUpdater();
    }

    showWelcomeMessage() {
        if (window.showToast) {
            setTimeout(() => {
                showToast('👋 Вітаємо в AI Assistant Hub!', 'success', 5000);
            }, 1000);
        }
    }

    startStatsUpdater() {
        // Оновлювати статистику кожні 30 секунд
        setInterval(() => {
            if (window.appState) {
                appState.saveStats();
            }
        }, 30000);
    }

    handleInitError(error) {
        console.error('Initialization error:', error);
        
        const message = `❌ Помилка ініціалізації:\n${error.message}`;
        alert(message);

        // Спробувати відновитися
        this.attemptRecovery();
    }

    attemptRecovery() {
        console.log('🔄 Attempting recovery...');

        // Очистити проблемні дані
        try {
            const problematicKeys = ['corrupted_data', 'invalid_state'];
            problematicKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            // Перезавантажити сторінку
            setTimeout(() => {
                if (confirm('Спробувати перезавантажити додаток?')) {
                    location.reload();
                }
            }, 1000);

        } catch (error) {
            console.error('Recovery failed:', error);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up...');

        // Зберегти стан
        if (window.appState) {
            appState.saveStats();
        }

        // Закрити відкриті з'єднання
        if (window.deepseekCoder?.abortController) {
            deepseekCoder.abortController.abort();
        }

        if (window.geminiChat?.abortController) {
            geminiChat.abortController.abort();
        }

        console.log('✅ Cleanup complete');
    }

    // Публічні методи
    getModule(name) {
        return this.modules.get(name);
    }

    isReady() {
        return this.isInitialized;
    }

    getInfo() {
        return {
            version: '2.3.1',
            initialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const app = new App();
app.startTime = Date.now();

// Ініціалізувати коли DOM готовий
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}

// Експорт
window.app = app;

console.log('📦 App module loaded');
