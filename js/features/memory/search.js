// 🔍 Memory Search & Analytics (200 lines)

class MemorySearch {
    constructor() {
        this.searchHistory = [];
        this.maxHistorySize = 10;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadSearchHistory();
        console.log('✅ Memory Search initialized');
    }

    // ========================================
    // РОЗШИРЕНИЙ ПОШУК
    // ========================================

    advancedSearch(query, options = {}) {
        const {
            category = null,
            important = null,
            dateFrom = null,
            dateTo = null,
            tags = [],
            searchInTitle = true,
            searchInContent = true,
            searchInTags = true
        } = options;

        let memories = this.getMemories();

        // Фільтр за категорією
        if (category) {
            memories = memories.filter(m => m.category === category);
        }

        // Фільтр за важливістю
        if (important !== null) {
            memories = memories.filter(m => m.important === important);
        }

        // Фільтр за датами
        if (dateFrom) {
            const fromTime = new Date(dateFrom).getTime();
            memories = memories.filter(m => 
                (m.timestamp || 0) >= fromTime
            );
        }

        if (dateTo) {
            const toTime = new Date(dateTo).getTime();
            memories = memories.filter(m => 
                (m.timestamp || 0) <= toTime
            );
        }

        // Фільтр за тегами
        if (tags.length > 0) {
            memories = memories.filter(m => 
                m.tags && tags.some(tag => m.tags.includes(tag))
            );
        }

        // Текстовий пошук
        if (query && query.trim() !== '') {
            const lowerQuery = query.toLowerCase();
            
            memories = memories.filter(m => {
                let match = false;

                if (searchInTitle && m.title) {
                    match = match || m.title.toLowerCase().includes(lowerQuery);
                }

                if (searchInContent && m.content) {
                    match = match || m.content.toLowerCase().includes(lowerQuery);
                }

                if (searchInTags && m.tags) {
                    match = match || m.tags.some(tag => 
                        tag.toLowerCase().includes(lowerQuery)
                    );
                }

                return match;
            });
        }

        // Зберегти в історію
        if (query) {
            this.addToSearchHistory(query);
        }

        return memories;
    }

    // ========================================
    // FUZZY SEARCH
    // ========================================

    fuzzySearch(query) {
        if (!query || query.trim() === '') return [];

        const memories = this.getMemories();
        const scored = [];

        memories.forEach(memory => {
            const score = this.calculateFuzzyScore(query, memory);
            if (score > 0) {
                scored.push({ memory, score });
            }
        });

        // Сортувати за релевантністю
        scored.sort((a, b) => b.score - a.score);

        return scored.map(item => item.memory);
    }

    calculateFuzzyScore(query, memory) {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        // Точний збіг в заголовку = +10
        if (memory.title && memory.title.toLowerCase().includes(lowerQuery)) {
            score += 10;
        }

        // Точний збіг в контенті = +5
        if (memory.content && memory.content.toLowerCase().includes(lowerQuery)) {
            score += 5;
        }

        // Збіг в тегах = +7
        if (memory.tags && memory.tags.some(tag => 
            tag.toLowerCase().includes(lowerQuery))
        ) {
            score += 7;
        }

        // Важливий спогад = +3
        if (memory.important) {
            score += 3;
        }

        // Свіжий спогад (< 7 днів) = +2
        const daysDiff = (Date.now() - (memory.timestamp || 0)) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
            score += 2;
        }

        return score;
    }

    // ========================================
    // ПОШУК ЗА ТЕГАМИ
    // ========================================

    searchByTag(tag) {
        const memories = this.getMemories();
        return memories.filter(m => 
            m.tags && m.tags.includes(tag.toLowerCase())
        );
    }

    getAllTags() {
        const memories = this.getMemories();
        const tags = new Set();

        memories.forEach(m => {
            if (m.tags) {
                m.tags.forEach(tag => tags.add(tag));
            }
        });

        return Array.from(tags).sort();
    }

    getTagCloud() {
        const memories = this.getMemories();
        const tagCounts = {};

        memories.forEach(m => {
            if (m.tags) {
                m.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        // Перетворити на масив і відсортувати
        return Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }

    // ========================================
    // АНАЛІТИКА
    // ========================================

    getAnalytics() {
        const memories = this.getMemories();

        const analytics = {
            total: memories.length,
            important: memories.filter(m => m.important).length,
            byCategory: {},
            byMonth: {},
            avgMemoriesPerDay: 0,
            mostUsedTags: [],
            recentActivity: []
        };

        // За категоріями
        memories.forEach(m => {
            const cat = m.category || 'загальне';
            analytics.byCategory[cat] = (analytics.byCategory[cat] || 0) + 1;
        });

        // За місяцями
        memories.forEach(m => {
            const date = new Date(m.timestamp || m.created);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            analytics.byMonth[month] = (analytics.byMonth[month] || 0) + 1;
        });

        // Середня кількість на день
        if (memories.length > 0) {
            const oldestMemory = memories.reduce((oldest, m) => {
                const time = m.timestamp || new Date(m.created).getTime();
                return time < oldest ? time : oldest;
            }, Date.now());

            const daysDiff = (Date.now() - oldestMemory) / (1000 * 60 * 60 * 24);
            analytics.avgMemoriesPerDay = (memories.length / Math.max(daysDiff, 1)).toFixed(2);
        }

        // Найпопулярніші теги
        const tagCloud = this.getTagCloud();
        analytics.mostUsedTags = tagCloud.slice(0, 10);

        // Остання активність
        const recent = [...memories]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 5);
        
        analytics.recentActivity = recent.map(m => ({
            title: m.title,
            category: m.category,
            timestamp: m.timestamp
        }));

        return analytics;
    }

    // ========================================
    // СХОЖІ СПОГАДИ
    // ========================================

    findSimilar(memoryId, limit = 5) {
        const memory = this.getMemory(memoryId);
        if (!memory) return [];

        const memories = this.getMemories().filter(m => m.id !== memoryId);
        const scored = [];

        memories.forEach(m => {
            const score = this.calculateSimilarity(memory, m);
            if (score > 0) {
                scored.push({ memory: m, score });
            }
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map(item => item.memory);
    }

    calculateSimilarity(memory1, memory2) {
        let score = 0;

        // Та ж категорія = +5
        if (memory1.category === memory2.category) {
            score += 5;
        }

        // Спільні теги
        if (memory1.tags && memory2.tags) {
            const common = memory1.tags.filter(t => memory2.tags.includes(t));
            score += common.length * 3;
        }

        // Обидва важливі = +2
        if (memory1.important && memory2.important) {
            score += 2;
        }

        // Схожість в заголовках
        const titleWords1 = memory1.title.toLowerCase().split(/\s+/);
        const titleWords2 = memory2.title.toLowerCase().split(/\s+/);
        const commonWords = titleWords1.filter(w => titleWords2.includes(w));
        score += commonWords.length;

        return score;
    }

    // ========================================
    // ІСТОРІЯ ПОШУКУ
    // ========================================

    addToSearchHistory(query) {
        if (!query || query.trim() === '') return;

        // Видалити дублікати
        this.searchHistory = this.searchHistory.filter(q => q !== query);

        // Додати на початок
        this.searchHistory.unshift(query);

        // Обмежити розмір
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }

        this.saveSearchHistory();
    }

    getSearchHistory() {
        return [...this.searchHistory];
    }

    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('memory_search_history');
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('memory_search_history', 
                JSON.stringify(this.searchHistory)
            );
        } catch (e) {
            console.error('Failed to save search history:', e);
        }
    }

    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('memory_search_history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load search history:', e);
            this.searchHistory = [];
        }
    }

    // ========================================
    // ЕКСПОРТ РЕЗУЛЬТАТІВ ПОШУКУ
    // ========================================

    exportSearchResults(memories, query) {
        if (memories.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає результатів для експорту', 'warning');
            }
            return;
        }

        let content = `# 🔍 Результати пошуку\n\n`;
        content += `**Запит:** "${query}"\n`;
        content += `**Знайдено:** ${memories.length} спогадів\n`;
        content += `**Дата:** ${new Date().toLocaleString('uk-UA')}\n\n`;
        content += `---\n\n`;

        memories.forEach((memory, i) => {
            content += `## ${i + 1}. ${memory.important ? '⭐ ' : ''}${memory.title}\n\n`;
            content += `**Категорія:** ${memory.category}\n\n`;
            content += `${memory.content}\n\n`;
            
            if (memory.tags && memory.tags.length > 0) {
                content += `**Теги:** ${memory.tags.map(t => `#${t}`).join(', ')}\n\n`;
            }
            
            content += `---\n\n`;
        });

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search-results-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            showToast('✅ Результати експортовано!', 'success');
        }
    }

    // ========================================
    // СТАТИСТИКА ПОШУКУ
    // ========================================

    getSearchStats() {
        return {
            totalSearches: this.searchHistory.length,
            recentSearches: this.searchHistory.slice(0, 5),
            uniqueTags: this.getAllTags().length,
            totalMemories: this.getMemories().length
        };
    }

    // ========================================
    // UTILITY
    // ========================================

    getMemories() {
        if (window.appState) {
            return appState.getMemories() || [];
        }
        return [];
    }

    getMemory(memoryId) {
        const memories = this.getMemories();
        return memories.find(m => m.id === memoryId);
    }

    // ========================================
    // ПІДКАЗКИ ПОШУКУ
    // ========================================

    getSuggestions(partialQuery) {
        if (!partialQuery || partialQuery.length < 2) return [];

        const suggestions = new Set();
        const lowerQuery = partialQuery.toLowerCase();

        // З історії пошуку
        this.searchHistory.forEach(query => {
            if (query.toLowerCase().includes(lowerQuery)) {
                suggestions.add(query);
            }
        });

        // З тегів
        const tags = this.getAllTags();
        tags.forEach(tag => {
            if (tag.toLowerCase().includes(lowerQuery)) {
                suggestions.add(`#${tag}`);
            }
        });

        // З заголовків спогадів
        const memories = this.getMemories();
        memories.forEach(m => {
            const words = m.title.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.includes(lowerQuery) && word.length > 2) {
                    suggestions.add(word);
                }
            });
        });

        return Array.from(suggestions).slice(0, 10);
    }

    // ========================================
    // HIGHLIGHT SEARCH RESULTS
    // ========================================

    highlightText(text, query) {
        if (!query || !text) return text;

        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\        // Спільні теги
        if (memory1.tags && memory2.tags) {
            const common = memory1.tags.filter(t => memory2.tags.includes(t));
            score += common.length * 3;');
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const memorySearch = new MemorySearch();

// Експорт
window.memorySearch = memorySearch;
window.MemorySearch = MemorySearch;

// Compatibility functions
window.searchMemories = (query) => {
    if (window.memoryManagerCore) {
        memoryManagerCore.searchMemories(query);
    }
};

console.log('✅ Memory Search loaded');
