// 📦 App State Manager - ВИПРАВЛЕНО (TIMESTAMP для UI)

class AppState {
    constructor() {
        // UI State
        this.ui = {
            currentMode: 'gemini',
            isCodePanelOpen: false,
            isPreviewOpen: false,
            isSidebarOpen: window.innerWidth > 768,
            theme: 'dark',
            activeFile: null,
            currentFileIndex: 0
        };

        // Chat State
        this.chat = {
            gemini: {
                history: [],      // Для API (БЕЗ timestamp)
                messages: []      // ✅ НОВИЙ: Для UI (З timestamp)
            },
            deepseek: {
                history: [],      // Для API (БЕЗ timestamp)
                messages: [],     // ✅ НОВИЙ: Для UI (З timestamp)
                codeFiles: {},
                codeHistory: {},
                projectContext: null
            },
            image: {
                history: [],
                gallery: []
            }
        };

        // User State
        this.user = {
            apiKeys: {
                gemini: null,
                groq: null
            },
            settings: {
                geminiSystemPrompt: 'Ти корисний AI асістент. Відповідай чітко, стисло та по суті. Говори українською мовою.',
                deepseekSystemPrompt: 'Ти експерт-програміст. Пиши чистий, оптимізований код з коментарями. Створюй окремі файли для HTML, CSS, JS. Говори українською мовою.'
            },
            stats: {
                geminiRequests: 0,
                deepseekRequests: 0,
                imagesGenerated: 0,
                savedProjects: 0,
                totalTokens: 0,
                firstUse: null
            }
        };

        // Agent State
        this.agent = {
            isActive: false,
            autonomousMode: false,
            currentTask: null,
            taskQueue: [],
            memory: [],
            plans: []
        };

        // Listeners для реактивності
        this.listeners = new Map();
        
        // Ініціалізація
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    async init() {
        try {
            await this.loadState();
            this.applyTheme();
            await this.loadApiKeys();
            
            console.log('✅ App State initialized (FIXED - Timestamp для UI)');
        } catch (error) {
            console.error('❌ App State initialization failed:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'init_error',
                    message: 'Failed to initialize app state',
                    error: error.message,
                    severity: 'high'
                });
            }
        }
    }

    async loadState() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.ui.theme = savedTheme;
        }

        const codePanelOpen = localStorage.getItem('codePanel_open');
        if (codePanelOpen !== null) {
            this.ui.isCodePanelOpen = codePanelOpen === 'true';
        }

        if (window.storageManager) {
            const stats = await storageManager.getSetting('user_stats');
            if (stats) {
                this.user.stats = { ...this.user.stats, ...stats };
            }
        } else {
            const savedStats = localStorage.getItem('user_stats');
            if (savedStats) {
                try {
                    this.user.stats = { ...this.user.stats, ...JSON.parse(savedStats) };
                } catch (e) {
                    console.error('Failed to parse stats:', e);
                }
            }
        }

        if (!this.user.stats.firstUse) {
            this.user.stats.firstUse = Date.now();
            await this.saveStats();
        }

        const geminiPrompt = localStorage.getItem('gemini_system_prompt');
        if (geminiPrompt) {
            this.user.settings.geminiSystemPrompt = geminiPrompt;
        }

        const deepseekPrompt = localStorage.getItem('deepseek_system_prompt');
        if (deepseekPrompt) {
            this.user.settings.deepseekSystemPrompt = deepseekPrompt;
        }
    }

    async loadApiKeys() {
        if (typeof getGeminiApiKey === 'function') {
            this.user.apiKeys.gemini = getGeminiApiKey();
        } else {
            this.user.apiKeys.gemini = localStorage.getItem('gemini_api_key') || null;
        }

        if (typeof getGroqApiKey === 'function') {
            this.user.apiKeys.groq = getGroqApiKey();
        } else {
            this.user.apiKeys.groq = localStorage.getItem('groq_api_key') || null;
        }
    }

    // ========================================
    // UI STATE MANAGEMENT
    // ========================================

    setMode(mode) {
        const oldMode = this.ui.currentMode;
        this.ui.currentMode = mode;
        this.notify('mode:change', { oldMode, newMode: mode });
        return this;
    }

    getMode() {
        return this.ui.currentMode;
    }

    toggleCodePanel() {
        this.ui.isCodePanelOpen = !this.ui.isCodePanelOpen;
        localStorage.setItem('codePanel_open', this.ui.isCodePanelOpen);
        this.notify('codePanel:toggle', { isOpen: this.ui.isCodePanelOpen });
        return this.ui.isCodePanelOpen;
    }

    togglePreview() {
        this.ui.isPreviewOpen = !this.ui.isPreviewOpen;
        this.notify('preview:toggle', { isOpen: this.ui.isPreviewOpen });
        return this.ui.isPreviewOpen;
    }

    toggleSidebar() {
        this.ui.isSidebarOpen = !this.ui.isSidebarOpen;
        this.notify('sidebar:toggle', { isOpen: this.ui.isSidebarOpen });
        return this.ui.isSidebarOpen;
    }

    setTheme(theme) {
        this.ui.theme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        this.notify('theme:change', { theme });
        return this;
    }

    applyTheme() {
        if (this.ui.theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    toggleTheme() {
        const newTheme = this.ui.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }

    setActiveFile(filename) {
        this.ui.activeFile = filename;
        this.notify('file:active', { filename });
        return this;
    }

    // ========================================
    // CHAT STATE - GEMINI - ВИПРАВЛЕНО
    // ========================================

    addGeminiMessage(role, content) {
        const timestamp = Date.now();
        
        // ✅ Повідомлення для API (БЕЗ timestamp - Gemini API його не приймає!)
        const apiMessage = {
            role: role,
            parts: [{ text: content }]
        };
        this.chat.gemini.history.push(apiMessage);
        
        // ✅ НОВИЙ: Повідомлення для UI (З timestamp для сортування!)
        const uiMessage = {
            role: role,
            parts: [{ text: content }],
            timestamp: timestamp,  // Для UI відображення та сортування
            created: new Date(timestamp).toISOString()
        };
        this.chat.gemini.messages.push(uiMessage);
        
        // Обмежити історію API
        if (this.chat.gemini.history.length > 20) {
            this.chat.gemini.history = this.chat.gemini.history.slice(-20);
        }
        
        // Обмежити історію UI
        if (this.chat.gemini.messages.length > 100) {
            this.chat.gemini.messages = this.chat.gemini.messages.slice(-100);
        }

        this.notify('gemini:message', { message: uiMessage });
        
        // Оновити статистику
        if (role === 'user') {
            this.incrementStat('geminiRequests');
        }

        return uiMessage;
    }

    getGeminiHistory() {
        // ✅ Повертати історію для API (БЕЗ timestamp)
        return this.chat.gemini.history;
    }

    getGeminiMessages() {
        // ✅ НОВИЙ: Повертати повідомлення для UI (З timestamp)
        return this.chat.gemini.messages;
    }

    clearGeminiHistory() {
        this.chat.gemini.history = [];
        this.chat.gemini.messages = [];
        this.notify('gemini:clear');
        return this;
    }

    // ========================================
    // CHAT STATE - DEEPSEEK - ВИПРАВЛЕНО
    // ========================================

    addDeepSeekMessage(role, content) {
        const timestamp = Date.now();
        
        // ✅ Повідомлення для API (БЕЗ timestamp - Groq також не потребує)
        const apiMessage = {
            role: role,
            content: content
        };
        this.chat.deepseek.history.push(apiMessage);
        
        // ✅ НОВИЙ: Повідомлення для UI (З timestamp)
        const uiMessage = {
            role: role,
            content: content,
            timestamp: timestamp,
            created: new Date(timestamp).toISOString()
        };
        this.chat.deepseek.messages.push(uiMessage);
        
        // Обмежити історію API
        if (this.chat.deepseek.history.length > 40) {
            this.chat.deepseek.history = this.chat.deepseek.history.slice(-40);
        }
        
        // Обмежити історію UI
        if (this.chat.deepseek.messages.length > 100) {
            this.chat.deepseek.messages = this.chat.deepseek.messages.slice(-100);
        }

        this.notify('deepseek:message', { message: uiMessage });
        
        if (role === 'user') {
            this.incrementStat('deepseekRequests');
        }

        return uiMessage;
    }

    getDeepSeekHistory() {
        // ✅ Повертати історію для API (БЕЗ timestamp)
        return this.chat.deepseek.history;
    }

    getDeepSeekMessages() {
        // ✅ НОВИЙ: Повертати повідомлення для UI (З timestamp)
        return this.chat.deepseek.messages;
    }

    clearDeepSeekHistory() {
        this.chat.deepseek.history = [];
        this.chat.deepseek.messages = [];
        this.chat.deepseek.codeFiles = {};
        this.chat.deepseek.codeHistory = {};
        this.chat.deepseek.projectContext = null;
        this.notify('deepseek:clear');
        return this;
    }

    // ========================================
    // CODE FILES
    // ========================================

    setCodeFile(filename, fileData) {
        this.chat.deepseek.codeFiles[filename] = {
            ...fileData,
            updatedAt: Date.now()
        };
        this.notify('codeFile:set', { filename, fileData });
        return this;
    }

    getCodeFile(filename) {
        return this.chat.deepseek.codeFiles[filename];
    }

    getAllCodeFiles() {
        return this.chat.deepseek.codeFiles;
    }

    deleteCodeFile(filename) {
        delete this.chat.deepseek.codeFiles[filename];
        this.notify('codeFile:delete', { filename });
        return this;
    }

    clearCodeFiles() {
        this.chat.deepseek.codeFiles = {};
        this.notify('codeFiles:clear');
        return this;
    }

    addCodeHistory(filename, code) {
        if (!this.chat.deepseek.codeHistory[filename]) {
            this.chat.deepseek.codeHistory[filename] = [];
        }

        this.chat.deepseek.codeHistory[filename].push({
            code,
            timestamp: Date.now()
        });

        if (this.chat.deepseek.codeHistory[filename].length > 10) {
            this.chat.deepseek.codeHistory[filename] = 
                this.chat.deepseek.codeHistory[filename].slice(-10);
        }

        return this;
    }

    getCodeHistory(filename) {
        return this.chat.deepseek.codeHistory[filename] || [];
    }

    setProjectContext(context) {
        this.chat.deepseek.projectContext = context;
        this.notify('project:context', { context });
        return this;
    }

    getProjectContext() {
        return this.chat.deepseek.projectContext;
    }

    // ========================================
    // IMAGES
    // ========================================

    addImage(imageData) {
        this.chat.image.gallery.push({
            ...imageData,
            timestamp: Date.now()
        });
        this.incrementStat('imagesGenerated');
        this.notify('image:add', { imageData });
        return this;
    }

    clearImages() {
        this.chat.image.gallery = [];
        this.notify('images:clear');
        return this;
    }

    // ========================================
    // USER STATE MANAGEMENT
    // ========================================

    setApiKey(type, key) {
        this.user.apiKeys[type] = key;
        this.notify('apiKey:set', { type });
        return this;
    }

    getApiKey(type) {
        return this.user.apiKeys[type];
    }

    setSetting(key, value) {
        this.user.settings[key] = value;
        localStorage.setItem(key, value);
        this.notify('setting:change', { key, value });
        return this;
    }

    getSetting(key) {
        return this.user.settings[key];
    }

    // ========================================
    // STATISTICS
    // ========================================

    incrementStat(statName, amount = 1) {
        if (this.user.stats.hasOwnProperty(statName)) {
            this.user.stats[statName] += amount;
            this.saveStats();
            this.notify('stat:increment', { statName, value: this.user.stats[statName] });
        }
        return this;
    }

    setStat(statName, value) {
        if (this.user.stats.hasOwnProperty(statName)) {
            this.user.stats[statName] = value;
            this.saveStats();
            this.notify('stat:set', { statName, value });
        }
        return this;
    }

    getStats() {
        return { ...this.user.stats };
    }

    async saveStats() {
        if (window.storageManager) {
            await storageManager.saveSetting('user_stats', this.user.stats);
        } else {
            localStorage.setItem('user_stats', JSON.stringify(this.user.stats));
        }
    }

    resetStats() {
        this.user.stats = {
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            totalTokens: 0,
            firstUse: Date.now()
        };
        this.saveStats();
        this.notify('stats:reset');
        return this;
    }

    // ========================================
    // AGENT STATE MANAGEMENT
    // ========================================

    setAgentActive(isActive) {
        this.agent.isActive = isActive;
        this.notify('agent:active', { isActive });
        return this;
    }

    setAutonomousMode(enabled) {
        this.agent.autonomousMode = enabled;
        this.notify('agent:autonomous', { enabled });
        return this;
    }

    addTask(task) {
        this.agent.taskQueue.push({
            ...task,
            id: Date.now(),
            createdAt: Date.now()
        });
        this.notify('task:add', { task });
        return this;
    }

    removeTask(taskId) {
        this.agent.taskQueue = this.agent.taskQueue.filter(t => t.id !== taskId);
        this.notify('task:remove', { taskId });
        return this;
    }

    getTasks() {
        return this.agent.taskQueue;
    }

    addMemory(memory) {
        this.agent.memory.unshift({
            ...memory,
            id: memory.id || Date.now(),
            timestamp: memory.timestamp || Date.now()
        });

        if (this.agent.memory.length > 100) {
            this.agent.memory = this.agent.memory.slice(0, 100);
        }

        this.notify('memory:add', { memory });
        return this;
    }

    getMemories() {
        return this.agent.memory;
    }

    addPlan(plan) {
        this.agent.plans.push({
            ...plan,
            id: plan.id || Date.now(),
            createdAt: plan.createdAt || Date.now()
        });
        this.notify('plan:add', { plan });
        return this;
    }

    updatePlan(planId, updates) {
        const index = this.agent.plans.findIndex(p => p.id === planId);
        if (index !== -1) {
            this.agent.plans[index] = {
                ...this.agent.plans[index],
                ...updates,
                updatedAt: Date.now()
            };
            this.notify('plan:update', { planId, updates });
        }
        return this;
    }

    deletePlan(planId) {
        this.agent.plans = this.agent.plans.filter(p => p.id !== planId);
        this.notify('plan:delete', { planId });
        return this;
    }

    getPlans() {
        return this.agent.plans;
    }

    // ========================================
    // REACTIVE SYSTEM
    // ========================================

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    notify(event, data = {}) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in listener for ${event}:`, error);
                if (window.errorHandler) {
                    errorHandler.logError({
                        type: 'listener_error',
                        message: `Failed to execute listener for ${event}`,
                        error: error.message,
                        severity: 'low'
                    });
                }
            }
        });
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getState() {
        return {
            ui: { ...this.ui },
            chat: {
                gemini: { ...this.chat.gemini },
                deepseek: { ...this.chat.deepseek },
                image: { ...this.chat.image }
            },
            user: {
                settings: { ...this.user.settings },
                stats: { ...this.user.stats }
            },
            agent: { ...this.agent }
        };
    }

    async exportState() {
        const state = this.getState();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-state-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async clearAll() {
        if (!confirm('⚠️ Очистити весь стан додатку?')) return false;

        this.clearGeminiHistory();
        this.clearDeepSeekHistory();
        this.clearImages();
        this.clearCodeFiles();
        this.resetStats();
        this.agent.memory = [];
        this.agent.plans = [];
        this.agent.taskQueue = [];

        this.notify('state:clear');
        
        if (window.showToast) {
            showToast('🗑️ Стан додатку очищено!', 'success');
        }

        return true;
    }

    debug() {
        console.group('🔍 App State Debug');
        console.log('UI:', this.ui);
        console.log('Chat:', {
            gemini: `${this.chat.gemini.history.length} API messages, ${this.chat.gemini.messages.length} UI messages`,
            deepseek: `${this.chat.deepseek.history.length} API messages, ${this.chat.deepseek.messages.length} UI messages, ${Object.keys(this.chat.deepseek.codeFiles).length} files`,
            image: `${this.chat.image.gallery.length} images`
        });
        console.log('Stats:', this.user.stats);
        console.log('Agent:', {
            active: this.agent.isActive,
            tasks: this.agent.taskQueue.length,
            memories: this.agent.memory.length,
            plans: this.agent.plans.length
        });
        console.log('Listeners:', Array.from(this.listeners.keys()));
        console.groupEnd();
    }
}

// ========================================
// GLOBAL INSTANCE
// ========================================

const appState = new AppState();
window.appState = appState;

// ✅ ОНОВЛЕНО: Compatibility layer з новими методами
Object.defineProperty(window, 'geminiHistory', {
    get: () => appState.getGeminiHistory(),
    set: (value) => {
        console.warn('Direct assignment to geminiHistory is deprecated');
    }
});

Object.defineProperty(window, 'deepseekHistory', {
    get: () => appState.getDeepSeekHistory(),
    set: (value) => {
        console.warn('Direct assignment to deepseekHistory is deprecated');
    }
});

Object.defineProperty(window, 'codeFiles', {
    get: () => appState.getAllCodeFiles(),
    set: (value) => {
        console.warn('Direct assignment to codeFiles is deprecated');
    }
});

Object.defineProperty(window, 'currentMode', {
    get: () => appState.getMode(),
    set: (value) => appState.setMode(value)
});

Object.defineProperty(window, 'stats', {
    get: () => appState.getStats(),
    set: (value) => {
        console.warn('Direct assignment to stats is deprecated');
    }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

appState.on('stat:increment', ({ statName, value }) => {
    const element = document.getElementById(`stat${statName.charAt(0).toUpperCase() + statName.slice(1).replace(/([A-Z])/g, match => match)}`);
    if (element) {
        element.textContent = value.toLocaleString();
    }
});

appState.on('theme:change', ({ theme }) => {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
});

appState.on('mode:change', ({ newMode }) => {
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.menu-btn[onclick*="${newMode}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
});

setInterval(() => {
    appState.saveStats();
}, 30000);

console.log('✅ App State Manager initialized (FIXED - Timestamp для UI + API)');
