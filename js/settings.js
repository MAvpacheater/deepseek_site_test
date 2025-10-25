// ⚙️ Settings Module - ВИПРАВЛЕНО (NULL CHECKS)

class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('✅ Settings Manager initialized');
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ - ВИПРАВЛЕНО NULL CHECKS
    // ========================================

    async loadSettings() {
        try {
            // API Keys (зашифровані)
            const geminiInput = document.getElementById('geminiApiKey');
            const groqInput = document.getElementById('groqApiKey');
            
            if (geminiInput) {
                const geminiKey = typeof getGeminiApiKey === 'function' ? 
                    getGeminiApiKey() : 
                    localStorage.getItem('gemini_api_key');
                // ✅ ВИПРАВЛЕНО: Перевірка на null
                geminiInput.value = geminiKey || '';
            }
            
            if (groqInput) {
                const groqKey = typeof getGroqApiKey === 'function' ? 
                    getGroqApiKey() : 
                    localStorage.getItem('groq_api_key');
                // ✅ ВИПРАВЛЕНО: Перевірка на null
                groqInput.value = groqKey || '';
            }

            // System Prompts
            const geminiPromptInput = document.getElementById('geminiSystemPrompt');
            const deepseekPromptInput = document.getElementById('deepseekSystemPrompt');

            if (geminiPromptInput && window.appState) {
                // ✅ ВИПРАВЛЕНО: Використати || '' замість прямого присвоєння
                const prompt = appState.getSetting('geminiSystemPrompt');
                geminiPromptInput.value = prompt || '';
            }

            if (deepseekPromptInput && window.appState) {
                // ✅ ВИПРАВЛЕНО: Використати || '' замість прямого присвоєння
                const prompt = appState.getSetting('deepseekSystemPrompt');
                deepseekPromptInput.value = prompt || '';
            }

            // Статистика
            this.updateStats();

        } catch (error) {
            console.error('Failed to load settings:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'settings_error',
                    message: 'Failed to load settings',
                    error: error.message,
                    severity: 'medium'
                });
            }
        }
    }

    // ========================================
    // ЗБЕРЕЖЕННЯ НАЛАШТУВАНЬ - ВИПРАВЛЕНО
    // ========================================

    async saveSettings() {
        try {
            const geminiKey = document.getElementById('geminiApiKey')?.value.trim();
            const groqKey = document.getElementById('groqApiKey')?.value.trim();
            const geminiPrompt = document.getElementById('geminiSystemPrompt')?.value.trim();
            const deepseekPrompt = document.getElementById('deepseekSystemPrompt')?.value.trim();

            let hasErrors = false;

            // ВИПРАВЛЕНО: Валідація та збереження Gemini ключа
            if (geminiKey) {
                if (typeof validateApiKey === 'function') {
                    const validation = validateApiKey(geminiKey, 'gemini');
                    if (!validation.valid) {
                        if (window.showToast) {
                            showToast(`⚠️ Gemini: ${validation.message}`, 'error');
                        }
                        hasErrors = true;
                    } else {
                        // Зберегти зашифрований ключ
                        if (typeof encryptApiKey === 'function') {
                            const encrypted = encryptApiKey(geminiKey);
                            localStorage.setItem('gemini_api_key', encrypted);
                            localStorage.setItem('gemini_encrypted', 'true');
                            
                            // ВАЖЛИВО: Оновити в appState
                            if (window.appState) {
                                appState.setApiKey('gemini', geminiKey);
                            }
                        } else {
                            localStorage.setItem('gemini_api_key', geminiKey);
                            if (window.appState) {
                                appState.setApiKey('gemini', geminiKey);
                            }
                        }
                    }
                } else {
                    // Fallback якщо немає security.js
                    localStorage.setItem('gemini_api_key', geminiKey);
                    if (window.appState) {
                        appState.setApiKey('gemini', geminiKey);
                    }
                }
            }

            // ВИПРАВЛЕНО: Валідація та збереження Groq ключа
            if (groqKey) {
                if (typeof validateApiKey === 'function') {
                    const validation = validateApiKey(groqKey, 'groq');
                    if (!validation.valid) {
                        if (window.showToast) {
                            showToast(`⚠️ Groq: ${validation.message}`, 'error');
                        }
                        hasErrors = true;
                    } else {
                        // Зберегти зашифрований ключ
                        if (typeof encryptApiKey === 'function') {
                            const encrypted = encryptApiKey(groqKey);
                            localStorage.setItem('groq_api_key', encrypted);
                            localStorage.setItem('groq_encrypted', 'true');
                            
                            // ВАЖЛИВО: Оновити в appState
                            if (window.appState) {
                                appState.setApiKey('groq', groqKey);
                            }
                        } else {
                            localStorage.setItem('groq_api_key', groqKey);
                            if (window.appState) {
                                appState.setApiKey('groq', groqKey);
                            }
                        }
                    }
                } else {
                    // Fallback якщо немає security.js
                    localStorage.setItem('groq_api_key', groqKey);
                    if (window.appState) {
                        appState.setApiKey('groq', groqKey);
                    }
                }
            }

            if (hasErrors) {
                return;
            }

            // ✅ ВИПРАВЛЕНО: Перевірка на null/undefined перед збереженням
            if (geminiPrompt !== null && geminiPrompt !== undefined && window.appState) {
                appState.setSetting('geminiSystemPrompt', geminiPrompt);
            }

            if (deepseekPrompt !== null && deepseekPrompt !== undefined && window.appState) {
                appState.setSetting('deepseekSystemPrompt', deepseekPrompt);
            }

            if (window.showToast) {
                showToast('✅ Налаштування збережено!', 'success');
            }

        } catch (error) {
            console.error('Failed to save settings:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження налаштувань', 'error');
            }
        }
    }

    // ========================================
    // СТАТИСТИКА - ВИПРАВЛЕНО NULL CHECKS
    // ========================================

    updateStats() {
        if (!window.appState) return;

        const stats = appState.getStats();

        // ✅ ВИПРАВЛЕНО: Перевірка на існування кожного елемента
        const elements = {
            statGemini: stats.geminiRequests,
            statDeepseek: stats.deepseekRequests,
            statImages: stats.imagesGenerated,
            statSaved: stats.savedProjects,
            statTokens: stats.totalTokens,
            statDays: this.calculateDaysUsed(stats.firstUse)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // ✅ ВИПРАВЛЕНО: Перевірка на null/undefined
                const displayValue = (value !== null && value !== undefined) ? 
                    (typeof value === 'number' ? value.toLocaleString() : value) : 
                    '0';
                element.textContent = displayValue;
            }
        });
    }

    calculateDaysUsed(firstUse) {
        // ✅ ВИПРАВЛЕНО: Перевірка на null
        if (!firstUse) return 1;
        const days = Math.floor((Date.now() - firstUse) / (1000 * 60 * 60 * 24));
        return days + 1;
    }

    async resetStats() {
        if (!confirm('⚠️ Скинути всю статистику?')) return;

        if (window.appState) {
            appState.resetStats();
        }

        this.updateStats();

        if (window.showToast) {
            showToast('✅ Статистику скинуто!', 'success');
        }
    }

    // ========================================
    // ОЧИЩЕННЯ ДАНИХ
    // ========================================

    async clearAllData() {
        if (!confirm('⚠️ Видалити всі дані (історію, налаштування, файли)? Цю дію не можна скасувати!')) {
            return;
        }

        try {
            // Використати appState для очищення
            if (window.appState) {
                await appState.clearAll();
            }

            // Очистити через storageManager
            if (window.storageManager) {
                await storageManager.clearAllData();
            }

            // Очистити localStorage (але зберегти API ключі)
            const geminiKey = localStorage.getItem('gemini_api_key');
            const groqKey = localStorage.getItem('groq_api_key');
            const geminiEncrypted = localStorage.getItem('gemini_encrypted');
            const groqEncrypted = localStorage.getItem('groq_encrypted');
            
            localStorage.clear();
            
            // Відновити API ключі
            if (geminiKey) {
                localStorage.setItem('gemini_api_key', geminiKey);
                if (geminiEncrypted) localStorage.setItem('gemini_encrypted', geminiEncrypted);
            }
            if (groqKey) {
                localStorage.setItem('groq_api_key', groqKey);
                if (groqEncrypted) localStorage.setItem('groq_encrypted', groqEncrypted);
            }

            // Очистити UI
            this.clearAllUI();

            // Перезавантажити налаштування
            await this.loadSettings();

            if (window.showToast) {
                showToast('🗑️ Всі дані видалено (API ключі збережено)!', 'success');
            }

        } catch (error) {
            console.error('Clear all data failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка очищення даних', 'error');
            }
        }
    }

    clearAllUI() {
        // Очистити чати
        const geminiMessages = document.getElementById('geminiMessages');
        const deepseekMessages = document.getElementById('deepseekMessages');
        const imageGallery = document.getElementById('imageGallery');

        if (geminiMessages) geminiMessages.innerHTML = '';
        if (deepseekMessages) deepseekMessages.innerHTML = '';
        
        if (imageGallery) {
            imageGallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <h3>Генерація зображень</h3>
                    <p>Опиши що хочеш згенерувати</p>
                </div>
            `;
        }

        // Очистити файли коду
        const fileTabs = document.getElementById('fileTabs');
        const codeContent = document.getElementById('codeContent');

        if (fileTabs) fileTabs.innerHTML = '';
        if (codeContent) {
            codeContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>Немає файлів</h3>
                    <p>Опиши що хочеш створити</p>
                </div>
            `;
        }

        // Оновити бібліотеку
        if (typeof displayLibrary === 'function') {
            displayLibrary();
        }
    }

    // ========================================
    // ЕКСПОРТ / ІМПОРТ
    // ========================================

    async exportAllData() {
        if (window.storageManager) {
            await storageManager.exportAllData();
        } else if (window.appState) {
            await appState.exportState();
        } else {
            if (window.showToast) {
                showToast('⚠️ Експорт недоступний', 'warning');
            }
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (window.storageManager) {
                    await storageManager.importData(data);
                } else {
                    if (window.showToast) {
                        showToast('⚠️ Імпорт недоступний', 'warning');
                    }
                }

                // Перезавантажити UI
                location.reload();

            } catch (error) {
                console.error('Import failed:', error);
                if (window.showToast) {
                    showToast('❌ Помилка імпорту файлу', 'error');
                }
            }
        };

        input.click();
    }

    async showStorageInfo() {
        if (!window.storageManager) {
            alert('⚠️ Storage Manager недоступний');
            return;
        }

        try {
            const stats = await storageManager.getStorageStats();

            let info = '💾 ІНФОРМАЦІЯ ПРО СХОВИЩЕ\n\n';
            info += `📊 Збережено:\n`;
            info += `  • Розмови: ${stats.conversations || 0}\n`;
            info += `  • Код проекти: ${stats.codeFiles || 0}\n`;
            info += `  • Спогади: ${stats.memories || 0}\n`;
            info += `  • Плани: ${stats.plans || 0}\n`;
            info += `  • Cache: ${stats.cache || 0}\n\n`;

            // ✅ ВИПРАВЛЕНО: Перевірка на undefined
            if (stats.usage !== undefined && stats.usage !== null) {
                const usageMB = (stats.usage / (1024 * 1024)).toFixed(2);
                const quotaMB = (stats.quota / (1024 * 1024)).toFixed(2);
                info += `💿 Використання:\n`;
                info += `  • Зайнято: ${usageMB} MB\n`;
                info += `  • Доступно: ${quotaMB} MB\n`;
                info += `  • Використано: ${stats.usagePercent || 0}%\n`;
            }

            alert(info);

        } catch (error) {
            console.error('Failed to get storage info:', error);
            alert('❌ Помилка отримання інформації');
        }
    }

    // ========================================
    // ВАЛІДАЦІЯ ДАНИХ
    // ========================================

    validateSettingsInputs() {
        const inputs = {
            geminiKey: document.getElementById('geminiApiKey'),
            groqKey: document.getElementById('groqApiKey'),
            geminiPrompt: document.getElementById('geminiSystemPrompt'),
            deepseekPrompt: document.getElementById('deepseekSystemPrompt')
        };

        let isValid = true;
        const errors = [];

        // ✅ ВИПРАВЛЕНО: Перевірка кожного поля на null
        if (inputs.geminiKey && inputs.geminiKey.value) {
            if (inputs.geminiKey.value.length < 30) {
                errors.push('Gemini API ключ занадто короткий');
                isValid = false;
            }
        }

        if (inputs.groqKey && inputs.groqKey.value) {
            if (inputs.groqKey.value.length < 40) {
                errors.push('Groq API ключ занадто короткий');
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    // ========================================
    // БЕЗПЕЧНІ GETTERI
    // ========================================

    safeGetInputValue(id, defaultValue = '') {
        const element = document.getElementById(id);
        if (!element) return defaultValue;
        
        const value = element.value;
        // ✅ ВИПРАВЛЕНО: Перевірка на null/undefined
        return (value !== null && value !== undefined) ? value.trim() : defaultValue;
    }

    safeSetInputValue(id, value) {
        const element = document.getElementById(id);
        if (!element) return false;
        
        // ✅ ВИПРАВЛЕНО: Перевірка на null/undefined
        element.value = (value !== null && value !== undefined) ? value : '';
        return true;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ - ВИПРАВЛЕНО RACE CONDITION
// ========================================

let settingsManager = null;

// ✅ ВИПРАВЛЕНО: Перевірка стану документа
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        settingsManager = new SettingsManager();
        
        // Завантажити налаштування
        await settingsManager.loadSettings();

        // Оновлювати статистику кожні 10 секунд
        setInterval(() => {
            settingsManager.updateStats();
        }, 10000);

        // Експортувати функції для сумісності
        window.saveSettings = () => settingsManager.saveSettings();
        window.loadSettings = () => settingsManager.loadSettings();
        window.clearAllData = () => settingsManager.clearAllData();
        window.resetStats = () => settingsManager.resetStats();
        window.exportAllData = () => settingsManager.exportAllData();
        window.importData = () => settingsManager.importData();
        window.showStorageInfo = () => settingsManager.showStorageInfo();

        console.log('✅ Settings module loaded (FIXED - Null Checks + Race Condition)');
    });
} else {
    // Документ вже завантажений
    (async () => {
        settingsManager = new SettingsManager();
        
        await settingsManager.loadSettings();

        setInterval(() => {
            settingsManager.updateStats();
        }, 10000);

        window.saveSettings = () => settingsManager.saveSettings();
        window.loadSettings = () => settingsManager.loadSettings();
        window.clearAllData = () => settingsManager.clearAllData();
        window.resetStats = () => settingsManager.resetStats();
        window.exportAllData = () => settingsManager.exportAllData();
        window.importData = () => settingsManager.importData();
        window.showStorageInfo = () => settingsManager.showStorageInfo();

        console.log('✅ Settings module loaded immediately (FIXED - Null Checks + Race Condition)');
    })();
}

// Експорт класу
window.SettingsManager = SettingsManager;
window.settingsManager = settingsManager;
