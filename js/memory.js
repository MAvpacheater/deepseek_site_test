// 🧠 Agent Memory System - LIST VIEW (2025 version) - ВИПРАВЛЕНО

class MemoryManager {
    constructor() {
        this.memoryCategories = ['загальне', 'важливе', 'завдання', 'навчання', 'персональне'];
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        document.addEventListener("DOMContentLoaded", async () => {
            await this.loadMemories();
            console.log('✅ Memory Manager initialized');
        });
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ СПОГАДІВ
    // ========================================

    async loadMemories() {
        try {
            let memories = [];

            // Завантаження із storageManager
            if (window.storageManager && typeof storageManager.getMemories === "function") {
                memories = await storageManager.getMemories();
                console.log('📦 Завантажено з IndexedDB:', memories.length);
            }

            // Fallback до localStorage
            if (memories.length === 0) {
                const localMemories = localStorage.getItem('agent_memories');
                if (localMemories) {
                    try {
                        memories = JSON.parse(localMemories);
                        console.log('📦 Завантажено з localStorage:', memories.length);
                    } catch (e) {
                        console.error('Failed to parse localStorage memories:', e);
                    }
                }
            }

            // Якщо appState існує — синхронізуємо
            if (window.appState) {
                if (!appState.agent) appState.agent = {};
                appState.agent.memory = memories;
            }

            this.updateMemoryStats();
            this.displayMemories();

        } catch (error) {
            console.error('❌ Failed to load memories:', error);
        }
    }

    // ========================================
    // ОНОВЛЕННЯ СТАТИСТИКИ
    // ========================================

    updateMemoryStats() {
        const memories = window.appState?.getMemories?.() || [];

        const totalSpan = document.getElementById('totalMemories');
        const importantSpan = document.getElementById('importantMemories');
        const memoryCountSpan = document.getElementById('memoryCount');

        if (totalSpan) totalSpan.textContent = memories.length;
        if (importantSpan) {
            const important = memories.filter(m => m.important).length;
            importantSpan.textContent = important;
        }
        if (memoryCountSpan) memoryCountSpan.textContent = memories.length;
    }

    // ========================================
    // ВІДОБРАЖЕННЯ СПОГАДІВ - СПИСОК
    // ========================================

    displayMemories() {
        const list = document.getElementById('memoriesList') || document.querySelector('.memories-list');
        if (!list) {
            console.warn('⚠️ Не знайдено контейнер для спогадів (#memoriesList або .memories-list)');
            return;
        }

        const memories = window.appState?.getMemories?.() || [];

        console.log(`📊 Відображення ${memories.length} спогадів`);

        if (memories.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🧠</div>
                    <h3>Пам'ять порожня</h3>
                    <p>Додай перший спогад або агент запам'ятає автоматично</p>
                </div>
            `;
            return;
        }

        // Сортувати за датою
        const sorted = [...memories].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Створюємо список
        list.innerHTML = `
            <div class="memory-list-container">
                ${sorted.map(memory => this.createMemoryListItem(memory)).join('')}
            </div>
        `;
        
        console.log('✅ Спогади відображено списком');
    }

    // ========================================
    // СТВОРЕННЯ ЕЛЕМЕНТА СПИСКУ
    // ========================================

    createMemoryListItem(memory) {
        const icon = memory.important ? '⭐' : this.getMemoryIcon(memory.category);
        const date = this.formatDate(memory.timestamp || memory.created || memory.id);
        const category = memory.category || 'загальне';
        const tags = memory.tags || [];

        const escapeHTML = (text) => {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        };

        return `
            <div class="memory-list-item ${memory.important ? 'important' : ''}" data-id="${memory.id}">
                <div class="memory-list-left">
                    <div class="memory-list-icon">${icon}</div>
                </div>
                
                <div class="memory-list-content">
                    <div class="memory-list-header">
                        <h3 class="memory-list-title">${escapeHTML(memory.title)}</h3>
                        <div class="memory-list-meta">
                            <span class="memory-category">${category}</span>
                            <span class="memory-date">${date}</span>
                        </div>
                    </div>
                    
                    <p class="memory-list-text">${escapeHTML(memory.content)}</p>
                    
                    ${tags.length > 0 ? `
                        <div class="memory-tags">
                            ${tags.map(tag => `<span class="memory-tag">${escapeHTML(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="memory-list-actions">
                    <button class="memory-action-btn" onclick="memoryManager.editMemory(${memory.id})" title="Редагувати">✏️</button>
                    <button class="memory-action-btn" onclick="memoryManager.toggleImportant(${memory.id})" title="${memory.important ? 'Зняти важливість' : 'Важливо'}">
                        ${memory.important ? '☆' : '⭐'}
                    </button>
                    <button class="memory-action-btn delete" onclick="memoryManager.deleteMemory(${memory.id})" title="Видалити">🗑️</button>
                </div>
            </div>
        `;
    }

    // ========================================
    // CRUD ОПЕРАЦІЇ
    // ========================================

    addMemory() {
        const modal = document.getElementById('memoryModal');
        if (modal) modal.classList.add('active');

        ['memoryTitle', 'memoryContent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const importantInput = document.getElementById('memoryImportant');
        if (importantInput) importantInput.checked = false;
    }

    async saveMemory() {
        const title = document.getElementById('memoryTitle')?.value.trim();
        const content = document.getElementById('memoryContent')?.value.trim();
        const important = document.getElementById('memoryImportant')?.checked || false;

        if (!title || !content) {
            window.showToast?.('⚠️ Заповни всі поля!', 'warning');
            return;
        }

        const category = this.detectCategory(title, content);
        const tags = this.extractTags(content);

        const memory = {
            id: Date.now(),
            title,
            content,
            category,
            important,
            tags,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            auto: false
        };

        try {
            // Додати в appState
            window.appState?.addMemory?.(memory);
            
            // Зберегти в IndexedDB
            await window.storageManager?.saveMemory?.(memory);
            
            // Зберегти в localStorage як backup
            await this.saveToLocalStorage();

            this.updateMemoryStats();
            this.displayMemories();
            this.closeModal('memoryModal');
            window.showToast?.('✅ Спогад збережено!', 'success');
            
            console.log('💾 Спогад збережено:', memory.title);
        } catch (e) {
            console.error('❌ Помилка збереження:', e);
            window.showToast?.('❌ Помилка збереження', 'error');
        }
    }

    async editMemory(id) {
        const memories = window.appState?.getMemories?.() || [];
        const memory = memories.find(m => m.id === id);
        if (!memory) return;

        const modal = document.getElementById('memoryModal');
        if (modal) modal.classList.add('active');

        document.getElementById('memoryTitle').value = memory.title;
        document.getElementById('memoryContent').value = memory.content;
        document.getElementById('memoryImportant').checked = memory.important;

        // Видалити старий спогад
        const arr = window.appState?.agent?.memory || [];
        const i = arr.findIndex(m => m.id === id);
        if (i !== -1) arr.splice(i, 1);
        await window.storageManager?.delete?.(window.storageManager.stores.memories, id);
    }

    async toggleImportant(id) {
        const memories = window.appState?.getMemories?.() || [];
        const memory = memories.find(m => m.id === id);
        if (!memory) return;

        memory.important = !memory.important;
        await window.storageManager?.update?.(window.storageManager.stores.memories, memory);
        
        // Зберегти в localStorage
        await this.saveToLocalStorage();

        this.updateMemoryStats();
        this.displayMemories();
    }

    // ========================================
    // ВИДАЛЕННЯ - ВИПРАВЛЕНО! confirm → delete
    // ========================================

    async deleteMemory(id) {
        // ✅ ВИПРАВЛЕНО: Спочатку знайти спогад
        const memories = window.appState?.getMemories?.() || [];
        const memory = memories.find(m => m.id === id);
        
        if (!memory) {
            console.warn('❌ Memory not found:', id);
            return;
        }

        // ✅ ВИПРАВЛЕНО: Використати modalManager або fallback до confirm
        let confirmed = false;
        
        if (window.modalManager) {
            // Використати красиве модальне вікно
            confirmed = await modalManager.confirm(
                `Видалити спогад "${memory.title}"?\n\nЦю дію не можна скасувати!`,
                {
                    title: '⚠️ Підтвердження',
                    icon: '🗑️',
                    confirmText: 'Так, видалити',
                    cancelText: 'Скасувати',
                    danger: true
                }
            );
        } else {
            // Fallback до стандартного confirm
            confirmed = confirm(`⚠️ Видалити спогад "${memory.title}"?\n\nЦю дію не можна скасувати!`);
        }

        if (!confirmed) {
            console.log('ℹ️ Видалення скасовано користувачем');
            return; // ❌ Користувач скасував - НЕ видаляємо!
        }

        // ✅ ВИПРАВЛЕНО: Тільки ПІСЛЯ підтвердження - видаляємо
        try {
            const arr = window.appState?.agent?.memory || [];
            const i = arr.findIndex(m => m.id === id);
            if (i !== -1) arr.splice(i, 1);

            await window.storageManager?.delete?.(window.storageManager.stores.memories, id);
            
            // Оновити localStorage
            await this.saveToLocalStorage();
            
            this.updateMemoryStats();
            this.displayMemories();

            window.showToast?.('✅ Спогад видалено', 'success');
            console.log('✅ Спогад успішно видалено:', memory.title);
        } catch (e) {
            console.error('❌ Помилка видалення:', e);
            window.showToast?.('❌ Помилка видалення', 'error');
        }
    }

    // ========================================
    // ПОШУК
    // ========================================

    searchMemories() {
        const query = document.getElementById('memorySearch')?.value.toLowerCase() || '';
        const items = document.querySelectorAll('.memory-list-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }

    // ========================================
    // ЗБЕРЕЖЕННЯ В LOCALSTORAGE (BACKUP)
    // ========================================

    async saveToLocalStorage() {
        try {
            const memories = window.appState?.getMemories?.() || [];
            localStorage.setItem('agent_memories', JSON.stringify(memories));
            console.log('💾 Backup в localStorage:', memories.length);
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    // ========================================
    // ЕКСПОРТ/ІМПОРТ
    // ========================================

    async exportMemories() {
        const memories = window.appState?.getMemories?.() || [];
        
        if (memories.length === 0) {
            window.showToast?.('⚠️ Немає спогадів для експорту', 'warning');
            return;
        }

        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            count: memories.length,
            memories: memories
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memories-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showToast?.('✅ Спогади експортовано!', 'success');
    }

    async clearMemories() {
        if (!confirm('⚠️ Видалити ВСІ спогади? Цю дію не можна скасувати!')) return;

        try {
            // Очистити appState
            if (window.appState && window.appState.agent) {
                window.appState.agent.memory = [];
            }

            // Очистити IndexedDB
            if (window.storageManager) {
                await window.storageManager.clear(window.storageManager.stores.memories);
            }

            // Очистити localStorage
            localStorage.removeItem('agent_memories');

            this.updateMemoryStats();
            this.displayMemories();

            window.showToast?.('🗑️ Всі спогади видалено', 'success');
        } catch (e) {
            console.error('Failed to clear memories:', e);
            window.showToast?.('❌ Помилка очищення', 'error');
        }
    }

    // ========================================
    // ДОПОМІЖНІ ФУНКЦІЇ
    // ========================================

    detectCategory(title, content) {
        const text = (title + ' ' + content).toLowerCase();
        if (text.includes('важлив') || text.includes('термін')) return 'важливе';
        if (text.includes('завдан') || text.includes('треба')) return 'завдання';
        if (text.includes('навчи') || text.includes('вивчи')) return 'навчання';
        if (text.includes('мій') || text.includes('особист')) return 'персональне';
        return 'загальне';
    }

    extractTags(text) {
        const tags = (text.match(/#[\wа-яіїє]+/gi) || []).map(t => t.substring(1).toLowerCase());
        return [...new Set(tags)];
    }

    getMemoryIcon(cat) {
        const icons = {
            'загальне': '💭',
            'важливе': '⭐',
            'завдання': '📋',
            'навчання': '📚',
            'персональне': '👤'
        };
        return icons[cat] || '💭';
    }

    formatDate(date) {
        if (!date) return 'невідомо';
        const d = new Date(date);
        return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    toggleMemoryMenu(id) {
        document.querySelectorAll('.memory-actions').forEach(m => m.style.display = 'none');
        const menu = document.getElementById(`memory-menu-${id}`);
        if (menu) menu.style.display = 'flex';
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    // ========================================
    // ТЕСТОВІ СПОГАДИ
    // ========================================

    addTestMemories() {
        const test = [
            { title: 'Перший проект', content: 'AI додаток з Gemini і DeepSeek', important: true },
            { title: 'Темна тема', content: 'Користувач любить темну тему #дизайн', important: false },
            { title: 'Експорт', content: 'Додати функцію експорту #todo', important: true }
        ];

        test.forEach(t => {
            const memory = {
                id: Date.now() + Math.random(),
                title: t.title,
                content: t.content,
                category: this.detectCategory(t.title, t.content),
                important: t.important,
                tags: this.extractTags(t.content),
                timestamp: Date.now(),
                created: new Date().toISOString()
            };
            window.appState?.addMemory?.(memory);
        });

        // Зберегти тестові дані
        this.saveToLocalStorage();

        this.updateMemoryStats();
        this.displayMemories();
        window.showToast?.('✅ Додано тестові спогади!', 'success');
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    window.memoryManager = new MemoryManager();

    // Глобальні методи
    window.addMemory = () => memoryManager.addMemory();
    window.saveMemory = () => memoryManager.saveMemory();
    window.searchMemories = () => memoryManager.searchMemories();
    window.clearMemories = () => memoryManager.clearMemories();
    window.exportMemories = () => memoryManager.exportMemories();
    window.addTestMemories = () => memoryManager.addTestMemories();

    console.log('✅ Memory module loaded (FIXED: confirm → delete)');
});

// Автоматичне збереження кожні 30 секунд
setInterval(() => {
    if (window.memoryManager) {
        memoryManager.saveToLocalStorage();
    }
}, 30000);
