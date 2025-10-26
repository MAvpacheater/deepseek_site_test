// 💾 Cache Service - Система кешування для оптимізації продуктивності

class CacheService {
    constructor() {
        this.memoryCache = new Map();
        this.maxMemorySize = 100;
        this.defaultTTL = 3600000; // 1 година
        this.storeName = 'cache';
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
    }

    // ========================================
    // SET CACHE
    // ========================================

    /**
     * Зберегти в кеш
     * @param {string} key - Ключ
     * @param {*} value - Значення
     * @param {number} ttl - Час життя в мс
     * @param {boolean} persistent - Зберегти в IndexedDB
     */
    async set(key, value, ttl = this.defaultTTL, persistent = false) {
        try {
            const expires = Date.now() + ttl;
            
            const cacheEntry = {
                key,
                value,
                expires,
                created: Date.now(),
                hits: 0
            };

            // Memory cache (завжди)
            this.memoryCache.set(key, cacheEntry);
            this.evictIfNeeded();

            // Persistent cache (опціонально)
            if (persistent && window.indexedDBService) {
                await indexedDBService.update(this.storeName, cacheEntry)
                    .catch(async () => {
                        await indexedDBService.add(this.storeName, cacheEntry);
                    });
            }

            this.stats.sets++;
            return true;

        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    // ========================================
    // GET CACHE
    // ========================================

    /**
     * Отримати з кешу
     * @param {string} key - Ключ
     * @param {boolean} checkPersistent - Перевірити IndexedDB якщо не в пам'яті
     */
    async get(key, checkPersistent = true) {
        // 1. Перевірити memory cache
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key);
            
            // Перевірити чи не протерміноване
            if (entry.expires > Date.now()) {
                entry.hits++;
                this.stats.hits++;
                return entry.value;
            } else {
                // Видалити протерміноване
                this.memoryCache.delete(key);
            }
        }

        // 2. Перевірити IndexedDB
        if (checkPersistent && window.indexedDBService) {
            try {
                const entry = await indexedDBService.get(this.storeName, key);
                
                if (entry && entry.expires > Date.now()) {
                    // Додати в memory cache
                    this.memoryCache.set(key, entry);
                    entry.hits++;
                    this.stats.hits++;
                    return entry.value;
                } else if (entry) {
                    // Видалити протерміноване
                    await indexedDBService.delete(this.storeName, key);
                }
            } catch (error) {
                console.error('Cache get error:', error);
            }
        }

        this.stats.misses++;
        return null;
    }

    // ========================================
    // DELETE
    // ========================================

    async delete(key) {
        // Видалити з memory
        this.memoryCache.delete(key);

        // Видалити з IndexedDB
        if (window.indexedDBService) {
            try {
                await indexedDBService.delete(this.storeName, key);
            } catch (error) {
                console.error('Cache delete error:', error);
            }
        }
    }

    // ========================================
    // HAS
    // ========================================

    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }

    // ========================================
    // CLEAR
    // ========================================

    async clear() {
        // Очистити memory
        this.memoryCache.clear();

        // Очистити IndexedDB
        if (window.indexedDBService) {
            try {
                await indexedDBService.clear(this.storeName);
            } catch (error) {
                console.error('Cache clear error:', error);
            }
        }

        this.stats.evictions += this.memoryCache.size;
    }

    // ========================================
    // EVICTION (ВИТИСНЕННЯ)
    // ========================================

    evictIfNeeded() {
        if (this.memoryCache.size <= this.maxMemorySize) return;

        // LRU eviction (витиснути найменш використовувані)
        const entries = Array.from(this.memoryCache.entries())
            .sort((a, b) => {
                // Сортувати за hits (менше - раніше)
                return a[1].hits - b[1].hits;
            });

        // Видалити 20% найменш використовуваних
        const toRemove = Math.ceil(this.maxMemorySize * 0.2);
        
        for (let i = 0; i < toRemove; i++) {
            if (entries[i]) {
                this.memoryCache.delete(entries[i][0]);
                this.stats.evictions++;
            }
        }
    }

    // ========================================
    // CLEANUP (ОЧИЩЕННЯ ПРОТЕРМІНОВАНИХ)
    // ========================================

    async cleanup() {
        const now = Date.now();
        let cleaned = 0;

        // Очистити memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expires < now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        // Очистити IndexedDB cache
        if (window.indexedDBService) {
            try {
                const allCache = await indexedDBService.getAll(this.storeName);
                
                for (const entry of allCache) {
                    if (entry.expires < now) {
                        await indexedDBService.delete(this.storeName, entry.key);
                        cleaned++;
                    }
                }
            } catch (error) {
                console.error('Cache cleanup error:', error);
            }
        }

        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        return cleaned;
    }

    // ========================================
    // CACHE PATTERNS
    // ========================================

    /**
     * Cache-aside pattern
     */
    async getOrSet(key, fetchFn, ttl = this.defaultTTL, persistent = false) {
        // Спробувати отримати з кешу
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Якщо немає - виконати функцію
        try {
            const value = await fetchFn();
            
            // Зберегти в кеш
            await this.set(key, value, ttl, persistent);
            
            return value;
        } catch (error) {
            console.error('Cache getOrSet error:', error);
            throw error;
        }
    }

    /**
     * Write-through pattern
     */
    async setAndStore(key, value, storeFn, ttl = this.defaultTTL) {
        // Зберегти в БД
        await storeFn(value);

        // Зберегти в кеш
        await this.set(key, value, ttl, true);
    }

    /**
     * Invalidate pattern
     */
    async invalidate(pattern) {
        if (typeof pattern === 'string') {
            // Видалити конкретний ключ
            await this.delete(pattern);
        } else if (pattern instanceof RegExp) {
            // Видалити за паттерном
            const keysToDelete = [];

            // Memory cache
            for (const key of this.memoryCache.keys()) {
                if (pattern.test(key)) {
                    keysToDelete.push(key);
                }
            }

            // IndexedDB cache
            if (window.indexedDBService) {
                try {
                    const allCache = await indexedDBService.getAll(this.storeName);
                    for (const entry of allCache) {
                        if (pattern.test(entry.key)) {
                            keysToDelete.push(entry.key);
                        }
                    }
                } catch (error) {
                    console.error('Cache invalidate error:', error);
                }
            }

            // Видалити всі знайдені ключі
            for (const key of keysToDelete) {
                await this.delete(key);
            }

            return keysToDelete.length;
        }
    }

    // ========================================
    // PREFETCH
    // ========================================

    async prefetch(items, fetchFn, ttl = this.defaultTTL) {
        const promises = items.map(item => {
            const key = typeof item === 'string' ? item : item.key;
            return this.getOrSet(key, () => fetchFn(item), ttl, false);
        });

        return Promise.allSettled(promises);
    }

    // ========================================
    // STATISTICS
    // ========================================

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ?
            ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) :
            0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            memorySize: this.memoryCache.size,
            maxMemorySize: this.maxMemorySize
        };
    }

    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
    }

    // ========================================
    // SIZE & LIMITS
    // ========================================

    setMaxSize(size) {
        this.maxMemorySize = size;
        this.evictIfNeeded();
    }

    getSize() {
        return this.memoryCache.size;
    }

    async getTotalSize() {
        let total = this.memoryCache.size;

        if (window.indexedDBService) {
            try {
                const allCache = await indexedDBService.getAll(this.storeName);
                total += allCache.length;
            } catch (error) {
                console.error('Get total size error:', error);
            }
        }

        return total;
    }

    // ========================================
    // WARMUP
    // ========================================

    async warmup(keys, fetchFn) {
        console.log(`🔥 Warming up cache with ${keys.length} items...`);
        
        const results = await this.prefetch(keys, fetchFn);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ Warmed up ${successful}/${keys.length} items`);
        
        return successful;
    }

    // ========================================
    // HELPERS
    // ========================================

    createKey(...parts) {
        return parts.join(':');
    }

    // ========================================
    // DEBUG
    // ========================================

    debug() {
        console.group('💾 Cache Debug Info');
        console.log('Stats:', this.getStats());
        console.log('Memory Cache Size:', this.memoryCache.size);
        console.log('Memory Cache Keys:', Array.from(this.memoryCache.keys()));
        console.groupEnd();
    }

    async debugFull() {
        console.group('💾 Cache Debug Info (Full)');
        console.log('Stats:', this.getStats());
        console.log('Memory Cache Size:', this.memoryCache.size);
        
        if (window.indexedDBService) {
            try {
                const allCache = await indexedDBService.getAll(this.storeName);
                console.log('IndexedDB Cache Size:', allCache.length);
                console.log('Total Size:', this.memoryCache.size + allCache.length);
            } catch (error) {
                console.error('Debug error:', error);
            }
        }
        
        console.groupEnd();
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const cacheService = new CacheService();

// Автоматичне очищення кожні 10 хвилин
setInterval(() => {
    cacheService.cleanup();
}, 10 * 60 * 1000);

// Експорт
window.cacheService = cacheService;
window.CacheService = CacheService;

console.log('✅ Cache Service loaded');
