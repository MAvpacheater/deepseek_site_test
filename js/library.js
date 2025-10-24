// 📚 Library Manager - ВИПРАВЛЕНО для відображення збережених розмов

class LibraryManager {
    constructor() {
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        console.log('✅ Library Manager initialized');
    }

    setupEventListeners() {
        // Підписатися на зміни в appState
        if (window.appState) {
            appState.on('mode:change', ({ newMode }) => {
                if (newMode === 'library') {
                    this.display();
                }
            });
        }

        // Пошук
        const searchInput = document.getElementById('librarySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.display();
            });
        }
    }

    // ========================================
    // ВІДОБРАЖЕННЯ БІБЛІОТЕКИ
    // ========================================

    async display() {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        try {
            // Отримати всі збережені елементи
            const items = await this.getAllItems();

            // Фільтрувати
            const filtered = this.filterItems(items);

            if (filtered.length === 0) {
                content.innerHTML = this.renderEmptyState();
                return;
            }

            // Відобразити елементи
            content.innerHTML = filtered.map(item => this.renderItem(item)).join('');

            console.log(`📚 Відображено ${filtered.length} елементів бібліотеки`);

        } catch (error) {
            console.error('Failed to display library:', error);
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <h3>Помилка завантаження</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // ========================================
    // ОТРИМАННЯ ДАНИХ
    // ========================================

    async getAllItems() {
        const items = [];

        try {
            // 1. Збережені розмови з StorageManager
            if (window.storageManager) {
                const conversations = await storageManager.getConversations();
                conversations.forEach(conv => {
                    items.push({
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
                    });
                });
            }

            // 2. Збережені код-проекти
            if (window.storageManager) {
                const codeProjects = await storageManager.getCodeProjects();
                codeProjects.forEach(project => {
                    items.push({
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
                    });
                });
            }

            // Сортувати за датою (новіші спочатку)
            items.sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                return dateB - dateA;
            });

            console.log(`📚 Знайдено ${items.length} елементів у бібліотеці`);

        } catch (error) {
            console.error('Failed to get library items:', error);
        }

        return items;
    }

    getConversationPreview(conv) {
        if (!conv.messages || conv.messages.length === 0) {
            return 'Порожня розмова';
        }

        // Знайти перше повідомлення користувача
        const firstUserMsg = conv.messages.find(m => 
            m.role === 'user' || 
            (m.parts && m.parts[0]?.text)
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
    // ФІЛЬТРАЦІЯ
    // ========================================

    filterItems(items) {
        let filtered = [...items];

        // Фільтр за типом
        if (this.currentFilter === 'gemini') {
            filtered = filtered.filter(item => item.mode === 'gemini');
        } else if (this.currentFilter === 'deepseek') {
            filtered = filtered.filter(item => item.mode === 'deepseek');
        } else if (this.currentFilter === 'favorites') {
            filtered = filtered.filter(item => item.favorite);
        }

        // Пошук
        if (this.searchQuery) {
            filtered = filtered.filter(item => {
                const searchText = (
                    item.title + ' ' + 
                    item.preview + ' ' + 
                    item.tags.join(' ')
                ).toLowerCase();
                
                return searchText.includes(this.searchQuery);
            });
        }

        return filtered;
    }

    setFilter(filterType) {
        this.currentFilter = filterType;

        // Оновити UI кнопок
        document.querySelectorAll('.library-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.filter-btn[onclick*="${filterType}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Оновити відображення
        this.display();
    }

    // ========================================
    // РЕНДЕРИНГ
    // ========================================

    renderItem(item) {
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
                    <button class="library-item-favorite" onclick="libraryManager.toggleFavorite(${item.id}, '${item.type}')" title="${item.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені'}">
                        ${favoriteIcon}
                    </button>
                </div>

                <div class="library-item-preview">${this.escapeHTML(item.preview)}</div>

                ${item.tags.length > 0 ? `
                    <div class="library-item-tags">
                        ${item.tags.map(tag => `<span class="library-tag">${this.escapeHTML(tag)}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="library-item-actions">
                    <button onclick="libraryManager.openItem(${item.id}, '${item.type}')">
                        📖 Відкрити
                    </button>
                    <button onclick="libraryManager.exportItem(${item.id}, '${item.type}')">
                        📤 Експорт
                    </button>
                    <button onclick="libraryManager.deleteItem(${item.id}, '${item.type}')">
                        🗑️ Видалити
                    </button>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
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
    // ДІЇ З ЕЛЕМЕНТАМИ
    // ========================================

    async openItem(id, type) {
        try {
            if (type === 'conversation') {
                await this.openConversation(id);
            } else if (type === 'code') {
                await this.openCodeProject(id);
            }
        } catch (error) {
            console.error('Failed to open item:', error);
            if (window.showToast) {
                showToast('❌ Помилка відкриття', 'error');
            }
        }
    }

    async openConversation(id) {
        const conv = await storageManager.get(storageManager.stores.conversations, id);
        if (!conv) {
            if (window.showToast) {
                showToast('❌ Розмову не знайдено', 'error');
            }
            return;
        }

        const mode = conv.mode || 'gemini';

        // Показати модальне вікно з попередженням
        if (window.modalManager) {
            const confirmed = await modalManager.confirm(
                `Завантажити розмову "${conv.title}"?\n\nПоточна історія чату буде замінена.`,
                {
                    title: '📖 Відкрити розмову',
                    icon: '💬',
                    confirmText: 'Відкрити',
                    cancelText: 'Скасувати'
                }
            );

            if (!confirmed) return;
        }

        // Завантажити розмову в appState
        if (window.appState) {
            if (mode === 'gemini') {
                appState.chat.gemini.history = conv.messages || [];
            } else if (mode === 'deepseek') {
                appState.chat.deepseek.history = conv.messages || [];
            }
        }

        // Перемкнутися на відповідний режим
        if (typeof switchMode === 'function') {
            switchMode(mode);
        }

        // Рендерити повідомлення
        if (mode === 'gemini' && window.geminiChat) {
            geminiChat.renderMessages();
        } else if (mode === 'deepseek' && window.deepseekCoder) {
            deepseekCoder.renderMessages();
        }

        if (window.showToast) {
            showToast('✅ Розмову відкрито!', 'success');
        }
    }

    async openCodeProject(id) {
        const project = await storageManager.get(storageManager.stores.codeFiles, id);
        if (!project || !project.files) {
            if (window.showToast) {
                showToast('❌ Проект не знайдено', 'error');
            }
            return;
        }

        // Показати модальне вікно з попередженням
        if (window.modalManager) {
            const confirmed = await modalManager.confirm(
                `Завантажити проект "${project.title}"?\n\nПоточні файли коду будуть замінені.`,
                {
                    title: '📖 Відкрити проект',
                    icon: '💻',
                    confirmText: 'Відкрити',
                    cancelText: 'Скасувати'
                }
            );

            if (!confirmed) return;
        }

        // Завантажити файли в appState
        if (window.appState) {
            appState.chat.deepseek.codeFiles = project.files;
            
            // Встановити контекст проекту
            if (project.context) {
                appState.setProjectContext(project.context);
            }
        }

        // Перемкнутися на DeepSeek
        if (typeof switchMode === 'function') {
            switchMode('deepseek');
        }

        // Відобразити файли
        if (window.deepseekCoder) {
            deepseekCoder.displayCodeFiles();
        }

        if (window.showToast) {
            showToast('✅ Проект відкрито!', 'success');
        }
    }

    async toggleFavorite(id, type) {
        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            const item = await storageManager.get(storeName, id);
            if (!item) return;

            item.favorite = !item.favorite;
            await storageManager.update(storeName, item);

            // Оновити відображення
            this.display();

            const msg = item.favorite ? 
                '⭐ Додано в улюблені' : 
                '☆ Прибрано з улюблених';

            if (window.showToast) {
                showToast(msg, 'success', 2000);
            }

        } catch (error) {
            console.error('Failed to toggle favorite:', error);
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

            // Експортувати як JSON
            const blob = new Blob([JSON.stringify(item, null, 2)], { 
                type: 'application/json' 
            });
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
        // Використати modalManager для підтвердження
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
            // Fallback на стандартний confirm
            confirmed = window.confirm('⚠️ Видалити цей елемент? Цю дію не можна скасувати!');
        }

        if (!confirmed) return;

        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            await storageManager.delete(storeName, id);

            // Оновити відображення
            this.display();

            if (window.showToast) {
                showToast('✅ Видалено!', 'success');
            }

        } catch (error) {
            console.error('Failed to delete item:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
        }
    }

    // ========================================
    // ЗБЕРЕЖЕННЯ ПОТОЧНОЇ РОЗМОВИ
    // ========================================

    async saveCurrentConversation(mode, title = null) {
        try {
            if (!window.appState) {
                throw new Error('AppState not available');
            }

            let messages = [];
            let messageCount = 0;

            if (mode === 'gemini') {
                messages = appState.getGeminiHistory();
                messageCount = messages.length;
            } else if (mode === 'deepseek') {
                messages = appState.getDeepSeekHistory();
                messageCount = messages.length;
            }

            if (messageCount === 0) {
                if (window.showToast) {
                    showToast('⚠️ Немає повідомлень для збереження', 'warning');
                }
                return null;
            }

            // Згенерувати назву якщо немає
            if (!title) {
                const firstUserMsg = messages.find(m => 
                    m.role === 'user' || 
                    (m.parts && m.parts[0]?.text)
                );
                
                if (firstUserMsg) {
                    const text = firstUserMsg.parts?.[0]?.text || firstUserMsg.content || '';
                    title = text.substring(0, 50) + (text.length > 50 ? '...' : '');
                } else {
                    title = `${mode === 'gemini' ? 'Gemini' : 'DeepSeek'} розмова`;
                }
            }

            const conversation = {
                mode: mode,
                title: title,
                messages: messages,
                date: new Date().toISOString(),
                favorite: false,
                tags: [],
                messageCount: messageCount
            };

            const id = await storageManager.saveConversation(conversation);

            if (window.showToast) {
                showToast('✅ Розмову збережено в бібліотеку!', 'success');
            }

            return id;

        } catch (error) {
            console.error('Failed to save conversation:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження розмови', 'error');
            }
            return null;
        }
    }

    async saveCurrentCodeProject(title = null) {
        try {
            if (!window.appState) {
                throw new Error('AppState not available');
            }

            const files = appState.getAllCodeFiles();
            if (Object.keys(files).length === 0) {
                if (window.showToast) {
                    showToast('⚠️ Немає файлів для збереження', 'warning');
                }
                return null;
            }

            // Згенерувати назву
            if (!title) {
                const projectContext = appState.getProjectContext();
                if (projectContext && projectContext.repo) {
                    title = projectContext.repo;
                } else {
                    title = `Код проект - ${new Date().toLocaleDateString('uk-UA')}`;
                }
            }

            const project = {
                title: title,
                files: files,
                context: appState.getProjectContext(),
                date: new Date().toISOString(),
                favorite: false,
                tags: [],
                fileCount: Object.keys(files).length
            };

            const id = await storageManager.saveCodeProject(project);

            if (window.showToast) {
                showToast('✅ Проект збережено в бібліотеку!', 'success');
            }

            return id;

        } catch (error) {
            console.error('Failed to save code project:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження проекту', 'error');
            }
            return null;
        }
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
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
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let libraryManager = null;

document.addEventListener('DOMContentLoaded', () => {
    libraryManager = new LibraryManager();

    // Експортувати функції
    window.displayLibrary = () => libraryManager.display();
    window.filterByType = (type) => libraryManager.setFilter(type);
    window.filterLibrary = () => libraryManager.display();
    window.saveConversation = async (mode) => {
        if (window.modalManager) {
            // Показати модальне вікно для назви
            const title = await modalManager.prompt('Назва розмови:', {
                title: '💾 Зберегти розмову',
                icon: '💬',
                placeholder: 'Введи назву...',
                defaultValue: `${mode === 'gemini' ? 'Gemini' : 'DeepSeek'} - ${new Date().toLocaleDateString('uk-UA')}`
            });

            if (title) {
                await libraryManager.saveCurrentConversation(mode, title);
            }
        } else {
            const title = prompt('💾 Назва розмови:', `${mode === 'gemini' ? 'Gemini' : 'DeepSeek'} - ${new Date().toLocaleDateString('uk-UA')}`);
            if (title) {
                await libraryManager.saveCurrentConversation(mode, title);
            }
        }
    };

    window.saveCodeProject = async () => {
        if (window.modalManager) {
            const title = await modalManager.prompt('Назва проекту:', {
                title: '💾 Зберегти проект',
                icon: '💻',
                placeholder: 'Введи назву...',
                defaultValue: `Код проект - ${new Date().toLocaleDateString('uk-UA')}`
            });

            if (title) {
                await libraryManager.saveCurrentCodeProject(title);
            }
        } else {
            const title = prompt('💾 Назва проекту:', `Код проект - ${new Date().toLocaleDateString('uk-UA')}`);
            if (title) {
                await libraryManager.saveCurrentCodeProject(title);
            }
        }
    };

    console.log('✅ Library module loaded (FIXED)');
});

// Експорт класу
window.LibraryManager = LibraryManager;
window.libraryManager = libraryManager;
