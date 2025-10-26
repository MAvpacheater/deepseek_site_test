// 📚 Library Core - Основна логіка бібліотеки (350 lines)

class LibraryCore {
    constructor() {
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.sortBy = 'date'; // 'date', 'title', 'type'
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        console.log('✅ Library Core initialized');
    }

    setupEventListeners() {
        // Підписатися на зміни в appState
        if (window.appState) {
            appState.on('mode:change', ({ newMode }) => {
                if (newMode === 'library') {
                    this.loadAndDisplay();
                }
            });
        }

        // Пошук
        const searchInput = document.getElementById('librarySearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.display();
                }, 300);
            });
        }

        // Event bus
        if (window.eventBus) {
            eventBus.on('library:refresh', () => this.loadAndDisplay());
            eventBus.on('library:filter', ({ filter }) => this.setFilter(filter));
        }
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ ТА ВІДОБРАЖЕННЯ
    // ========================================

    async loadAndDisplay() {
        try {
            const items = await this.getAllItems();
            this.displayItems(items);
        } catch (error) {
            console.error('Failed to load library:', error);
            this.displayError(error);
        }
    }

    async display() {
        try {
            const items = await this.getAllItems();
            this.displayItems(items);
        } catch (error) {
            console.error('Failed to display library:', error);
            this.displayError(error);
        }
    }

    displayItems(items) {
        const filtered = this.filterAndSortItems(items);
        
        if (window.libraryUI) {
            libraryUI.render(filtered);
        } else {
            this.fallbackRender(filtered);
        }
    }

    displayError(error) {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Помилка завантаження</h3>
                <p>${error.message}</p>
                <button onclick="libraryCore.loadAndDisplay()" class="retry-btn">
                    🔄 Спробувати знову
                </button>
            </div>
        `;
    }

    // ========================================
    // ОТРИМАННЯ ДАНИХ
    // ========================================

    async getAllItems() {
        const items = [];

        try {
            // Розмови
            if (window.storageManager) {
                const conversations = await storageManager.getConversations();
                conversations.forEach(conv => {
                    items.push(this.createConversationItem(conv));
                });

                // Код проекти
                const codeProjects = await storageManager.getCodeProjects();
                codeProjects.forEach(project => {
                    items.push(this.createCodeProjectItem(project));
                });
            }

            console.log(`📚 Знайдено ${items.length} елементів`);

        } catch (error) {
            console.error('Failed to get items:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'library_error',
                    message: 'Failed to load library items',
                    error: error.message,
                    severity: 'medium'
                });
            }
        }

        return items;
    }

    createConversationItem(conv) {
        return {
            id: conv.id,
            type: 'conversation',
            mode: conv.mode || 'gemini',
            title: conv.title || 'Розмова без назви',
            preview: this.getConversationPreview(conv),
            date: conv.createdAt || conv.date,
            favorite: conv.favorite || false,
            tags: conv.tags || [],
            messageCount: conv.messages?.length || 0,
            data: conv
        };
    }

    createCodeProjectItem(project) {
        return {
            id: project.id,
            type: 'code',
            mode: 'deepseek',
            title: project.title || 'Код проект',
            preview: this.getCodePreview(project),
            date: project.createdAt || project.date,
            favorite: project.favorite || false,
            tags: project.tags || [],
            fileCount: project.files ? Object.keys(project.files).length : 0,
            data: project
        };
    }

    getConversationPreview(conv) {
        if (!conv.messages || conv.messages.length === 0) {
            return 'Порожня розмова';
        }

        const firstUserMsg = conv.messages.find(m => 
            m.role === 'user' || (m.parts && m.parts[0]?.text)
        );

        if (firstUserMsg) {
            const text = firstUserMsg.parts?.[0]?.text || firstUserMsg.content || '';
            return text.substring(0, 150) + (text.length > 150 ? '...' : '');
        }

        return 'Немає попереднього перегляду';
    }

    getCodePreview(project) {
        if (!project.files || Object.keys(project.files).length === 0) {
            return 'Немає файлів';
        }

        const fileCount = Object.keys(project.files).length;
        const fileNames = Object.keys(project.files).slice(0, 3).join(', ');
        
        return `${fileCount} файлів: ${fileNames}${fileCount > 3 ? '...' : ''}`;
    }

    // ========================================
    // ФІЛЬТРАЦІЯ ТА СОРТУВАННЯ
    // ========================================

    filterAndSortItems(items) {
        let filtered = [...items];

        // Фільтр за типом
        filtered = this.applyTypeFilter(filtered);

        // Пошук
        filtered = this.applySearch(filtered);

        // Сортування
        filtered = this.applySorting(filtered);

        return filtered;
    }

    applyTypeFilter(items) {
        switch (this.currentFilter) {
            case 'gemini':
                return items.filter(item => item.mode === 'gemini');
            case 'deepseek':
                return items.filter(item => item.mode === 'deepseek');
            case 'code':
                return items.filter(item => item.type === 'code');
            case 'favorites':
                return items.filter(item => item.favorite);
            case 'all':
            default:
                return items;
        }
    }

    applySearch(items) {
        if (!this.searchQuery || this.searchQuery.trim() === '') {
            return items;
        }

        return items.filter(item => {
            const searchText = (
                item.title + ' ' + 
                item.preview + ' ' + 
                (item.tags || []).join(' ')
            ).toLowerCase();
            
            return searchText.includes(this.searchQuery);
        });
    }

    applySorting(items) {
        return items.sort((a, b) => {
            switch (this.sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'type':
                    if (a.type === b.type) {
                        return this.compareByDate(b, a);
                    }
                    return a.type.localeCompare(b.type);
                case 'date':
                default:
                    return this.compareByDate(b, a);
            }
        });
    }

    compareByDate(a, b) {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateA - dateB;
    }

    // ========================================
    // УПРАВЛІННЯ ФІЛЬТРАМИ
    // ========================================

    setFilter(filterType) {
        this.currentFilter = filterType;
        this.updateFilterButtons();
        this.display();
    }

    updateFilterButtons() {
        document.querySelectorAll('.library-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(
            `.filter-btn[onclick*="${this.currentFilter}"]`
        );
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.display();
    }

    // ========================================
    // ДІЇ З ЕЛЕМЕНТАМИ
    // ========================================

    async openItem(id, type) {
        try {
            if (type === 'conversation') {
                await this.loadConversation(id);
            } else if (type === 'code') {
                await this.loadCodeProject(id);
            }
        } catch (error) {
            console.error('Failed to open item:', error);
            if (window.showToast) {
                showToast('❌ Помилка відкриття', 'error');
            }
        }
    }

    async loadConversation(id) {
        const conv = await storageManager.get(
            storageManager.stores.conversations, 
            id
        );

        if (!conv) {
            throw new Error('Розмову не знайдено');
        }

        // Показати прев'ю через preview manager
        if (window.libraryPreview) {
            await libraryPreview.showConversation(conv);
        }
    }

    async loadCodeProject(id) {
        const project = await storageManager.get(
            storageManager.stores.codeFiles, 
            id
        );

        if (!project) {
            throw new Error('Проект не знайдено');
        }

        // Показати прев'ю через preview manager
        if (window.libraryPreview) {
            await libraryPreview.showCodeProject(project);
        }
    }

    async toggleFavorite(id, type) {
        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            const item = await storageManager.get(storeName, id);
            if (!item) return false;

            item.favorite = !item.favorite;
            await storageManager.update(storeName, item);

            this.display();

            const msg = item.favorite ? 
                '⭐ Додано в улюблені' : 
                '☆ Прибрано з улюблених';

            if (window.showToast) {
                showToast(msg, 'success', 2000);
            }

            return true;

        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            return false;
        }
    }

    async exportItem(id, type) {
        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            const item = await storageManager.get(storeName, id);
            if (!item) {
                if (window.showToast) {
                    showToast('❌ Елемент не знайдено', 'error');
                }
                return;
            }

            const blob = new Blob(
                [JSON.stringify(item, null, 2)], 
                { type: 'application/json' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.sanitizeFilename(item.title)}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.showToast) {
                showToast('✅ Експортовано!', 'success');
            }

        } catch (error) {
            console.error('Failed to export item:', error);
            if (window.showToast) {
                showToast('❌ Помилка експорту', 'error');
            }
        }
    }

    async deleteItem(id, type) {
        let confirmed = false;

        if (window.modalManager) {
            confirmed = await modalManager.confirm(
                'Цей елемент буде видалено назавжди!',
                {
                    title: '⚠️ Видалити елемент?',
                    icon: '🗑️',
                    confirmText: 'Так, видалити',
                    cancelText: 'Скасувати',
                    danger: true
                }
            );
        } else {
            confirmed = confirm(
                '⚠️ Видалити цей елемент? Цю дію не можна скасувати!'
            );
        }

        if (!confirmed) return false;

        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            await storageManager.delete(storeName, id);
            this.display();

            if (window.showToast) {
                showToast('✅ Видалено!', 'success');
            }

            return true;

        } catch (error) {
            console.error('Failed to delete item:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
            return false;
        }
    }

    // ========================================
    // FALLBACK RENDER
    // ========================================

    fallbackRender(items) {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        if (items.length === 0) {
            content.innerHTML = this.getEmptyStateHTML();
            return;
        }

        content.innerHTML = items.map(item => 
            this.createItemHTML(item)
        ).join('');
    }

    createItemHTML(item) {
        const icon = this.getItemIcon(item);
        const date = this.formatDate(item.date);
        const favoriteIcon = item.favorite ? '⭐' : '☆';

        return `
            <div class="library-item" data-id="${item.id}" data-type="${item.type}">
                <div class="library-item-header">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <span style="font-size: 24px;">${icon}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div class="library-item-title">${this.escapeHTML(item.title)}</div>
                            <div class="library-item-meta">
                                ${item.type === 'conversation' ? `💬 ${item.messageCount} повідомлень` : `📁 ${item.fileCount} файлів`}
                                • ${date}
                            </div>
                        </div>
                    </div>
                    <button class="library-item-favorite" 
                            onclick="libraryCore.toggleFavorite(${item.id}, '${item.type}')" 
                            title="${item.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені'}">
                        ${favoriteIcon}
                    </button>
                </div>

                <div class="library-item-preview">${this.escapeHTML(item.preview)}</div>

                ${item.tags.length > 0 ? `
                    <div class="library-item-tags">
                        ${item.tags.map(tag => 
                            `<span class="library-tag">${this.escapeHTML(tag)}</span>`
                        ).join('')}
                    </div>
                ` : ''}

                <div class="library-item-actions">
                    <button onclick="libraryCore.openItem(${item.id}, '${item.type}')">
                        👁️ Переглянути
                    </button>
                    <button onclick="libraryCore.exportItem(${item.id}, '${item.type}')">
                        📤 Експорт
                    </button>
                    <button onclick="libraryCore.deleteItem(${item.id}, '${item.type}')">
                        🗑️ Видалити
                    </button>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        const messages = {
            all: {
                icon: '📚',
                title: 'Бібліотека порожня',
                text: 'Збережені розмови та проекти з\'являться тут'
            },
            gemini: {
                icon: '✨',
                title: 'Немає збережених Gemini розмов',
                text: 'Зберігай цікаві розмови натиснувши 💾 в чаті'
            },
            deepseek: {
                icon: '💻',
                title: 'Немає збережених проектів',
                text: 'Зберігай код проекти натиснувши 💾 в DeepSeek'
            },
            favorites: {
                icon: '⭐',
                title: 'Немає улюблених',
                text: 'Додавай важливі елементи в улюблені'
            }
        };

        const msg = messages[this.currentFilter] || messages.all;

        return `
            <div class="empty-state">
                <div class="empty-state-icon">${msg.icon}</div>
                <h3>${msg.title}</h3>
                <p>${msg.text}</p>
            </div>
        `;
    }

    // ========================================
    // UTILITY
    // ========================================

    getItemIcon(item) {
        if (item.type === 'code') return '💻';
        if (item.mode === 'gemini') return '✨';
        if (item.mode === 'deepseek') return '🤖';
        return '💬';
    }

    formatDate(dateString) {
        if (!dateString) return 'Невідомо';

        const date = new Date(dateString);
        const now = Date.now();
        const diff = now - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days < 7) return `${days} дн тому`;

        return date.toLocaleDateString('uk-UA', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
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

    sanitizeFilename(filename) {
        if (window.sanitizer) {
            return sanitizer.sanitizeFilename(filename);
        }
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 50);
    }

    getStats() {
        return {
            currentFilter: this.currentFilter,
            searchQuery: this.searchQuery,
            sortBy: this.sortBy
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const libraryCore = new LibraryCore();

// Експорт
window.libraryCore = libraryCore;
window.LibraryCore = LibraryCore;

// Compatibility functions
window.displayLibrary = () => libraryCore.loadAndDisplay();
window.filterByType = (type) => libraryCore.setFilter(type);

console.log('✅ Library Core loaded');
