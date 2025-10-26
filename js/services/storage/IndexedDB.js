// 💾 IndexedDB Service - Основний сервіс для роботи з IndexedDB

class IndexedDBService {
    constructor() {
        this.dbName = 'AIAssistantHub';
        this.dbVersion = 2;
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
        
        this.stores = {
            conversations: 'conversations',
            codeFiles: 'codeFiles',
            memories: 'memories',
            plans: 'plans',
            settings: 'settings',
            cache: 'cache',
            exports: 'exports'
        };

        this.indexes = {
            conversations: ['mode', 'date', 'favorite', 'tags'],
            codeFiles: ['language', 'date', 'size'],
            memories: ['category', 'important', 'created', 'tags'],
            plans: ['status', 'priority', 'deadline', 'created'],
            cache: ['expires', 'key']
        };
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initDB();
        return this.initPromise;
    }

    async _initDB() {
        if (!window.indexedDB) {
            console.warn('⚠️ IndexedDB not supported');
            return false;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                
                if (window.errorHandler) {
                    errorHandler.logError({
                        type: 'storage_error',
                        message: 'IndexedDB initialization failed',
                        error: request.error.message,
                        severity: 'high'
                    });
                }
                
                reject(request.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;

                // Error handler для db
                this.db.onerror = (event) => {
                    console.error('❌ Database error:', event.target.error);
                };

                console.log('✅ IndexedDB initialized');
                
                if (window.eventBus) {
                    eventBus.emit('storage:ready', { type: 'indexeddb' });
                }
                
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                this._createStores(db);
                
                console.log('✅ IndexedDB stores created/updated');
            };

            request.onblocked = () => {
                console.warn('⚠️ IndexedDB upgrade blocked. Close other tabs.');
            };
        });
    }

    _createStores(db) {
        // Conversations
        if (!db.objectStoreNames.contains(this.stores.conversations)) {
            const convStore = db.createObjectStore(this.stores.conversations, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            this.indexes.conversations.forEach(index => {
                convStore.createIndex(index, index, { unique: false });
            });
        }

        // Code Files
        if (!db.objectStoreNames.contains(this.stores.codeFiles)) {
            const codeStore = db.createObjectStore(this.stores.codeFiles, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            this.indexes.codeFiles.forEach(index => {
                codeStore.createIndex(index, index, { unique: false });
            });
        }

        // Memories
        if (!db.objectStoreNames.contains(this.stores.memories)) {
            const memStore = db.createObjectStore(this.stores.memories, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            this.indexes.memories.forEach(index => {
                memStore.createIndex(index, index, { unique: false });
            });
        }

        // Plans
        if (!db.objectStoreNames.contains(this.stores.plans)) {
            const planStore = db.createObjectStore(this.stores.plans, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            this.indexes.plans.forEach(index => {
                planStore.createIndex(index, index, { unique: false });
            });
        }

        // Settings
        if (!db.objectStoreNames.contains(this.stores.settings)) {
            db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        // Cache
        if (!db.objectStoreNames.contains(this.stores.cache)) {
            const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
            
            this.indexes.cache.forEach(index => {
                cacheStore.createIndex(index, index, { unique: false });
            });
        }

        // Exports
        if (!db.objectStoreNames.contains(this.stores.exports)) {
            db.createObjectStore(this.stores.exports, {
                keyPath: 'id',
                autoIncrement: true
            });
        }
    }

    // ========================================
    // CRUD ОПЕРАЦІЇ
    // ========================================

    /**
     * Додати запис
     */
    async add(storeName, data) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Додати метадані
            data.createdAt = data.createdAt || new Date().toISOString();
            data.updatedAt = new Date().toISOString();

            const request = store.add(data);

            request.onsuccess = () => {
                if (window.eventBus) {
                    eventBus.emit('storage:add', { store: storeName, id: request.result });
                }
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`❌ Add to ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Отримати запис за ID
     */
    async get(storeName, id) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
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

    /**
     * Отримати всі записи
     */
    async getAll(storeName) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
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

    /**
     * Оновити запис
     */
    async update(storeName, data) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Оновити метадані
            data.updatedAt = new Date().toISOString();

            const request = store.put(data);

            request.onsuccess = () => {
                if (window.eventBus) {
                    eventBus.emit('storage:update', { store: storeName, id: request.result });
                }
                resolve(request.result);
            };

            request.onerror = () => {
                console.error(`❌ Update in ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Видалити запис
     */
    async delete(storeName, id) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                if (window.eventBus) {
                    eventBus.emit('storage:delete', { store: storeName, id });
                }
                resolve(true);
            };

            request.onerror = () => {
                console.error(`❌ Delete from ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Очистити store
     */
    async clear(storeName) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                if (window.eventBus) {
                    eventBus.emit('storage:clear', { store: storeName });
                }
                resolve(true);
            };

            request.onerror = () => {
                console.error(`❌ Clear ${storeName} failed:`, request.error);
                reject(request.error);
            };
        });
    }

    // ========================================
    // QUERY ОПЕРАЦІЇ
    // ========================================

    /**
     * Пошук за індексом
     */
    async query(storeName, indexName, value) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
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

    /**
     * Пошук з діапазоном
     */
    async queryRange(storeName, indexName, lowerBound, upperBound) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            
            const range = IDBKeyRange.bound(lowerBound, upperBound);
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Пошук за кастомним фільтром
     */
    async search(storeName, filterFn) {
        const items = await this.getAll(storeName);
        return items.filter(filterFn);
    }

    /**
     * Підрахунок записів
     */
    async count(storeName, indexName = null, value = null) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            let request;
            if (indexName && value !== null) {
                const index = store.index(indexName);
                request = index.count(value);
            } else {
                request = store.count();
            }

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // ========================================
    // BATCH ОПЕРАЦІЇ
    // ========================================

    /**
     * Додати кілька записів
     */
    async addBatch(storeName, items) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const results = [];

            transaction.oncomplete = () => {
                resolve(results);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            items.forEach(item => {
                item.createdAt = item.createdAt || new Date().toISOString();
                item.updatedAt = new Date().toISOString();

                const request = store.add(item);
                request.onsuccess = () => {
                    results.push(request.result);
                };
            });
        });
    }

    /**
     * Видалити кілька записів
     */
    async deleteBatch(storeName, ids) {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => {
                resolve(true);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            ids.forEach(id => {
                store.delete(id);
            });
        });
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    /**
     * Перевірити чи існує запис
     */
    async exists(storeName, id) {
        const item = await this.get(storeName, id);
        return !!item;
    }

    /**
     * Отримати розмір store
     */
    async getStoreSize(storeName) {
        const items = await this.getAll(storeName);
        
        const sizeInBytes = new Blob([JSON.stringify(items)]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

        return {
            count: items.length,
            bytes: sizeInBytes,
            mb: parseFloat(sizeInMB)
        };
    }

    /**
     * Отримати статистику по всій БД
     */
    async getStats() {
        const stats = {
            stores: {},
            totalItems: 0,
            totalSize: 0
        };

        for (const storeName of Object.values(this.stores)) {
            const storeStats = await this.getStoreSize(storeName);
            stats.stores[storeName] = storeStats;
            stats.totalItems += storeStats.count;
            stats.totalSize += storeStats.bytes;
        }

        stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

        // Storage quota
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            stats.usage = estimate.usage;
            stats.quota = estimate.quota;
            stats.usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
        }

        return stats;
    }

    /**
     * Закрити з'єднання з БД
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isReady = false;
            console.log('🔒 IndexedDB connection closed');
        }
    }

    /**
     * Видалити всю БД
     */
    async deleteDatabase() {
        this.close();

        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);

            request.onsuccess = () => {
                console.log('🗑️ Database deleted');
                resolve(true);
            };

            request.onerror = () => {
                console.error('❌ Database deletion failed:', request.error);
                reject(request.error);
            };

            request.onblocked = () => {
                console.warn('⚠️ Database deletion blocked');
            };
        });
    }

    // ========================================
    // DEBUG
    // ========================================

    async debug() {
        const stats = await this.getStats();

        console.group('💾 IndexedDB Debug Info');
        console.log('Database:', this.dbName);
        console.log('Version:', this.dbVersion);
        console.log('Ready:', this.isReady);
        console.log('\nStores:');
        console.table(stats.stores);
        console.log('\nTotal Items:', stats.totalItems);
        console.log('Total Size:', stats.totalSizeMB, 'MB');
        
        if (stats.quota) {
            console.log('\nStorage Quota:');
            console.log('  Used:', (stats.usage / (1024 * 1024)).toFixed(2), 'MB');
            console.log('  Available:', (stats.quota / (1024 * 1024)).toFixed(2), 'MB');
            console.log('  Percentage:', stats.usagePercent + '%');
        }
        
        console.groupEnd();
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const indexedDBService = new IndexedDBService();

// Експорт
window.indexedDBService = indexedDBService;
window.IndexedDBService = IndexedDBService;

console.log('✅ IndexedDB Service loaded');
