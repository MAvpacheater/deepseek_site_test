// 🧠 Memory Manager Core - Main Logic (400 lines)

class MemoryManagerCore {
    constructor() {
        this.categories = ['загальне', 'важливе', 'завдання', 'навчання', 'персональне'];
        this.filterCategory = 'all';
        this.filterImportant = false;
        this.searchQuery = '';
        this.sortBy = 'date'; // 'date', 'importance', 'category'
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        this.loadMemories();
        
        console.log('✅ Memory Manager Core initialized');
    }

    setupEventListeners() {
        // EventBus події
        if (window.eventBus) {
            eventBus.on('memory:add', () => this.refreshMemories());
            eventBus.on('memory:update', () => this.refreshMemories());
            eventBus.on('memory:delete', () => this.refreshMemories());
            eventBus.on('memory:clear', () => this.refreshMemories());
        }

        // AppState події
        if (window.appState) {
            appState.on('memory:add', () => this.refreshMemories());
        }
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ СПОГАДІВ
    // ========================================

    async loadMemories() {
        try {
            let memories = [];

            // Завантажити з IndexedDB
            if (window.storageManager) {
                memories = await storageManager.getMemories();
            }

            // Синхронізувати з AppState
            if (window.appState && memories.length > 0) {
                appState.agent.memory = memories;
            }

            // Fallback до AppState
            if (memories.length === 0 && window.appState) {
                memories = appState.getMemories();
            }

            // Fallback до localStorage
            if (memories.length === 0) {
                const saved = localStorage.getItem('agent_memories');
                if (saved) {
                    try {
                        memories = JSON.parse(saved);
                    } catch (e) {
                        console.error('Failed to parse memories:', e);
                    }
                }
            }

            this.updateStats();
            this.refreshMemories();

            console.log(`🧠 Loaded ${memories.length} memories`);

        } catch (error) {
            console.error('Failed to load memories:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'memory_error',
                    message: 'Failed to load memories',
                    error: error.message,
                    severity: 'medium'
                });
            }
        }
    }

    // ========================================
    // СТВОРЕННЯ СПОГАДУ
    // ========================================

    openCreateModal() {
        const modal = document.getElementById('memoryModal');
        if (!modal) return;

        // Очистити форму
        this.resetForm();
        modal.classList.add('active');
    }

    resetForm() {
        const fields = {
            memoryTitle: '',
            memoryContent: '',
            memoryImportant: false
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (typeof value === 'boolean') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    async createMemory() {
        const title = document.getElementById('memoryTitle')?.value.trim();
        const content = document.getElementById('memoryContent')?.value.trim();
        const important = document.getElementById('memoryImportant')?.checked || false;

        // Валідація
        const validation = this.validateMemoryData({ title, content });
        if (!validation.valid) {
            if (window.showToast) {
                showToast(`⚠️ ${validation.errors.join(', ')}`, 'warning');
            }
            return null;
        }

        const memory = {
            id: Date.now(),
            title: title,
            content: content,
            category: this.detectCategory(title, content),
            important: important,
            tags: this.extractTags(content),
            timestamp: Date.now(),
            created: new Date().toISOString(),
            auto: false
        };

        try {
            // Додати в AppState
            if (window.appState) {
                appState.addMemory(memory);
            }

            // Зберегти в IndexedDB
            if (window.storageManager) {
                await storageManager.saveMemory(memory);
            }

            // Backup в localStorage
            await this.saveToLocalStorage();

            this.closeModal('memoryModal');
            this.refreshMemories();

            if (window.showToast) {
                showToast('✅ Спогад збережено!', 'success');
            }

            return memory;

        } catch (error) {
            console.error('Failed to create memory:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження', 'error');
            }
            return null;
        }
    }

    // ========================================
    // ОНОВЛЕННЯ СПОГАДУ
    // ========================================

    async editMemory(memoryId) {
        const memory = this.getMemory(memoryId);
        if (!memory) return;

        const modal = document.getElementById('memoryModal');
        if (!modal) return;

        // Заповнити форму
        document.getElementById('memoryTitle').value = memory.title;
        document.getElementById('memoryContent').value = memory.content;
        document.getElementById('memoryImportant').checked = memory.important;

        // Зберегти ID для оновлення
        modal.dataset.editingId = memoryId;
        modal.classList.add('active');
    }

    async updateMemory(memoryId, updates) {
        try {
            const memories = this.getMemories();
            const memory = memories.find(m => m.id === memoryId);
            
            if (!memory) {
                throw new Error('Memory not found');
            }

            // Оновити дані
            Object.assign(memory, updates, {
                updated: new Date().toISOString()
            });

            // Автоматично оновити категорію якщо змінився контент
            if (updates.title || updates.content) {
                memory.category = this.detectCategory(
                    memory.title, 
                    memory.content
                );
                memory.tags = this.extractTags(memory.content);
            }

            // Оновити в IndexedDB
            if (window.storageManager) {
                await storageManager.update(
                    storageManager.stores.memories, 
                    memory
                );
            }

            // Backup в localStorage
            await this.saveToLocalStorage();

            this.refreshMemories();

            return memory;

        } catch (error) {
            console.error('Failed to update memory:', error);
            throw error;
        }
    }

    async toggleImportant(memoryId) {
        const memory = this.getMemory(memoryId);
        if (!memory) return false;

        memory.important = !memory.important;

        // Оновити
        await this.updateMemory(memoryId, { important: memory.important });

        if (window.showToast) {
            const msg = memory.important ? 
                '⭐ Додано в важливі' : 
                '☆ Прибрано з важливих';
            showToast(msg, 'success', 2000);
        }

        return true;
    }

    // ========================================
    // ВИДАЛЕННЯ СПОГАДУ
    // ========================================

    async deleteMemory(memoryId) {
        const memory = this.getMemory(memoryId);
        if (!memory) return false;

        // Підтвердження
        const confirmed = await this.confirmDelete(memory);
        if (!confirmed) return false;

        try {
            // Видалити з AppState
            const memories = window.appState?.agent?.memory || [];
            const index = memories.findIndex(m => m.id === memoryId);
            if (index !== -1) {
                memories.splice(index, 1);
            }

            // Видалити з IndexedDB
            if (window.storageManager) {
                await storageManager.delete(
                    storageManager.stores.memories, 
                    memoryId
                );
            }

            // Backup в localStorage
            await this.saveToLocalStorage();

            this.refreshMemories();

            if (window.showToast) {
                showToast('✅ Спогад видалено', 'success');
            }

            return true;

        } catch (error) {
            console.error('Failed to delete memory:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
            return false;
        }
    }

    async confirmDelete(memory) {
        if (window.modalManager) {
            return await modalManager.confirm(
                `Видалити спогад "${memory.title}"?\n\nЦю дію не можна скасувати!`,
                {
                    title: '⚠️ Підтвердження',
                    icon: '🗑️',
                    confirmText: 'Так, видалити',
                    cancelText: 'Скасувати',
                    danger: true
                }
            );
        }

        return confirm(`⚠️ Видалити спогад "${memory.title}"?`);
    }

    // ========================================
    // ПОШУК ТА ФІЛЬТРАЦІЯ
    // ========================================

    searchMemories(query) {
        this.searchQuery = query.toLowerCase();
        this.refreshMemories();
    }

    filterByCategory(category) {
        this.filterCategory = category;
        this.refreshMemories();
    }

    filterByImportance(important) {
        this.filterImportant = important;
        this.refreshMemories();
    }

    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.refreshMemories();
    }

    getFilteredMemories() {
        let memories = this.getMemories();

        // Фільтр за категорією
        if (this.filterCategory !== 'all') {
            memories = memories.filter(m => m.category === this.filterCategory);
        }

        // Фільтр за важливістю
        if (this.filterImportant) {
            memories = memories.filter(m => m.important);
        }

        // Пошук
        if (this.searchQuery) {
            memories = memories.filter(m => {
                const searchText = (
                    m.title + ' ' + 
                    m.content + ' ' + 
                    (m.tags || []).join(' ')
                ).toLowerCase();
                return searchText.includes(this.searchQuery);
            });
        }

        // Сортування
        memories = this.sortMemories(memories);

        return memories;
    }

    sortMemories(memories) {
        const sorted = [...memories];

        switch (this.sortBy) {
            case 'date':
                sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                break;
            case 'importance':
                sorted.sort((a, b) => {
                    if (a.important === b.important) {
                        return (b.timestamp || 0) - (a.timestamp || 0);
                    }
                    return a.important ? -1 : 1;
                });
                break;
            case 'category':
                sorted.sort((a, b) => {
                    const catCompare = (a.category || '').localeCompare(b.category || '');
                    if (catCompare === 0) {
                        return (b.timestamp || 0) - (a.timestamp || 0);
                    }
                    return catCompare;
                });
                break;
        }

        return sorted;
    }

    // ========================================
    // ЕКСПОРТ / ІМПОРТ
    // ========================================

    async exportMemories(format = 'json') {
        const memories = this.getMemories();
        
        if (memories.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає спогадів для експорту', 'warning');
            }
            return;
        }

        let content = '';
        let filename = `memories-${Date.now()}`;

        if (format === 'json') {
            const data = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                count: memories.length,
                memories: memories
            };
            content = JSON.stringify(data, null, 2);
            filename += '.json';
        } else if (format === 'markdown') {
            content = this.generateMarkdown(memories);
            filename += '.md';
        }

        this.downloadFile(content, filename);

        if (window.showToast) {
            showToast('✅ Спогади експортовано!', 'success');
        }
    }

    generateMarkdown(memories) {
        let md = `# 🧠 Спогади\n\n`;
        md += `Експортовано: ${new Date().toLocaleString('uk-UA')}\n`;
        md += `Всього спогадів: ${memories.length}\n\n`;
        md += `---\n\n`;

        memories.forEach((memory, i) => {
            md += `## ${memory.important ? '⭐ ' : ''}${memory.title}\n\n`;
            md += `**Категорія:** ${memory.category}\n\n`;
            md += `${memory.content}\n\n`;
            
            if (memory.tags && memory.tags.length > 0) {
                md += `**Теги:** ${memory.tags.map(t => `#${t}`).join(', ')}\n\n`;
            }
            
            md += `*${new Date(memory.timestamp || memory.created).toLocaleString('uk-UA')}*\n\n`;
            
            if (i < memories.length - 1) {
                md += `---\n\n`;
            }
        });

        return md;
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async clearAllMemories() {
        if (!confirm('⚠️ Видалити ВСІ спогади? Цю дію не можна скасувати!')) {
            return false;
        }

        try {
            // Очистити AppState
            if (window.appState && window.appState.agent) {
                window.appState.agent.memory = [];
            }

            // Очистити IndexedDB
            if (window.storageManager) {
                await storageManager.clear(storageManager.stores.memories);
            }

            // Очистити localStorage
            localStorage.removeItem('agent_memories');

            this.refreshMemories();

            if (window.showToast) {
                showToast('🗑️ Всі спогади видалено', 'success');
            }

            return true;

        } catch (error) {
            console.error('Failed to clear memories:', error);
            if (window.showToast) {
                showToast('❌ Помилка очищення', 'error');
            }
            return false;
        }
    }

    // ========================================
    // АВТОМАТИЧНІ СПОГАДИ
    // ========================================

    async autoRemember(type, data) {
        const titles = {
            plan_completed: `План завершено: ${data.title}`,
            code_generated: `Код згенеровано: ${data.filename}`,
            image_generated: `Зображення створено`,
            conversation_saved: `Розмова збережена`
        };

        const memory = {
            id: Date.now(),
            title: titles[type] || 'Автоматичний спогад',
            content: JSON.stringify(data, null, 2),
            category: 'загальне',
            important: false,
            tags: [type],
            timestamp: Date.now(),
            created: new Date().toISOString(),
            auto: true
        };

        try {
            if (window.appState) {
                appState.addMemory(memory);
            }

            if (window.storageManager) {
                await storageManager.saveMemory(memory);
            }

            await this.saveToLocalStorage();

            return memory;

        } catch (error) {
            console.error('Auto-remember failed:', error);
            return null;
        }
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
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

    refreshMemories() {
        this.updateStats();
        
        // Сповістити UI
        if (window.eventBus) {
            eventBus.emit('memory:refresh');
        }
    }

    updateStats() {
        const memories = this.getMemories();

        const stats = {
            total: memories.length,
            important: memories.filter(m => m.important).length,
            byCategory: {}
        };

        this.categories.forEach(cat => {
            stats.byCategory[cat] = memories.filter(m => m.category === cat).length;
        });

        // Оновити UI
        const totalEl = document.getElementById('totalMemories');
        const importantEl = document.getElementById('importantMemories');
        const countEl = document.getElementById('memoryCount');

        if (totalEl) totalEl.textContent = stats.total;
        if (importantEl) importantEl.textContent = stats.important;
        if (countEl) countEl.textContent = stats.total;

        return stats;
    }

    async saveToLocalStorage() {
        try {
            const memories = this.getMemories();
            localStorage.setItem('agent_memories', JSON.stringify(memories));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    detectCategory(title, content) {
        const text = (title + ' ' + content).toLowerCase();
        
        if (text.includes('важлив') || text.includes('термін')) return 'важливе';
        if (text.includes('завдан') || text.includes('треба')) return 'завдання';
        if (text.includes('навчи') || text.includes('вивчи')) return 'навчання';
        if (text.includes('мій') || text.includes('особист')) return 'персональне';
        
        return 'загальне';
    }

    extractTags(text) {
        if (!text) return [];
        const tags = (text.match(/#[\wа-яіїє]+/gi) || [])
            .map(t => t.substring(1).toLowerCase());
        return [...new Set(tags)];
    }

    validateMemoryData(data) {
        const errors = [];

        if (!data.title || data.title.trim() === '') {
            errors.push('Назва спогаду обов\'язкова');
        }

        if (data.title && data.title.length > 200) {
            errors.push('Назва занадто довга');
        }

        if (!data.content || data.content.trim() === '') {
            errors.push('Вміст спогаду обов\'язковий');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            delete modal.dataset.editingId;
        }
    }

    getStats() {
        return this.updateStats();
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const memoryManagerCore = new MemoryManagerCore();

// Експорт
window.memoryManagerCore = memoryManagerCore;
window.MemoryManagerCore = MemoryManagerCore;

// Compatibility functions
window.addMemory = () => memoryManagerCore.openCreateModal();
window.saveMemory = () => memoryManagerCore.createMemory();
window.autoRemember = (type, data) => memoryManagerCore.autoRemember(type, data);

console.log('✅ Memory Manager Core loaded');
