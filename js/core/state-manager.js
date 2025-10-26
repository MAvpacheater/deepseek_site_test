// 🗂️ State Manager - Централізоване управління станом програми

class StateManager {
    constructor() {
        this.state = {
            // UI State
            ui: {
                currentMode: 'dashboard',
                theme: 'dark',
                sidebarCollapsed: false,
                activeFile: null
            },

            // User Data
            user: {
                apiKeys: {
                    gemini: null,
                    groq: null,
                    github: null
                },
                settings: {
                    geminiSystemPrompt: 'Ти корисний AI асістент. Говори українською мовою.',
                    deepseekSystemPrompt: 'Ти експерт-програміст. Пиши чистий код з коментарями.',
                    autoSave: true,
                    notifications: true
                }
            },

            // Chat State
            chat: {
                gemini: {
                    messages: [],
                    history: []
                },
                deepseek: {
                    messages: [],
                    history: [],
                    codeFiles: {}
                },
                image: {
                    gallery: []
                }
            },

            // Agent State
            agent: {
                memory: [],
                plans: [],
                tasks: []
            },

            // Statistics
            stats: {
                geminiRequests: 0,
                deepseekRequests: 0,
                imagesGenerated: 0,
                totalTokens: 0,
                firstUse: Date.now()
            },

            // Project Context
            project: {
                currentRepo: null,
                files: {}
            }
        };

        this.listeners = new Map();
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadFromLocalStorage();
        console.log('✅ State Manager initialized');
    }

    loadFromLocalStorage() {
        try {
            // Load API keys
            const geminiKey = localStorage.getItem('gemini_api_key');
            const groqKey = localStorage.getItem('groq_api_key');
            const githubToken = localStorage.getItem('github_token');

            if (geminiKey) this.state.user.apiKeys.gemini = geminiKey;
            if (groqKey) this.state.user.apiKeys.groq = groqKey;
            if (githubToken) this.state.user.apiKeys.github = githubToken;

            // Load theme
            const theme = localStorage.getItem('theme');
            if (theme) this.state.ui.theme = theme;

            // Load stats
            const stats = localStorage.getItem('app_stats');
            if (stats) {
                this.state.stats = { ...this.state.stats, ...JSON.parse(stats) };
            }

        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
        }
    }

    // ========================================
    // EVENT SYSTEM
    // ========================================

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }

    // ========================================
    // UI STATE
    // ========================================

    setMode(mode) {
        this.state.ui.currentMode = mode;
        this.emit('mode:change', { mode });
    }

    getMode() {
        return this.state.ui.currentMode;
    }

    setTheme(theme) {
        this.state.ui.theme = theme;
        localStorage.setItem('theme', theme);
        this.emit('theme:change', { theme });
    }

    getTheme() {
        return this.state.ui.theme;
    }

    setActiveFile(filename) {
        this.state.ui.activeFile = filename;
        this.emit('file:active', { filename });
    }

    getActiveFile() {
        return this.state.ui.activeFile;
    }

    // ========================================
    // API KEYS
    // ========================================

    setApiKey(service, key) {
        this.state.user.apiKeys[service] = key;
        localStorage.setItem(`${service}_api_key`, key);
        this.emit('apikey:set', { service, key });
    }

    getApiKey(service) {
        return this.state.user.apiKeys[service];
    }

    // ========================================
    // SETTINGS
    // ========================================

    setSetting(key, value) {
        this.state.user.settings[key] = value;
        localStorage.setItem(`setting_${key}`, JSON.stringify(value));
        this.emit('setting:change', { key, value });
    }

    getSetting(key) {
        return this.state.user.settings[key];
    }

    // ========================================
    // GEMINI CHAT
    // ========================================

    addGeminiMessage(role, content) {
        const message = {
            role,
            parts: [{ text: content }],
            timestamp: Date.now()
        };

        this.state.chat.gemini.messages.push(message);
        this.state.chat.gemini.history.push(message);
        
        this.emit('gemini:message', { message });
        
        if (role === 'user') {
            this.incrementStat('geminiRequests');
        }
    }

    getGeminiMessages() {
        return this.state.chat.gemini.messages || [];
    }

    getGeminiHistory() {
        return this.state.chat.gemini.history || [];
    }

    clearGeminiHistory() {
        this.state.chat.gemini.messages = [];
        this.state.chat.gemini.history = [];
        this.emit('gemini:clear');
    }

    // ========================================
    // DEEPSEEK CHAT
    // ========================================

    addDeepSeekMessage(role, content) {
        const message = {
            role,
            content,
            timestamp: Date.now()
        };

        this.state.chat.deepseek.messages.push(message);
        this.state.chat.deepseek.history.push(message);
        
        this.emit('deepseek:message', { message });
        
        if (role === 'user') {
            this.incrementStat('deepseekRequests');
        }
    }

    getDeepSeekMessages() {
        return this.state.chat.deepseek.messages || [];
    }

    getDeepSeekHistory() {
        return this.state.chat.deepseek.history || [];
    }

    clearDeepSeekHistory() {
        this.state.chat.deepseek.messages = [];
        this.state.chat.deepseek.history = [];
        this.emit('deepseek:clear');
    }

    // ========================================
    // CODE FILES
    // ========================================

    setCodeFile(filename, data) {
        this.state.chat.deepseek.codeFiles[filename] = {
            ...data,
            updated: Date.now()
        };
        this.emit('codeFile:set', { filename, data });
    }

    getCodeFile(filename) {
        return this.state.chat.deepseek.codeFiles[filename];
    }

    getAllCodeFiles() {
        return this.state.chat.deepseek.codeFiles || {};
    }

    deleteCodeFile(filename) {
        delete this.state.chat.deepseek.codeFiles[filename];
        this.emit('codeFile:delete', { filename });
    }

    clearCodeFiles() {
        this.state.chat.deepseek.codeFiles = {};
        this.emit('codeFiles:clear');
    }

    addCodeHistory(filename, code) {
        // Implement code history if needed
    }

    // ========================================
    // IMAGE GALLERY
    // ========================================

    addImage(imageData) {
        this.state.chat.image.gallery.unshift({
            ...imageData,
            date: Date.now()
        });
        this.emit('image:add', { imageData });
        this.incrementStat('imagesGenerated');
    }

    getImages() {
        return this.state.chat.image.gallery || [];
    }

    clearImages() {
        this.state.chat.image.gallery = [];
        this.emit('images:clear');
    }

    // ========================================
    // MEMORY
    // ========================================

    addMemory(memory) {
        const memoryWithId = {
            ...memory,
            id: memory.id || Date.now(),
            timestamp: Date.now()
        };
        
        this.state.agent.memory.push(memoryWithId);
        this.emit('memory:add', { memory: memoryWithId });
        
        this.saveMemoriesToLocalStorage();
    }

    getMemories() {
        return this.state.agent.memory || [];
    }

    updateMemory(id, updates) {
        const index = this.state.agent.memory.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.agent.memory[index] = {
                ...this.state.agent.memory[index],
                ...updates
            };
            this.emit('memory:update', { id, updates });
            this.saveMemoriesToLocalStorage();
        }
    }

    deleteMemory(id) {
        this.state.agent.memory = this.state.agent.memory.filter(m => m.id !== id);
        this.emit('memory:delete', { id });
        this.saveMemoriesToLocalStorage();
    }

    saveMemoriesToLocalStorage() {
        try {
            localStorage.setItem('agent_memories', JSON.stringify(this.state.agent.memory));
        } catch (error) {
            console.error('Failed to save memories:', error);
        }
    }

    // ========================================
    // PLANS
    // ========================================

    addPlan(plan) {
        const planWithId = {
            ...plan,
            id: plan.id || Date.now()
        };
        
        this.state.agent.plans.push(planWithId);
        this.emit('plan:add', { plan: planWithId });
        
        this.savePlansToLocalStorage();
    }

    getPlans() {
        return this.state.agent.plans || [];
    }

    updatePlan(id, updates) {
        const index = this.state.agent.plans.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.agent.plans[index] = {
                ...this.state.agent.plans[index],
                ...updates
            };
            this.emit('plan:update', { id, updates });
            this.savePlansToLocalStorage();
        }
    }

    deletePlan(id) {
        this.state.agent.plans = this.state.agent.plans.filter(p => p.id !== id);
        this.emit('plan:delete', { id });
        this.savePlansToLocalStorage();
    }

    savePlansToLocalStorage() {
        try {
            localStorage.setItem('user_plans', JSON.stringify(this.state.agent.plans));
        } catch (error) {
            console.error('Failed to save plans:', error);
        }
    }

    // ========================================
    // STATISTICS
    // ========================================

    incrementStat(key, amount = 1) {
        if (this.state.stats[key] !== undefined) {
            this.state.stats[key] += amount;
            this.saveStats();
            this.emit('stats:update', { key, value: this.state.stats[key] });
        }
    }

    getStats() {
        return { ...this.state.stats };
    }

    saveStats() {
        try {
            localStorage.setItem('app_stats', JSON.stringify(this.state.stats));
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }

    // ========================================
    // PROJECT CONTEXT
    // ========================================

    setProjectContext(context) {
        this.state.project = { ...this.state.project, ...context };
        this.emit('project:update', { context });
    }

    getProjectContext() {
        return this.state.project;
    }

    // ========================================
    // UTILITY
    // ========================================

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    resetState() {
        const confirmed = confirm('⚠️ Скинути ВСІ дані? Цю дію не можна скасувати!');
        if (!confirmed) return false;

        this.state = {
            ui: { currentMode: 'dashboard', theme: 'dark', sidebarCollapsed: false, activeFile: null },
            user: { apiKeys: {}, settings: {} },
            chat: { gemini: { messages: [], history: [] }, deepseek: { messages: [], history: [], codeFiles: {} }, image: { gallery: [] } },
            agent: { memory: [], plans: [], tasks: [] },
            stats: { geminiRequests: 0, deepseekRequests: 0, imagesGenerated: 0, totalTokens: 0, firstUse: Date.now() },
            project: { currentRepo: null, files: {} }
        };

        localStorage.clear();
        this.emit('state:reset');
        
        return true;
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР (КРИТИЧНО!)
// ========================================

const appState = new StateManager();

// Експорт у window
window.appState = appState;
window.StateManager = StateManager;

console.log('✅ State Manager initialized');
