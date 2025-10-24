// ⚙️ Settings Module - Refactored to use AppState & StorageManager

class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('✅ Settings Manager initialized');
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ
    // ========================================

    async loadSettings() {
        try {
            // API Keys (зашифровані)
            const geminiInput = document.getElementById('geminiApiKey');
            const groqInput = document.getElementById('groqApiKey');
            
            if (geminiInput && typeof getGeminiApiKey === 'function') {
                geminiInput.value = getGeminiApiKey();
            }
            
            if (groqInput && typeof getGroqApiKey === 'function') {
                groqInput.value = getGroqApiKey();
            }

            // System Prompts
            const geminiPromptInput = document.getElementById('geminiSystemPrompt');
            const deepseekPromptInput = document.getElementById('deepseekSystemPrompt');

            if (geminiPromptInput && window.appState) {
                geminiPromptInput.value = appState.getSetting('geminiSystemPrompt');
            }

            if (deepseekPromptInput && window.appState) {
                deepseekPromptInput.value = appState.getSetting('deepseekSystemPrompt');
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
    // ЗБЕРЕЖЕННЯ НАЛАШТУВАНЬ
    // ========================================

    async saveSettings() {
        try {
            const geminiKey = document.getElementById('geminiApiKey')?.value.trim();
            const groqKey = document.getElementById('groqApiKey')?.value.trim();
            const geminiPrompt = document.getElementById('geminiSystemPrompt')?.value.trim();
            const deepseekPrompt = document.getElementById('deepseekSystemPrompt')?.value.trim();

            // Валідація та збереження API ключів (використовуємо security.js)
            if (geminiKey && typeof saveSettingsSecure === 'function') {
                // Функція з security.js зробить валідацію та шифрування
                const validation = validateApiKey(geminiKey, 'gemini');
                if (!validation.valid) {
                    if (window.showToast) {
                        showToast(`⚠️ Gemini: ${validation.message}`, 'error');
                    }
                    return;
                }
            }

            if (groqKey && typeof validateApiKey === 'function') {
                const validation = validateApiKey(groqKey, 'groq');
                if (!validation.valid) {
                    if (window.showToast) {
                        showToast(`⚠️ Groq: ${validation.message}`, 'error');
                    }
                    return;
                }
            }

            // Зберегти промпти через appState
            if (geminiPrompt && window.appState) {
                appState.setSetting('geminiSystemPrompt', geminiPrompt);
            }

            if (deepseekPrompt && window.appState) {
                appState.setSetting('deepseekSystemPrompt', deepseekPrompt);
            }

            // Викликати безпечне збереження ключів
            if (typeof saveSettingsSecure === 'function') {
                saveSettingsSecure();
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
    // СТАТИСТИКА
    // ========================================

    updateStats() {
        if (!window.appState) return;

        const stats = appState.getStats();

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
                element.textContent = typeof value === 'number' ? 
                    value.toLocaleString() : value;
            }
        });
    }

    calculateDaysUsed(firstUse) {
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

            // Очистити localStorage
            localStorage.clear();

            // Очистити UI
            this.clearAllUI();

            // Перезавантажити налаштування
            await this.loadSettings();

            if (window.showToast) {
                showToast('🗑️ Всі дані видалено!', 'success');
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
            info += `  • Розмови: ${stats.conversations}\n`;
            info += `  • Код проекти: ${stats.codeFiles}\n`;
            info += `  • Спогади: ${stats.memories}\n`;
            info += `  • Плани: ${stats.plans}\n`;
            info += `  • Cache: ${stats.cache}\n\n`;

            if (stats.usage !== undefined) {
                const usageMB = (stats.usage / (1024 * 1024)).toFixed(2);
                const quotaMB = (stats.quota / (1024 * 1024)).toFixed(2);
                info += `💿 Використання:\n`;
                info += `  • Зайнято: ${usageMB} MB\n`;
                info += `  • Доступно: ${quotaMB} MB\n`;
                info += `  • Використано: ${stats.usagePercent}%\n`;
            }

            alert(info);

        } catch (error) {
            console.error('Failed to get storage info:', error);
            alert('❌ Помилка отримання інформації');
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let settingsManager = null;

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

    console.log('✅ Settings module loaded');
});

// Експорт класу
window.SettingsManager = SettingsManager;
window.settingsManager = settingsManager;
