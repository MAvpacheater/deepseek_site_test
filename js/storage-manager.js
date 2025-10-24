// 💾 Storage Manager - IndexedDB + localStorage hybrid система

class StorageManager {
    constructor() {
        this.dbName = 'AIAssistantHub';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            conversations: 'conversations',
            codeFiles: 'codeFiles',
            memories: 'memories',
            plans: 'plans',
            settings: 'settings',
            cache: 'cache'
        };
        this.initPromise = this.initDB();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ INDEXEDDB
    // ========================================

    async initDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB not supported, falling back to localStorage');
                resolve(false);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Створити object stores
                if (!db.objectStoreNames.contains(this.stores.conversations)) {
                    const conversationStore = db.createObjectStore(this.stores.conversations, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    conversationStore.createIndex('mode', 'mode', { unique: false });
                    conversationStore.createIndex('date', 'date', { unique: false });
                    conversationStore.createIndex('favorite', 'favorite', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.codeFiles)) {
                    db.createObjectStore(this.stores.codeFiles, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }

                if (!db.objectStoreNames.contains(this.stores.memories)) {
                    const memoryStore = db.createObjectStore(this.stores.memories, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    memoryStore.createIndex('category', 'category', { unique: false });
                    memoryStore.createIndex('important', 'important', { unique: false });
                    memoryStore.createIndex('created', 'created', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.plans)) {
                    const planStore = db.createObjectStore(this.stores.plans, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    planStore.createIndex('status', 'status', { unique: false });
                    planStore.createIndex('deadline', 'deadline', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.settings)) {
                    db.createObjectStore(this.stores.settings, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(this.stores.cache)) {
                    const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
                    cacheStore.createIndex('expires', 'expires', { unique: false });
                }

                console.log('✅ IndexedDB stores created');
            };
        });
    }

    // ========================================
    // БАЗОВІ CRUD ОПЕРАЦІЇ
    // ========================================

    async add(storeName, data) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('add', storeName, data);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Додати timestamp
            data.createdAt = data.createdAt || new Date().toISOString();
            data.updatedAt = new Date().toISOString();
            
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`❌ Add to ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async get(storeName, id) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('get', storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`❌ Get from ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async getAll(storeName) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('getAll', storeName);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error(`❌ GetAll from ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async update(storeName, data) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('update', storeName, data);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Оновити timestamp
            data.updatedAt = new Date().toISOString();
            
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`❌ Update in ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async delete(storeName, id) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('delete', storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error(`❌ Delete from ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async clear(storeName) {
        await this.initPromise;
        
        if (!this.db) {
            return this.fallbackToLocalStorage('clear', storeName);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error(`❌ Clear ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    // ========================================
    // ПОШУК ТА ФІЛЬТРАЦІЯ
    // ========================================

    async query(storeName, indexName, value) {
        await this.initPromise;
        
        if (!this.db) {
            const all = await this.getAll(storeName);
            return all.filter(item => item[indexName] === value);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error(`❌ Query ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    async search(storeName, callback) {
        const items = await this.getAll(storeName);
        return items.filter(callback);
    }

    // ========================================
    // СПЕЦИФІЧНІ МЕТОДИ ДЛЯ ДОДАТКУ
    // ========================================

    // Conversations
    async saveConversation(conversation) {
        try {
            const id = await this.add(this.stores.conversations, conversation);
            if (window.showToast) {
                showToast('✅ Розмову збережено!', 'success');
            }
            return id;
        } catch (error) {
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'storage_error',
                    message: 'Failed to save conversation',
                    error: error.message,
                    severity: 'medium'
                });
            }
            throw error;
        }
    }

    async getConversations(mode = null) {
        try {
            if (mode) {
                return await this.query(this.stores.conversations, 'mode', mode);
            }
            return await this.getAll(this.stores.conversations);
        } catch (error) {
            console.error('Failed to get conversations:', error);
            return [];
        }
    }

    async getFavoriteConversations() {
        try {
            return await this.query(this.stores.conversations, 'favorite', true);
        } catch (error) {
            console.error('Failed to get favorites:', error);
            return [];
        }
    }

    // Code Files
    async saveCodeProject(project) {
        try {
            const id = await this.add(this.stores.codeFiles, project);
            if (window.showToast) {
                showToast('✅ Проект збережено!', 'success');
            }
            return id;
        } catch (error) {
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'storage_error',
                    message: 'Failed to save code project',
                    error: error.message,
                    severity: 'medium'
                });
            }
            throw error;
        }
    }

    async getCodeProjects() {
        try {
            return await this.getAll(this.stores.codeFiles);
        } catch (error) {
            console.error('Failed to get code projects:', error);
            return [];
        }
    }

    // Memories
    async saveMemory(memory) {
        try {
            return await this.add(this.stores.memories, memory);
        } catch (error) {
            console.error('Failed to save memory:', error);
            throw error;
        }
    }

    async getMemories(category = null) {
        try {
            if (category) {
                return await this.query(this.stores.memories, 'category', category);
            }
            return await this.getAll(this.stores.memories);
        } catch (error) {
            console.error('Failed to get memories:', error);
            return [];
        }
    }

    async getImportantMemories() {
        try {
            return await this.query(this.stores.memories, 'important', true);
        } catch (error) {
            console.error('Failed to get important memories:', error);
            return [];
        }
    }

    // Plans
    async savePlan(plan) {
        try {
            return await this.add(this.stores.plans, plan);
        } catch (error) {
            console.error('Failed to save plan:', error);
            throw error;
        }
    }

    async getPlans(status = null) {
        try {
            if (status) {
                return await this.query(this.stores.plans, 'status', status);
            }
            return await this.getAll(this.stores.plans);
        } catch (error) {
            console.error('Failed to get plans:', error);
            return [];
        }
    }

    async getActivePlans() {
        try {
            const plans = await this.getAll(this.stores.plans);
            return plans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
        } catch (error) {
            console.error('Failed to get active plans:', error);
            return [];
        }
    }

    // Settings
    async saveSetting(key, value) {
        try {
            await this.update(this.stores.settings, { key, value, updatedAt: new Date().toISOString() });
            return true;
        } catch (error) {
            // Якщо не існує - створити
            try {
                await this.add(this.stores.settings, { key, value });
                return true;
            } catch (addError) {
                console.error('Failed to save setting:', addError);
                return false;
            }
        }
    }

    async getSetting(key, defaultValue = null) {
        try {
            const result = await this.get(this.stores.settings, key);
            return result ? result.value : defaultValue;
        } catch (error) {
            console.error('Failed to get setting:', error);
            return defaultValue;
        }
    }

    // Cache
    async setCache(key, value, ttl = 3600000) { // 1 hour default
        try {
            const expires = Date.now() + ttl;
            await this.update(this.stores.cache, { key, value, expires });
            return true;
        } catch (error) {
            try {
                await this.add(this.stores.cache, { key, value, expires });
                return true;
            } catch (addError) {
                console.error('Failed to set cache:', addError);
                return false;
            }
        }
    }

    async getCache(key) {
        try {
            const cached = await this.get(this.stores.cache, key);
            if (!cached) return null;
            
            // Перевірити чи не expired
            if (cached.expires && cached.expires < Date.now()) {
                await this.delete(this.stores.cache, key);
                return null;
            }
            
            return cached.value;
        } catch (error) {
            console.error('Failed to get cache:', error);
            return null;
        }
    }

    async clearExpiredCache() {
        try {
            const allCache = await this.getAll(this.stores.cache);
            const now = Date.now();
            
            for (const item of allCache) {
                if (item.expires && item.expires < now) {
                    await this.delete(this.stores.cache, item.key);
                }
            }
            
            console.log('✅ Expired cache cleared');
        } catch (error) {
            console.error('Failed to clear expired cache:', error);
        }
    }

    // ========================================
    // МІГРАЦІЯ З LOCALSTORAGE
    // ========================================

    async migrateFromLocalStorage() {
        console.log('🔄 Starting migration from localStorage to IndexedDB...');

        try {
            // Міграція розмов
            const savedConversations = localStorage.getItem('saved_conversations');
            if (savedConversations) {
                const conversations = JSON.parse(savedConversations);
                for (const conv of conversations) {
                    await this.add(this.stores.conversations, conv);
                }
                console.log(`✅ Migrated ${conversations.length} conversations`);
            }

            // Міграція пам'яті
            const agentMemory = localStorage.getItem('agent_memory');
            if (agentMemory) {
                const memories = JSON.parse(agentMemory);
                for (const memory of memories) {
                    await this.add(this.stores.memories, memory);
                }
                console.log(`✅ Migrated ${memories.length} memories`);
            }

            // Міграція планів
            const userPlans = localStorage.getItem('user_plans');
            if (userPlans) {
                const plans = JSON.parse(userPlans);
                for (const plan of plans) {
                    await this.add(this.stores.plans, plan);
                }
                console.log(`✅ Migrated ${plans.length} plans`);
            }

            // Міграція налаштувань
            const settingsKeys = [
                'gemini_api_key',
                'groq_api_key',
                'gemini_system_prompt',
                'deepseek_system_prompt',
                'gemini_encrypted',
                'groq_encrypted',
                'theme'
            ];

            for (const key of settingsKeys) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    await this.saveSetting(key, value);
                }
            }

            console.log('✅ Migration completed successfully!');
            
            // Показати повідомлення
            if (window.showToast) {
                showToast('✅ Дані успішно мігровано в IndexedDB!', 'success');
            }

            return true;

        } catch (error) {
            console.error('❌ Migration failed:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'migration_error',
                    message: 'Failed to migrate from localStorage',
                    error: error.message,
                    severity: 'high'
                });
            }
            return false;
        }
    }

    // ========================================
    // FALLBACK ДО LOCALSTORAGE
    // ========================================

    fallbackToLocalStorage(operation, storeName, data) {
        const key = `idb_fallback_${storeName}`;
        
        try {
            switch (operation) {
                case 'add':
                case 'update':
                    const all = JSON.parse(localStorage.getItem(key) || '[]');
                    if (operation === 'add') {
                        data.id = Date.now();
                        all.push(data);
                    } else {
                        const index = all.findIndex(item => item.id === data.id);
                        if (index !== -1) {
                            all[index] = data;
                        }
                    }
                    localStorage.setItem(key, JSON.stringify(all));
                    return Promise.resolve(data.id);

                case 'get':
                    const items = JSON.parse(localStorage.getItem(key) || '[]');
                    const item = items.find(i => i.id === data);
                    return Promise.resolve(item);

                case 'getAll':
                    return Promise.resolve(JSON.parse(localStorage.getItem(key) || '[]'));

                case 'delete':
                    const allItems = JSON.parse(localStorage.getItem(key) || '[]');
                    const filtered = allItems.filter(i => i.id !== data);
                    localStorage.setItem(key, JSON.stringify(filtered));
                    return Promise.resolve(true);

                case 'clear':
                    localStorage.removeItem(key);
                    return Promise.resolve(true);

                default:
                    return Promise.resolve(null);
            }
        } catch (error) {
            console.error('localStorage fallback error:', error);
            return Promise.reject(error);
        }
    }

    // ========================================
    // СТАТИСТИКА ТА УПРАВЛІННЯ
    // ========================================

    async getStorageStats() {
        const stats = {
            conversations: 0,
            codeFiles: 0,
            memories: 0,
            plans: 0,
            cache: 0,
            totalSize: 0
        };

        try {
            stats.conversations = (await this.getAll(this.stores.conversations)).length;
            stats.codeFiles = (await this.getAll(this.stores.codeFiles)).length;
            stats.memories = (await this.getAll(this.stores.memories)).length;
            stats.plans = (await this.getAll(this.stores.plans)).length;
            stats.cache = (await this.getAll(this.stores.cache)).length;

            // Estimate size (approximation)
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                stats.usage = estimate.usage;
                stats.quota = estimate.quota;
                stats.usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
            }

        } catch (error) {
            console.error('Failed to get storage stats:', error);
        }

        return stats;
    }

    async exportAllData() {
        try {
            const data = {
                version: this.dbVersion,
                exportDate: new Date().toISOString(),
                conversations: await this.getAll(this.stores.conversations),
                codeFiles: await this.getAll(this.stores.codeFiles),
                memories: await this.getAll(this.stores.memories),
                plans: await this.getAll(this.stores.plans)
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-assistant-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.showToast) {
                showToast('✅ Backup створено!', 'success');
            }

            return true;
        } catch (error) {
            console.error('Export failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка створення backup!', 'error');
            }
            return false;
        }
    }

    async importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Import conversations
            if (data.conversations) {
                for (const conv of data.conversations) {
                    delete conv.id; // Let DB assign new ID
                    await this.add(this.stores.conversations, conv);
                }
            }

            // Import code files
            if (data.codeFiles) {
                for (const file of data.codeFiles) {
                    delete file.id;
                    await this.add(this.stores.codeFiles, file);
                }
            }

            // Import memories
            if (data.memories) {
                for (const memory of data.memories) {
                    delete memory.id;
                    await this.add(this.stores.memories, memory);
                }
            }

            // Import plans
            if (data.plans) {
                for (const plan of data.plans) {
                    delete plan.id;
                    await this.add(this.stores.plans, plan);
                }
            }

            if (window.showToast) {
                showToast('✅ Дані імпортовано!', 'success');
            }

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка імпорту!', 'error');
            }
            return false;
        }
    }

    async clearAllData() {
        if (!confirm('⚠️ Видалити всі дані? Цю дію не можна скасувати!')) {
            return false;
        }

        try {
            await this.clear(this.stores.conversations);
            await this.clear(this.stores.codeFiles);
            await this.clear(this.stores.memories);
            await this.clear(this.stores.plans);
            await this.clear(this.stores.cache);
            
            // Також очистити localStorage
            localStorage.clear();

            if (window.showToast) {
                showToast('🗑️ Всі дані видалено!', 'success');
            }

            return true;
        } catch (error) {
            console.error('Clear all data failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка очищення!', 'error');
            }
            return false;
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const storageManager = new StorageManager();

// Автоматична міграція при першому запуску
storageManager.initPromise.then(async (initialized) => {
    if (initialized) {
        // Перевірити чи потрібна міграція
        const migrated = localStorage.getItem('indexeddb_migrated');
        if (!migrated) {
            const success = await storageManager.migrateFromLocalStorage();
            if (success) {
                localStorage.setItem('indexeddb_migrated', 'true');
            }
        }

        // Очистити expired cache
        await storageManager.clearExpiredCache();
    }
});

// ========================================
// EXPORT
// ========================================

window.storageManager = storageManager;

console.log('✅ Storage Manager initialized');
