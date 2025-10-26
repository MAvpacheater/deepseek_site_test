// 💬 Chat State Manager - Управління станом чатів

class ChatStateManager {
    constructor() {
        this.chats = {
            gemini: {
                history: [],      // Для API
                messages: [],     // Для UI (з timestamp)
                isLoading: false,
                lastActivity: null
            },
            deepseek: {
                history: [],      // Для API
                messages: [],     // Для UI (з timestamp)
                codeFiles: {},
                codeHistory: {},
                projectContext: null,
                isLoading: false,
                lastActivity: null
            },
            image: {
                history: [],
                gallery: [],
                isLoading: false,
                lastActivity: null
            }
        };

        this.listeners = new Map();
        this.maxHistoryLength = 100;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        console.log('✅ Chat State Manager initialized');
    }

    // ========================================
    // GEMINI CHAT
    // ========================================

    addGeminiMessage(role, content) {
        const timestamp = Date.now();

        // API message (без timestamp)
        const apiMessage = {
            role: role,
            parts: [{ text: content }]
        };
        this.chats.gemini.history.push(apiMessage);

        // UI message (з timestamp)
        const uiMessage = {
            role: role,
            parts: [{ text: content }],
            timestamp: timestamp,
            created: new Date(timestamp).toISOString()
        };
        this.chats.gemini.messages.push(uiMessage);

        // Обмежити історію
        this.trimHistory('gemini');

        // Оновити lastActivity
        this.chats.gemini.lastActivity = timestamp;

        // Сповістити слухачів
        this.notify('gemini:message', { message: uiMessage });

        return uiMessage;
    }

    getGeminiHistory() {
        return this.chats.gemini.history;
    }

    getGeminiMessages() {
        return this.chats.gemini.messages;
    }

    clearGeminiChat() {
        this.chats.gemini.history = [];
        this.chats.gemini.messages = [];
        this.chats.gemini.lastActivity = null;
        this.notify('gemini:clear');
    }

    setGeminiLoading(isLoading) {
        this.chats.gemini.isLoading = isLoading;
        this.notify('gemini:loading', { isLoading });
    }

    // ========================================
    // DEEPSEEK CHAT
    // ========================================

    addDeepSeekMessage(role, content) {
        const timestamp = Date.now();

        // API message
        const apiMessage = {
            role: role,
            content: content
        };
        this.chats.deepseek.history.push(apiMessage);

        // UI message
        const uiMessage = {
            role: role,
            content: content,
            timestamp: timestamp,
            created: new Date(timestamp).toISOString()
        };
        this.chats.deepseek.messages.push(uiMessage);

        // Обмежити історію
        this.trimHistory('deepseek');

        // Оновити lastActivity
        this.chats.deepseek.lastActivity = timestamp;

        // Сповістити слухачів
        this.notify('deepseek:message', { message: uiMessage });

        return uiMessage;
    }

    getDeepSeekHistory() {
        return this.chats.deepseek.history;
    }

    getDeepSeekMessages() {
        return this.chats.deepseek.messages;
    }

    clearDeepSeekChat() {
        this.chats.deepseek.history = [];
        this.chats.deepseek.messages = [];
        this.chats.deepseek.lastActivity = null;
        this.notify('deepseek:clear');
    }

    setDeepSeekLoading(isLoading) {
        this.chats.deepseek.isLoading = isLoading;
        this.notify('deepseek:loading', { isLoading });
    }

    // ========================================
    // CODE FILES
    // ========================================

    setCodeFile(filename, fileData) {
        this.chats.deepseek.codeFiles[filename] = {
            ...fileData,
            updatedAt: Date.now()
        };
        this.notify('codeFile:set', { filename, fileData });
    }

    getCodeFile(filename) {
        return this.chats.deepseek.codeFiles[filename];
    }

    getAllCodeFiles() {
        return this.chats.deepseek.codeFiles;
    }

    deleteCodeFile(filename) {
        delete this.chats.deepseek.codeFiles[filename];
        this.notify('codeFile:delete', { filename });
    }

    clearCodeFiles() {
        this.chats.deepseek.codeFiles = {};
        this.notify('codeFiles:clear');
    }

    addCodeHistory(filename, code) {
        if (!this.chats.deepseek.codeHistory[filename]) {
            this.chats.deepseek.codeHistory[filename] = [];
        }

        this.chats.deepseek.codeHistory[filename].push({
            code,
            timestamp: Date.now()
        });

        // Обмежити до 10 версій
        if (this.chats.deepseek.codeHistory[filename].length > 10) {
            this.chats.deepseek.codeHistory[filename] = 
                this.chats.deepseek.codeHistory[filename].slice(-10);
        }
    }

    getCodeHistory(filename) {
        return this.chats.deepseek.codeHistory[filename] || [];
    }

    setProjectContext(context) {
        this.chats.deepseek.projectContext = context;
        this.notify('project:context', { context });
    }

    getProjectContext() {
        return this.chats.deepseek.projectContext;
    }

    // ========================================
    // IMAGE GENERATOR
    // ========================================

    addImage(imageData) {
        const image = {
            ...imageData,
            timestamp: Date.now(),
            id: Date.now()
        };

        this.chats.image.gallery.unshift(image);
        this.chats.image.lastActivity = image.timestamp;

        this.notify('image:add', { image });

        return image;
    }

    getImages() {
        return this.chats.image.gallery;
    }

    clearImages() {
        this.chats.image.gallery = [];
        this.chats.image.lastActivity = null;
        this.notify('images:clear');
    }

    setImageLoading(isLoading) {
        this.chats.image.isLoading = isLoading;
        this.notify('image:loading', { isLoading });
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    trimHistory(chatType) {
        const chat = this.chats[chatType];
        if (!chat) return;

        // Обмежити API історію
        if (chat.history.length > this.maxHistoryLength) {
            chat.history = chat.history.slice(-this.maxHistoryLength);
        }

        // Обмежити UI повідомлення
        if (chat.messages && chat.messages.length > this.maxHistoryLength) {
            chat.messages = chat.messages.slice(-this.maxHistoryLength);
        }
    }

    getLastActivity(chatType) {
        return this.chats[chatType]?.lastActivity || null;
    }

    isLoading(chatType) {
        return this.chats[chatType]?.isLoading || false;
    }

    getMessageCount(chatType) {
        return this.chats[chatType]?.messages?.length || 0;
    }

    // ========================================
    // ЗБЕРЕЖЕННЯ / ЗАВАНТАЖЕННЯ
    // ========================================

    async saveChat(chatType, title = null) {
        const chat = this.chats[chatType];
        if (!chat) return null;

        const conversation = {
            mode: chatType,
            title: title || `${chatType} - ${new Date().toLocaleDateString()}`,
            messages: chat.messages || chat.history,
            createdAt: new Date().toISOString(),
            lastActivity: chat.lastActivity,
            messageCount: chat.messages?.length || chat.history?.length
        };

        // Додати код файли для deepseek
        if (chatType === 'deepseek') {
            conversation.codeFiles = chat.codeFiles;
            conversation.projectContext = chat.projectContext;
        }

        // Зберегти через storageManager
        if (window.storageManager) {
            try {
                const id = await storageManager.saveConversation(conversation);
                return { ...conversation, id };
            } catch (error) {
                console.error('Failed to save conversation:', error);
                return null;
            }
        }

        return conversation;
    }

    async loadChat(conversationId) {
        if (!window.storageManager) return false;

        try {
            const conversation = await storageManager.get(
                storageManager.stores.conversations,
                conversationId
            );

            if (!conversation) return false;

            const chatType = conversation.mode || 'gemini';
            const chat = this.chats[chatType];
            if (!chat) return false;

            // Завантажити повідомлення
            if (chatType === 'gemini') {
                chat.history = conversation.messages.map(m => ({
                    role: m.role,
                    parts: m.parts
                }));
                chat.messages = conversation.messages;
            } else if (chatType === 'deepseek') {
                chat.history = conversation.messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));
                chat.messages = conversation.messages;
                
                if (conversation.codeFiles) {
                    chat.codeFiles = conversation.codeFiles;
                }
                if (conversation.projectContext) {
                    chat.projectContext = conversation.projectContext;
                }
            }

            chat.lastActivity = new Date(conversation.lastActivity || conversation.createdAt).getTime();

            this.notify(`${chatType}:loaded`, { conversation });

            return true;

        } catch (error) {
            console.error('Failed to load conversation:', error);
            return false;
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
            }
        });
    }

    // ========================================
    // EXPORT STATE
    // ========================================

    exportState() {
        return {
            gemini: {
                messages: this.chats.gemini.messages,
                lastActivity: this.chats.gemini.lastActivity
            },
            deepseek: {
                messages: this.chats.deepseek.messages,
                codeFiles: this.chats.deepseek.codeFiles,
                projectContext: this.chats.deepseek.projectContext,
                lastActivity: this.chats.deepseek.lastActivity
            },
            image: {
                gallery: this.chats.image.gallery,
                lastActivity: this.chats.image.lastActivity
            }
        };
    }

    importState(state) {
        if (state.gemini) {
            this.chats.gemini.messages = state.gemini.messages || [];
            this.chats.gemini.history = state.gemini.messages?.map(m => ({
                role: m.role,
                parts: m.parts
            })) || [];
            this.chats.gemini.lastActivity = state.gemini.lastActivity;
        }

        if (state.deepseek) {
            this.chats.deepseek.messages = state.deepseek.messages || [];
            this.chats.deepseek.history = state.deepseek.messages?.map(m => ({
                role: m.role,
                content: m.content
            })) || [];
            this.chats.deepseek.codeFiles = state.deepseek.codeFiles || {};
            this.chats.deepseek.projectContext = state.deepseek.projectContext;
            this.chats.deepseek.lastActivity = state.deepseek.lastActivity;
        }

        if (state.image) {
            this.chats.image.gallery = state.image.gallery || [];
            this.chats.image.lastActivity = state.image.lastActivity;
        }

        this.notify('state:imported');
    }

    clearAll() {
        this.clearGeminiChat();
        this.clearDeepSeekChat();
        this.clearImages();
        this.clearCodeFiles();
        this.notify('state:cleared');
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const chatState = new ChatStateManager();
window.chatState = chatState;

console.log('✅ Chat State Manager loaded');
