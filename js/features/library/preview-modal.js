// 📖 Library Preview Modal - Модальне вікно для перегляду збережених елементів (300 lines)

class LibraryPreviewModal {
    constructor() {
        this.modalId = 'libraryPreviewModal';
        this.currentItem = null;
        this.currentType = null;
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.createModal();
        this.setupEventListeners();
        console.log('✅ Library Preview Modal initialized');
    }

    createModal() {
        // Перевірити чи модальне вікно вже існує
        if (document.getElementById(this.modalId)) return;

        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'library-preview-modal';
        modal.innerHTML = `
            <div class="library-preview-overlay" data-action="close"></div>
            <div class="library-preview-container">
                <div class="library-preview-header">
                    <div class="library-preview-title-section">
                        <h2 id="libraryPreviewTitle">📖 Перегляд</h2>
                        <div id="libraryPreviewMeta" class="library-preview-meta"></div>
                    </div>
                    <button class="library-preview-close" data-action="close" title="Закрити">✕</button>
                </div>
                
                <div class="library-preview-body" id="libraryPreviewBody">
                    <!-- Контент тут -->
                </div>
                
                <div class="library-preview-footer">
                    <button class="library-btn library-btn-secondary" data-action="close">
                        Закрити
                    </button>
                    <button class="library-btn library-btn-primary" id="libraryLoadBtn">
                        <span id="libraryLoadBtnIcon">📥</span>
                        <span id="libraryLoadBtnText">Завантажити</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    setupEventListeners() {
        // Закриття модального вікна
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="close"]')) {
                this.close();
            }
        });

        // Escape для закриття
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });

        // Load button
        const loadBtn = document.getElementById('libraryLoadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.handleLoad();
            });
        }
    }

    // ========================================
    // ПОКАЗАТИ РОЗМОВУ
    // ========================================

    async showConversation(conversation) {
        if (!conversation) return;

        this.currentItem = conversation;
        this.currentType = 'conversation';

        const modal = document.getElementById(this.modalId);
        const titleEl = document.getElementById('libraryPreviewTitle');
        const metaEl = document.getElementById('libraryPreviewMeta');
        const bodyEl = document.getElementById('libraryPreviewBody');
        const loadBtn = document.getElementById('libraryLoadBtn');

        // Встановити заголовок
        titleEl.textContent = `📖 ${conversation.title || 'Розмова без назви'}`;

        // Мета-інформація
        const mode = conversation.mode || 'gemini';
        const modeIcon = mode === 'gemini' ? '✨' : '💻';
        const modeColor = mode === 'gemini' ? '#58a6ff' : '#3fb950';
        const messageCount = conversation.messages?.length || 0;
        const date = this.formatDate(conversation.createdAt || conversation.date);

        metaEl.innerHTML = `
            <span class="library-preview-badge" style="background: ${modeColor}20; color: ${modeColor};">
                ${modeIcon} ${mode === 'gemini' ? 'Gemini' : 'DeepSeek'}
            </span>
            <span class="library-preview-stat">💬 ${messageCount} повідомлень</span>
            <span class="library-preview-stat">📅 ${date}</span>
        `;

        // Рендерити повідомлення
        bodyEl.innerHTML = this.renderConversationMessages(conversation);

        // Налаштувати кнопку завантаження
        if (loadBtn) {
            const loadBtnIcon = document.getElementById('libraryLoadBtnIcon');
            const loadBtnText = document.getElementById('libraryLoadBtnText');
            if (loadBtnIcon) loadBtnIcon.textContent = '📥';
            if (loadBtnText) loadBtnText.textContent = 'Завантажити в чат';
        }

        // Показати модальне вікно
        this.open();

        // Прокрутити до початку
        setTimeout(() => {
            bodyEl.scrollTop = 0;
        }, 100);
    }

    renderConversationMessages(conv) {
        if (!conv.messages || conv.messages.length === 0) {
            return this.renderEmptyState('💬', 'Порожня розмова');
        }

        let html = '';

        conv.messages.forEach((msg, index) => {
            const isUser = msg.role === 'user';
            const content = msg.parts?.[0]?.text || msg.content || '';
            
            if (!content) return;

            const avatar = isUser ? '👤' : '🤖';
            const role = isUser ? 'Користувач' : (conv.mode === 'gemini' ? 'Gemini' : 'DeepSeek');

            html += `
                <div class="library-preview-message ${isUser ? 'user' : 'assistant'}">
                    <div class="library-preview-message-avatar">${avatar}</div>
                    <div class="library-preview-message-content">
                        <div class="library-preview-message-header">
                            <span class="library-preview-message-role">${role}</span>
                            <span class="library-preview-message-number">#${index + 1}</span>
                        </div>
                        <div class="library-preview-message-text">${this.escapeHTML(content)}</div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // ========================================
    // ПОКАЗАТИ КОД ПРОЕКТ
    // ========================================

    async showCodeProject(project) {
        if (!project) return;

        this.currentItem = project;
        this.currentType = 'code';

        const modal = document.getElementById(this.modalId);
        const titleEl = document.getElementById('libraryPreviewTitle');
        const metaEl = document.getElementById('libraryPreviewMeta');
        const bodyEl = document.getElementById('libraryPreviewBody');
        const loadBtn = document.getElementById('libraryLoadBtn');

        // Встановити заголовок
        titleEl.textContent = `💻 ${project.title || 'Код проект'}`;

        // Мета-інформація
        const fileCount = project.files ? Object.keys(project.files).length : 0;
        const date = this.formatDate(project.createdAt || project.date);

        metaEl.innerHTML = `
            <span class="library-preview-badge" style="background: rgba(63, 185, 80, 0.2); color: #3fb950;">
                💻 Code Project
            </span>
            <span class="library-preview-stat">📁 ${fileCount} файлів</span>
            <span class="library-preview-stat">📅 ${date}</span>
        `;

        // Рендерити файли
        bodyEl.innerHTML = this.renderCodeProjectFiles(project);

        // Налаштувати кнопку завантаження
        if (loadBtn) {
            const loadBtnIcon = document.getElementById('libraryLoadBtnIcon');
            const loadBtnText = document.getElementById('libraryLoadBtnText');
            if (loadBtnIcon) loadBtnIcon.textContent = '💻';
            if (loadBtnText) loadBtnText.textContent = 'Відкрити в редакторі';
        }

        // Показати модальне вікно
        this.open();

        // Прокрутити до початку
        setTimeout(() => {
            bodyEl.scrollTop = 0;
        }, 100);
    }

    renderCodeProjectFiles(project) {
        const files = project.files || {};
        const fileCount = Object.keys(files).length;

        if (fileCount === 0) {
            return this.renderEmptyState('📁', 'Немає файлів');
        }

        let html = '<div class="library-preview-files">';

        Object.entries(files).forEach(([filename, file]) => {
            const language = file.language || 'text';
            const lines = (file.code || '').split('\n').length;
            const size = this.formatFileSize(file.code?.length || 0);
            const preview = (file.code || '').substring(0, 500);
            const hasMore = file.code?.length > 500;

            html += `
                <div class="library-preview-file">
                    <div class="library-preview-file-header">
                        <span class="library-preview-file-icon">📄</span>
                        <span class="library-preview-file-name">${this.escapeHTML(filename)}</span>
                        <span class="library-preview-file-meta">${language} • ${lines} рядків • ${size}</span>
                    </div>
                    <pre class="library-preview-code"><code class="language-${language}">${this.escapeHTML(preview)}${hasMore ? '\n\n// ...' : ''}</code></pre>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ В ЧАТ / РЕДАКТОР
    // ========================================

    async handleLoad() {
        if (!this.currentItem || !this.currentType) return;

        if (this.currentType === 'conversation') {
            await this.loadConversation();
        } else if (this.currentType === 'code') {
            await this.loadCodeProject();
        }
    }

    async loadConversation() {
        const conv = this.currentItem;
        const mode = conv.mode || 'gemini';

        // Підтвердження
        const confirmed = await this.confirmLoad(
            `Завантажити розмову "${conv.title}" в чат?`,
            'Поточна історія чату буде замінена.'
        );

        if (!confirmed) return;

        try {
            // Завантажити в appState
            if (window.appState) {
                if (mode === 'gemini') {
                    appState.chat.gemini.history = conv.messages || [];
                    appState.chat.gemini.messages = conv.messages || [];
                } else if (mode === 'deepseek') {
                    appState.chat.deepseek.history = conv.messages || [];
                    appState.chat.deepseek.messages = conv.messages || [];
                }
            }

            // Закрити модальне вікно
            this.close();

            // Перемкнутися на відповідний режим
            if (typeof switchMode === 'function') {
                switchMode(mode);
            }

            // Рендерити повідомлення
            if (mode === 'gemini' && window.geminiChat) {
                geminiChat.renderMessages();
            } else if (mode === 'deepseek' && window.deepseekChat) {
                deepseekChat.renderMessages();
            }

            if (window.showToast) {
                showToast('✅ Розмову завантажено в чат!', 'success');
            }

        } catch (error) {
            console.error('Failed to load conversation:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження розмови', 'error');
            }
        }
    }

    async loadCodeProject() {
        const project = this.currentItem;

        // Підтвердження
        const confirmed = await this.confirmLoad(
            `Завантажити проект "${project.title}"?`,
            'Поточні файли коду будуть замінені.'
        );

        if (!confirmed) return;

        try {
            // Завантажити файли в appState
            if (window.appState) {
                appState.chat.deepseek.codeFiles = project.files || {};
                
                if (project.context) {
                    appState.setProjectContext(project.context);
                }
            }

            // Закрити модальне вікно
            this.close();

            // Перемкнутися на DeepSeek
            if (typeof switchMode === 'function') {
                switchMode('deepseek');
            }

            // Відобразити файли
            if (window.uiController) {
                uiController.displayFiles();
            } else if (typeof displayCodeFiles === 'function') {
                displayCodeFiles();
            }

            if (window.showToast) {
                showToast('✅ Проект завантажено!', 'success');
            }

        } catch (error) {
            console.error('Failed to load code project:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження проекту', 'error');
            }
        }
    }

    async confirmLoad(title, message) {
        if (window.modalManager) {
            return await modalManager.confirm(
                `${title}\n\n${message}`,
                {
                    title: '📥 Підтвердження',
                    icon: '💾',
                    confirmText: 'Завантажити',
                    cancelText: 'Скасувати'
                }
            );
        }

        return confirm(`${title}\n\n${message}`);
    }

    // ========================================
    // УПРАВЛІННЯ МОДАЛЬНИМ ВІКНОМ
    // ========================================

    open() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Очистити поточний елемент
            this.currentItem = null;
            this.currentType = null;
        }
    }

    isOpen() {
        const modal = document.getElementById(this.modalId);
        return modal && modal.classList.contains('active');
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    renderEmptyState(icon, text) {
        return `
            <div class="library-preview-empty">
                <div class="library-preview-empty-icon">${icon}</div>
                <p class="library-preview-empty-text">${text}</p>
            </div>
        `;
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHTML(text) {
        if (!text) return '';
        if (window.sanitizer && typeof sanitizer.escapeHTML === 'function') {
            return sanitizer.escapeHTML(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const libraryPreview = new LibraryPreviewModal();

// Експорт
window.libraryPreview = libraryPreview;
window.LibraryPreviewModal = LibraryPreviewModal;

console.log('✅ Library Preview Modal loaded');
