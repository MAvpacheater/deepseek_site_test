// 📚 Library Manager - З МОДАЛЬНИМ ПРЕВ'Ю РОЗМОВИ

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
        this.createPreviewModal();
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
    // СТВОРЕННЯ МОДАЛЬНОГО ВІКНА ПРЕВ'Ю
    // ========================================

    createPreviewModal() {
        // Перевірити чи вже існує
        if (document.getElementById('conversationPreviewModal')) return;

        const modal = document.createElement('div');
        modal.id = 'conversationPreviewModal';
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-modal-overlay" onclick="libraryManager.closePreview()"></div>
            <div class="preview-modal-content">
                <div class="preview-modal-header">
                    <h2 id="previewTitle">📖 Перегляд розмови</h2>
                    <button class="preview-modal-close" onclick="libraryManager.closePreview()">✕</button>
                </div>
                <div class="preview-modal-body" id="previewBody">
                    <!-- Тут буде контент розмови -->
                </div>
                <div class="preview-modal-footer">
                    <button class="preview-btn preview-btn-secondary" onclick="libraryManager.closePreview()">
                        Закрити
                    </button>
                    <button class="preview-btn preview-btn-primary" id="loadConversationBtn">
                        📥 Завантажити в чат
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Закривати на Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePreview();
            }
        });
    }

    // ========================================
    // ПОКАЗАТИ ПРЕВ'Ю РОЗМОВИ
    // ========================================

    async showConversationPreview(id) {
        const conv = await storageManager.get(storageManager.stores.conversations, id);
        if (!conv) {
            if (window.showToast) {
                showToast('❌ Розмову не знайдено', 'error');
            }
            return;
        }

        const modal = document.getElementById('conversationPreviewModal');
        const titleEl = document.getElementById('previewTitle');
        const bodyEl = document.getElementById('previewBody');
        const loadBtn = document.getElementById('loadConversationBtn');

        // Встановити заголовок
        titleEl.textContent = `📖 ${conv.title}`;

        // Рендерити повідомлення
        bodyEl.innerHTML = this.renderConversationMessages(conv);

        // Налаштувати кнопку завантаження
        loadBtn.onclick = async () => {
            const confirmed = await this.confirmLoadConversation(conv);
            if (confirmed) {
                await this.loadConversationToChat(conv);
                this.closePreview();
            }
        };

        // Показати модальне вікно
        modal.classList.add('active');
        
        // Прокрутити до початку
        setTimeout(() => {
            bodyEl.scrollTop = 0;
        }, 100);
    }

    renderConversationMessages(conv) {
        if (!conv.messages || conv.messages.length === 0) {
            return `
                <div class="preview-empty-state">
                    <div class="preview-empty-icon">💬</div>
                    <p>Порожня розмова</p>
                </div>
            `;
        }

        const mode = conv.mode || 'gemini';
        const modeIcon = mode === 'gemini' ? '✨' : '💻';
        const modeColor = mode === 'gemini' ? '#58a6ff' : '#3fb950';

        let html = `
            <div class="preview-info">
                <span class="preview-badge" style="background: ${modeColor}20; color: ${modeColor};">
                    ${modeIcon} ${mode === 'gemini' ? 'Gemini' : 'DeepSeek'}
                </span>
                <span class="preview-meta">
                    💬 ${conv.messages.length} повідомлень
                </span>
                <span class="preview-meta">
                    📅 ${this.formatDate(conv.createdAt || conv.date)}
                </span>
            </div>
        `;

        conv.messages.forEach((msg, index) => {
            const isUser = msg.role === 'user';
            const content = msg.parts?.[0]?.text || msg.content || '';
            
            if (!content) return;

            html += `
                <div class="preview-message ${isUser ? 'preview-message-user' : 'preview-message-assistant'}">
                    <div class="preview-message-avatar">
                        ${isUser ? '👤' : '🤖'}
                    </div>
                    <div class="preview-message-content">
                        <div class="preview-message-header">
                            <span class="preview-message-role">
                                ${isUser ? 'Користувач' : (mode === 'gemini' ? 'Gemini' : 'DeepSeek')}
                            </span>
                            <span class="preview-message-number">#${index + 1}</span>
                        </div>
                        <div class="preview-message-text">${this.escapeHTML(content)}</div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    async confirmLoadConversation(conv) {
        if (window.modalManager) {
            return await modalManager.confirm(
                `Завантажити розмову "${conv.title}" в чат?\n\nПоточна історія чату буде замінена.`,
                {
                    title: '📥 Завантажити розмову',
                    icon: '💬',
                    confirmText: 'Завантажити',
                    cancelText: 'Скасувати'
                }
            );
        } else {
            return confirm(`Завантажити розмову "${conv.title}"?\n\nПоточна історія буде замінена.`);
        }
    }

    async loadConversationToChat(conv) {
        const mode = conv.mode || 'gemini';

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
            showToast('✅ Розмову завантажено в чат!', 'success');
        }
    }

    closePreview() {
        const modal = document.getElementById('conversationPreviewModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ========================================
    // ПОКАЗАТИ ПРЕВ'Ю КОД-ПРОЕКТУ
    // ========================================

    async showCodeProjectPreview(id) {
        const project = await storageManager.get(storageManager.stores.codeFiles, id);
        if (!project || !project.files) {
            if (window.showToast) {
                showToast('❌ Проект не знайдено', 'error');
            }
            return;
        }

        const modal = document.getElementById('conversationPreviewModal');
        const titleEl = document.getElementById('previewTitle');
        const bodyEl = document.getElementById('previewBody');
        const loadBtn = document.getElementById('loadConversationBtn');

        titleEl.textContent = `💻 ${project.title}`;
        bodyEl.innerHTML = this.renderCodeProjectFiles(project);

        loadBtn.onclick = async () => {
            const confirmed = await this.confirmLoadCodeProject(project);
            if (confirmed) {
                await this.loadCodeProjectToEditor(project);
                this.closePreview();
            }
        };

        modal.classList.add('active');
        setTimeout(() => bodyEl.scrollTop = 0, 100);
    }

    renderCodeProjectFiles(project) {
        const files = project.files || {};
        const fileCount = Object.keys(files).length;

        if (fileCount === 0) {
            return `
                <div class="preview-empty-state">
                    <div class="preview-empty-icon">📁</div>
                    <p>Немає файлів</p>
                </div>
            `;
        }

        let html = `
            <div class="preview-info">
                <span class="preview-badge" style="background: rgba(63, 185, 80, 0.2); color: #3fb950;">
                    💻 Code Project
                </span>
                <span class="preview-meta">
                    📁 ${fileCount} файлів
                </span>
                <span class="preview-meta">
                    📅 ${this.formatDate(project.createdAt || project.date)}
                </span>
            </div>
            <div class="preview-files-list">
        `;

        Object.entries(files).forEach(([filename, file]) => {
            const language = file.language || 'text';
            const lines = (file.code || '').split('\n').length;
            
            html += `
                <div class="preview-file-item">
                    <div class="preview-file-header">
                        <span class="preview-file-icon">📄</span>
                        <span class="preview-file-name">${this.escapeHTML(filename)}</span>
                        <span class="preview-file-meta">${language} • ${lines} рядків</span>
                    </div>
                    <pre class="preview-code"><code>${this.escapeHTML(file.code || '').substring(0, 500)}${file.code?.length > 500 ? '\n...' : ''}</code></pre>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    async confirmLoadCodeProject(project) {
        if (window.modalManager) {
            return await modalManager.confirm(
                `Завантажити проект "${project.title}"?\n\nПоточні файли коду будуть замінені.`,
                {
                    title: '📥 Завантажити проект',
                    icon: '💻',
                    confirmText: 'Завантажити',
                    cancelText: 'Скасувати'
                }
            );
        } else {
            return confirm(`Завантажити проект "${project.title}"?\n\nПоточні файли будуть замінені.`);
        }
    }

    async loadCodeProjectToEditor(project) {
        // Завантажити файли в appState
        if (window.appState) {
            appState.chat.deepseek.codeFiles = project.files;
            
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
            showToast('✅ Проект завантажено!', 'success');
        }
    }

    // ========================================
    // ВІДОБРАЖЕННЯ БІБЛІОТЕКИ
    // ========================================

    async display() {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        try {
            const items = await this.getAllItems();
            const filtered = this.filterItems(items);

            if (filtered.length === 0) {
                content.innerHTML = this.renderEmptyState();
                return;
            }

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

        if (this.currentFilter === 'gemini') {
            filtered = filtered.filter(item => item.mode === 'gemini');
        } else if (this.currentFilter === 'deepseek') {
            filtered = filtered.filter(item => item.mode === 'deepseek');
        } else if (this.currentFilter === 'favorites') {
            filtered = filtered.filter(item => item.favorite);
        }

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

        document.querySelectorAll('.library-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.filter-btn[onclick*="${filterType}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

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
                    <button onclick="libraryManager.openItemPreview(${item.id}, '${item.type}')">
                        👁️ Переглянути
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

    async openItemPreview(id, type) {
        try {
            if (type === 'conversation') {
                await this.showConversationPreview(id);
            } else if (type === 'code') {
                await this.showCodeProjectPreview(id);
            }
        } catch (error) {
            console.error('Failed to open preview:', error);
            if (window.showToast) {
                showToast('❌ Помилка відкриття', 'error');
            }
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
            confirmed = window.confirm('⚠️ Видалити цей елемент? Цю дію не можна скасувати!');
        }

        if (!confirmed) return;

        try {
            const storeName = type === 'conversation' ? 
                storageManager.stores.conversations : 
                storageManager.stores.codeFiles;

            await storageManager.delete(storeName, id);
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

    window.displayLibrary = () => libraryManager.display();
    window.filterByType = (type) => libraryManager.setFilter(type);
    window.filterLibrary = () => libraryManager.display();

    console.log('✅ Library module loaded (WITH PREVIEW MODAL)');
});

window.LibraryManager = LibraryManager;
window.libraryManager = libraryManager;
