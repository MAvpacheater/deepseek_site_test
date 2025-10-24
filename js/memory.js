// 🧠 Agent Memory System - Refactored to use AppState & StorageManager

class MemoryManager {
    constructor() {
        this.memoryCategories = ['загальне', 'важливе', 'завдання', 'навчання', 'персональне'];
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadMemories();
        console.log('✅ Memory Manager initialized');
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ СПОГАДІВ
    // ========================================

    async loadMemories() {
        try {
            if (window.storageManager) {
                const memories = await storageManager.getMemories();
                
                // Синхронізувати з appState
                if (window.appState) {
                    appState.agent.memory = memories;
                }
            }

            this.updateMemoryStats();
            this.displayMemories();

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
    // ЗБЕРЕЖЕННЯ СПОГАДІВ
    // ========================================

    async saveMemories() {
        try {
            const memories = window.appState ? appState.getMemories() : [];

            if (window.storageManager) {
                // Зберегти кожен спогад окремо
                for (const memory of memories) {
                    if (memory.id) {
                        await storageManager.update(storageManager.stores.memories, memory);
                    }
                }
            }

            this.updateMemoryStats();

        } catch (error) {
            console.error('Failed to save memories:', error);
        }
    }

    // ========================================
    // ОНОВЛЕННЯ СТАТИСТИКИ
    // ========================================

    updateMemoryStats() {
        const memories = window.appState ? appState.getMemories() : [];

        const totalSpan = document.getElementById('totalMemories');
        const importantSpan = document.getElementById('importantMemories');
        const memoryCountSpan = document.getElementById('memoryCount');

        if (totalSpan) {
            totalSpan.textContent = memories.length;
        }

        if (importantSpan) {
            const important = memories.filter(m => m.important).length;
            importantSpan.textContent = important;
        }

        if (memoryCountSpan) {
            memoryCountSpan.textContent = memories.length;
        }
    }

    // ========================================
    // ВІДОБРАЖЕННЯ СПОГАДІВ
    // ========================================

    displayMemories() {
        const list = document.getElementById('memoriesList');
        if (!list) return;

        const memories = window.appState ? appState.getMemories() : [];

        if (memories.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🧠</div>
                    <h3>Пам'ять порожня</h3>
                    <p>Агент запам'ятає важливу інформацію автоматично</p>
                </div>
            `;
            return;
        }

        // Сортувати за датою (новіші зверху)
        const sorted = [...memories].sort((a, b) => 
            new Date(b.timestamp || b.created) - new Date(a.timestamp || a.created)
        );

        list.innerHTML = sorted.map(memory => this.createMemoryCard(memory)).join('');
    }

    createMemoryCard(memory) {
        const icon = memory.important ? '⭐' : this.getMemoryIcon(memory.category);
        const date = this.formatDate(memory.timestamp || memory.created);

        return `
            <div class="memory-card ${memory.important ? 'important' : ''}" data-id="${memory.id}">
                <div class="memory-header">
                    <div class="memory-icon">${icon}</div>
                    <div class="memory-info">
                        <div class="memory-title">${this.escapeHTML(memory.title)}</div>
                        <div class="memory-meta">
                            <span class="memory-category">${memory.category || 'загальне'}</span>
                            <span class="memory-date">${date}</span>
                        </div>
                    </div>
                    <button class="memory-menu-btn" onclick="memoryManager.toggleMemoryMenu(${memory.id})">⋮</button>
                </div>
                
                <div class="memory-content">${this.escapeHTML(memory.content)}</div>
                
                ${memory.tags && memory.tags.length > 0 ? `
                    <div class="memory-tags">
                        ${memory.tags.map(tag => `<span class="memory-tag">${this.escapeHTML(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="memory-actions" id="memory-menu-${memory.id}" style="display: none;">
                    <button onclick="memoryManager.editMemory(${memory.id})">✏️ Редагувати</button>
                    <button onclick="memoryManager.toggleImportant(${memory.id})">
                        ${memory.important ? '☆ Зняти важливість' : '⭐ Важливо'}
                    </button>
                    <button onclick="memoryManager.deleteMemory(${memory.id})">🗑️ Видалити</button>
                </div>
            </div>
        `;
    }

    // ========================================
    // CRUD ОПЕРАЦІЇ
    // ========================================

    addMemory() {
        const modal = document.getElementById('memoryModal');
        if (modal) {
            modal.classList.add('active');
            
            // Очистити форму
            const titleInput = document.getElementById('memoryTitle');
            const contentInput = document.getElementById('memoryContent');
            const importantInput = document.getElementById('memoryImportant');

            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            if (importantInput) importantInput.checked = false;
        }
    }

    async saveMemory() {
        const title = document.getElementById('memoryTitle')?.value.trim();
        const content = document.getElementById('memoryContent')?.value.trim();
        const important = document.getElementById('memoryImportant')?.checked || false;

        if (!title || !content) {
            if (window.showToast) {
                showToast('⚠️ Заповни всі поля!', 'warning');
            }
            return;
        }

        // Визначити категорію автоматично
        const category = this.detectCategory(title, content);
        
        // Витягти теги
        const tags = this.extractTags(content);

        const memory = {
            id: Date.now(),
            title: title,
            content: content,
            category: category,
            important: important,
            tags: tags,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            accessed: 0,
            auto: false
        };

        try {
            // Додати в appState
            if (window.appState) {
                appState.addMemory(memory);
            }

            // Зберегти в storageManager
            if (window.storageManager) {
                await storageManager.saveMemory(memory);
            }

            this.displayMemories();
            this.closeModal('memoryModal');

            if (window.showToast) {
                showToast('✅ Спогад збережено!', 'success');
            }

        } catch (error) {
            console.error('Failed to save memory:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження спогаду', 'error');
            }
        }
    }

    editMemory(memoryId) {
        const memories = window.appState ? appState.getMemories() : [];
        const memory = memories.find(m => m.id === memoryId);
        if (!memory) return;

        document.getElementById('memoryTitle').value = memory.title;
        document.getElementById('memoryContent').value = memory.content;
        document.getElementById('memoryImportant').checked = memory.important;

        // Видалити старий спогад після редагування
        if (window.appState) {
            const index = appState.agent.memory.findIndex(m => m.id === memoryId);
            if (index !== -1) {
                appState.agent.memory.splice(index, 1);
            }
        }

        const modal = document.getElementById('memoryModal');
        if (modal) modal.classList.add('active');
    }

    async toggleImportant(memoryId) {
        const memories = window.appState ? appState.getMemories() : [];
        const memory = memories.find(m => m.id === memoryId);
        
        if (memory) {
            memory.important = !memory.important;

            // Оновити в storageManager
            if (window.storageManager) {
                await storageManager.update(storageManager.stores.memories, memory);
            }

            this.displayMemories();
        }
    }

    async deleteMemory(memoryId) {
        if (!confirm('⚠️ Видалити цей спогад?')) return;

        try {
            // Видалити з appState
            if (window.appState) {
                const index = appState.agent.memory.findIndex(m => m.id === memoryId);
                if (index !== -1) {
                    appState.agent.memory.splice(index, 1);
                }
            }

            // Видалити з storageManager
            if (window.storageManager) {
                await storageManager.delete(storageManager.stores.memories, memoryId);
            }

            this.displayMemories();

            if (window.showToast) {
                showToast('✅ Спогад видалено', 'success');
            }

        } catch (error) {
            console.error('Failed to delete memory:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
        }
    }

    async clearMemories() {
        if (!confirm('⚠️ Видалити всі спогади? Цю дію не можна скасувати!')) return;

        try {
            // Очистити в appState
            if (window.appState) {
                appState.agent.memory = [];
            }

            // Очистити в storageManager
            if (window.storageManager) {
                await storageManager.clear(storageManager.stores.memories);
            }

            this.updateMemoryStats();
            this.displayMemories();

            if (window.showToast) {
                showToast('🗑️ Пам\'ять очищено!', 'success');
            }

        } catch (error) {
            console.error('Failed to clear memories:', error);
            if (window.showToast) {
                showToast('❌ Помилка очищення', 'error');
            }
        }
    }

    // ========================================
    // ПОШУК
    // ========================================

    searchMemories() {
        const query = document.getElementById('memorySearch')?.value.toLowerCase();
        if (!query) {
            this.displayMemories();
            return;
        }

        const cards = document.querySelectorAll('.memory-card');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'block' : 'none';
        });
    }

    // ========================================
    // АВТОМАТИЧНЕ ЗАПАМ'ЯТОВУВАННЯ
    // ========================================

    async autoRemember(type, data) {
        const autoMemoryEnabled = localStorage.getItem('agentMemory') !== 'false';
        if (!autoMemoryEnabled) return;

        let title, content, important = false;

        switch (type) {
            case 'project_saved':
                title = `Проект: ${data.title}`;
                content = `Збережено проект "${data.title}". ${data.mode === 'deepseek' ? 'Код' : 'Розмова'} з ${data.messages} повідомленнями.`;
                break;

            case 'plan_completed':
                title = `Виконано: ${data.title}`;
                content = `План "${data.title}" успішно завершено ${this.formatDate(new Date())}`;
                important = true;
                break;

            case 'code_generated':
                title = 'Згенеровано код';
                content = `Створено ${data.filesCount} файлів: ${data.files.join(', ')}`;
                break;

            case 'user_preference':
                title = 'Налаштування користувача';
                content = data.preference;
                important = true;
                break;

            case 'error_occurred':
                title = 'Помилка системи';
                content = `${data.message} в ${data.context}`;
                break;
        }

        if (title && content) {
            const memory = {
                id: Date.now(),
                title: title,
                content: content,
                category: type.includes('plan') ? 'завдання' : 'загальне',
                important: important,
                tags: [type],
                timestamp: Date.now(),
                created: new Date().toISOString(),
                accessed: 0,
                auto: true
            };

            try {
                // Додати в appState
                if (window.appState) {
                    appState.addMemory(memory);
                }

                // Зберегти в storageManager
                if (window.storageManager) {
                    await storageManager.saveMemory(memory);
                }

                // Обмежити автоматичні спогади (залишити тільки 50)
                const memories = window.appState ? appState.getMemories() : [];
                const autoMemories = memories.filter(m => m.auto);
                
                if (autoMemories.length > 50) {
                    const toRemove = autoMemories[autoMemories.length - 1];
                    
                    if (window.appState) {
                        const index = appState.agent.memory.findIndex(m => m.id === toRemove.id);
                        if (index !== -1) {
                            appState.agent.memory.splice(index, 1);
                        }
                    }

                    if (window.storageManager) {
                        await storageManager.delete(storageManager.stores.memories, toRemove.id);
                    }
                }

            } catch (error) {
                console.error('Auto-remember failed:', error);
            }
        }
    }

    // ========================================
    // ЕКСПОРТ
    // ========================================

    exportMemories() {
        const memories = window.appState ? appState.getMemories() : [];

        if (memories.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає спогадів для експорту!', 'warning');
            }
            return;
        }

        let markdown = '# 🧠 Пам\'ять AI Агента\n\n';
        markdown += `Експортовано: ${new Date().toLocaleString('uk-UA')}\n\n`;
        markdown += `Всього спогадів: ${memories.length}\n\n`;
        markdown += '---\n\n';

        memories.forEach(memory => {
            markdown += `## ${memory.important ? '⭐ ' : ''}${memory.title}\n\n`;
            markdown += `**Категорія:** ${memory.category}  \n`;
            markdown += `**Дата:** ${this.formatDate(memory.timestamp || memory.created)}  \n`;

            if (memory.tags && memory.tags.length > 0) {
                markdown += `**Теги:** ${memory.tags.join(', ')}  \n`;
            }

            markdown += `\n${memory.content}\n\n`;
            markdown += '---\n\n';
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agent-memory.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            showToast('✅ Пам\'ять експортовано!', 'success');
        }
    }

    // ========================================
    // ДОПОМІЖНІ ФУНКЦІЇ
    // ========================================

    detectCategory(title, content) {
        const text = (title + ' ' + content).toLowerCase();

        if (text.includes('важлив') || text.includes('критичн') || text.includes('терміново')) {
            return 'важливе';
        }
        if (text.includes('завдан') || text.includes('зроби') || text.includes('треба')) {
            return 'завдання';
        }
        if (text.includes('навчи') || text.includes('вивчи') || text.includes('запам\'ята')) {
            return 'навчання';
        }
        if (text.includes('особист') || text.includes('приват') || text.includes('мій')) {
            return 'персональне';
        }

        return 'загальне';
    }

    extractTags(text) {
        // Шукати слова після #
        const hashTags = text.match(/#[\wа-яіїє]+/gi) || [];
        const tags = hashTags.map(tag => tag.substring(1).toLowerCase());

        // Додати ключові слова
        const keywords = ['проект', 'ідея', 'баг', 'фіча', 'todo'];
        keywords.forEach(word => {
            if (text.toLowerCase().includes(word) && !tags.includes(word)) {
                tags.push(word);
            }
        });

        return [...new Set(tags)]; // Унікальні теги
    }

    getMemoryIcon(category) {
        const icons = {
            'загальне': '💭',
            'важливе': '⭐',
            'завдання': '📋',
            'навчання': '📚',
            'персональне': '👤'
        };
        return icons[category] || '💭';
    }

    formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days < 7) return `${days} дн тому`;

        return d.toLocaleDateString('uk-UA');
    }

    toggleMemoryMenu(memoryId) {
        const menu = document.getElementById(`memory-menu-${memoryId}`);
        if (menu) {
            const isVisible = menu.style.display !== 'none';

            // Закрити всі інші меню
            document.querySelectorAll('.memory-actions').forEach(m => {
                m.style.display = 'none';
            });

            menu.style.display = isVisible ? 'none' : 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    escapeHTML(text) {
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let memoryManager = null;

document.addEventListener('DOMContentLoaded', () => {
    memoryManager = new MemoryManager();

    // Експортувати функції для сумісності
    window.addMemory = () => memoryManager.addMemory();
    window.saveMemory = () => memoryManager.saveMemory();
    window.editMemory = (id) => memoryManager.editMemory(id);
    window.toggleImportant = (id) => memoryManager.toggleImportant(id);
    window.deleteMemory = (id) => memoryManager.deleteMemory(id);
    window.clearMemories = () => memoryManager.clearMemories();
    window.searchMemories = () => memoryManager.searchMemories();
    window.exportMemories = () => memoryManager.exportMemories();
    window.displayMemories = () => memoryManager.displayMemories();
    window.toggleMemoryMenu = (id) => memoryManager.toggleMemoryMenu(id);
    window.autoRemember = (type, data) => memoryManager.autoRemember(type, data);

    console.log('✅ Memory module loaded');
});

// Експорт класу
window.MemoryManager = MemoryManager;
window.memoryManager = memoryManager;
