// 🧠 Agent Memory System — ВІДНОВЛЕННЯ ЗБЕРЕЖЕНИХ СПОГАДІВ

class MemoryManager {
    constructor() {
        this.memoryCategories = ['загальне', 'важливе', 'завдання', 'навчання', 'персональне'];
        this.ready = false;
        this.waitForDependencies();
    }

    // ========================================
    // ОЧІКУВАННЯ ІНІЦІАЛІЗАЦІЇ APPSTATE / STORAGE
    // ========================================

    async waitForDependencies() {
        let tries = 0;
        while ((!window.storageManager || !window.appState) && tries < 20) {
            await new Promise(r => setTimeout(r, 300));
            tries++;
        }

        if (!window.storageManager || !window.appState) {
            console.warn('⚠️ MemoryManager: appState або storageManager не готові.');
        }

        this.ready = true;
        await this.loadMemories();
        console.log('✅ Memory Manager готовий');
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ СПОГАДІВ
    // ========================================

    async loadMemories() {
        try {
            let memories = [];

            if (window.storageManager) {
                memories = await storageManager.getMemories();
                console.log(`📦 Завантажено збережених спогадів: ${memories.length}`);
            }

            if (window.appState) {
                appState.agent.memory = Array.isArray(memories) ? memories : [];
            }

            this.updateMemoryStats();
            this.displayMemories();

        } catch (error) {
            console.error('❌ Помилка завантаження спогадів:', error);
        }
    }

    // ========================================
    // ОНОВЛЕННЯ СТАТИСТИКИ
    // ========================================

    updateMemoryStats() {
        const memories = window.appState?.getMemories() || [];

        const totalSpan = document.getElementById('totalMemories');
        const importantSpan = document.getElementById('importantMemories');
        const memoryCountSpan = document.getElementById('memoryCount');

        if (totalSpan) totalSpan.textContent = memories.length;
        if (importantSpan) importantSpan.textContent = memories.filter(m => m.important).length;
        if (memoryCountSpan) memoryCountSpan.textContent = memories.length;
    }

    // ========================================
    // ВІДОБРАЖЕННЯ СПОГАДІВ
    // ========================================

    displayMemories() {
        const list = document.getElementById('memoriesList');
        if (!list) return console.warn('memoriesList element not found');

        const memories = window.appState?.getMemories() || [];

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

        const sorted = [...memories].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        list.innerHTML = sorted.map(m => this.createMemoryCard(m)).join('');
    }

    createMemoryCard(memory) {
        const icon = memory.important ? '⭐' : this.getMemoryIcon(memory.category);
        const date = this.formatDate(memory.timestamp || memory.created);
        const category = memory.category || 'загальне';
        const tags = memory.tags || [];

        const escapeHTML = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        return `
            <div class="memory-card ${memory.important ? 'important' : ''}" data-id="${memory.id}">
                <div class="memory-header">
                    <div class="memory-icon">${icon}</div>
                    <div class="memory-info">
                        <div class="memory-title">${escapeHTML(memory.title)}</div>
                        <div class="memory-meta">
                            <span class="memory-category">${category}</span>
                            <span class="memory-date">${date}</span>
                        </div>
                    </div>
                    <button class="memory-menu-btn" onclick="memoryManager.toggleMemoryMenu(${memory.id})">⋮</button>
                </div>
                <div class="memory-content">${escapeHTML(memory.content)}</div>
                ${tags.length > 0 ? `
                    <div class="memory-tags">
                        ${tags.map(tag => `<span class="memory-tag">${escapeHTML(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="memory-actions" id="memory-menu-${memory.id}" style="display:none;">
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
    // ЗБЕРЕЖЕННЯ СПОГАДУ
    // ========================================

    async saveMemory() {
        const title = document.getElementById('memoryTitle')?.value.trim();
        const content = document.getElementById('memoryContent')?.value.trim();
        const important = document.getElementById('memoryImportant')?.checked || false;

        if (!title || !content) return showToast?.('⚠️ Заповни всі поля!', 'warning');

        const category = this.detectCategory(title, content);
        const tags = this.extractTags(content);

        const memory = {
            id: Date.now(),
            title, content, category, important, tags,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            accessed: 0,
            auto: false
        };

        try {
            if (window.appState) appState.addMemory(memory);
            if (window.storageManager) await storageManager.saveMemory(memory);

            this.updateMemoryStats();
            this.displayMemories();
            this.closeModal('memoryModal');
            showToast?.('✅ Спогад збережено!', 'success');
        } catch (error) {
            console.error('❌ Failed to save memory:', error);
            showToast?.('❌ Помилка збереження спогаду', 'error');
        }
    }

    // ========================================
    // ІНШІ ФУНКЦІЇ (коротка форма)
    // ========================================

    detectCategory(title, content) {
        const t = (title + ' ' + content).toLowerCase();
        if (t.includes('важлив')) return 'важливе';
        if (t.includes('завдан')) return 'завдання';
        if (t.includes('навчи') || t.includes('вивчи')) return 'навчання';
        if (t.includes('особист')) return 'персональне';
        return 'загальне';
    }

    extractTags(text) {
        const tags = (text.match(/#[\wа-яіїє]+/gi) || []).map(t => t.substring(1).toLowerCase());
        return [...new Set(tags)];
    }

    getMemoryIcon(cat) {
        return {
            'загальне': '💭',
            'важливе': '⭐',
            'завдання': '📋',
            'навчання': '📚',
            'персональне': '👤'
        }[cat] || '💭';
    }

    formatDate(date) {
        if (!date) return 'невідомо';
        const d = new Date(date);
        return d.toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    }

    toggleMemoryMenu(id) {
        document.querySelectorAll('.memory-actions').forEach(m => m.style.display = 'none');
        const menu = document.getElementById(`memory-menu-${id}`);
        if (menu) menu.style.display = 'flex';
    }

    closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('active');
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let memoryManager = null;

document.addEventListener('DOMContentLoaded', () => {
    memoryManager = new MemoryManager();

    // Експортуємо глобальні функції
    window.saveMemory = () => memoryManager.saveMemory();
    window.searchMemories = () => memoryManager.displayMemories();
    window.clearMemories = () => memoryManager.clearMemories?.();
    window.exportMemories = () => memoryManager.exportMemories?.();

    console.log('✅ Memory Manager script loaded');
});

window.memoryManager = memoryManager;
