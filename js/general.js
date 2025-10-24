// 🎮 General UI Logic - Refactored & Enhanced with Dashboard

class UIManager {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        this.initializeInputs();
        this.initializeShortcuts();
        this.handleResponsive();
        console.log('✅ UI Manager initialized');
    }

    setupEventListeners() {
        // Resize listener
        window.addEventListener('resize', () => this.handleResize());

        // Beforeunload - очистка
        window.addEventListener('beforeunload', () => this.cleanup());

        // Click outside sidebar on mobile
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Підписатися на зміни appState
        if (window.appState) {
            appState.on('mode:change', ({ newMode }) => this.updateModeUI(newMode));
            appState.on('theme:change', () => this.updateThemeUI());
            appState.on('sidebar:toggle', ({ isOpen }) => this.updateSidebarUI(isOpen));
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        // Якщо перейшли з мобільного на десктоп
        if (wasMobile && !this.isMobile) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
            }
        }
    }

    handleOutsideClick(e) {
        if (!this.isMobile) return;

        const sidebar = document.getElementById('sidebar');
        const menuBtn = e.target.closest('.mobile-menu-btn');

        if (sidebar && sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !menuBtn) {
            sidebar.classList.remove('mobile-open');
            if (window.appState) {
                appState.ui.isSidebarOpen = false;
            }
        }
    }

    handleResponsive() {
        // Оновити UI при завантаженні
        this.isMobile = window.innerWidth <= 768;
        
        if (this.isMobile && window.appState) {
            appState.ui.isSidebarOpen = false;
        }
    }

    // ========================================
    // MODE SWITCHING
    // ========================================

    switchMode(mode) {
        if (!mode) {
            console.error('Mode is required');
            return;
        }

        // Оновити в appState
        if (window.appState) {
            appState.setMode(mode);
        }

        // Оновити UI
        this.updateModeUI(mode);

        // Закрити sidebar на мобільних
        if (this.isMobile) {
            this.closeSidebar();
        }

        // Виконати специфічні дії для режимів
        this.handleModeSpecificActions(mode);
    }

    updateModeUI(mode) {
        // Оновити кнопки меню
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.menu-btn[onclick*="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Показати відповідний контент
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });

        const modeElement = document.getElementById(`${mode}Mode`);
        if (modeElement) {
            modeElement.classList.add('active');
        }
    }

    handleModeSpecificActions(mode) {
        try {
            switch (mode) {
                case 'dashboard':
                    // Рендерити Dashboard
                    if (window.dashboardManager) {
                        dashboardManager.render();
                    }
                    break;
                case 'library':
                    if (typeof displayLibrary === 'function') {
                        displayLibrary();
                    }
                    break;
                case 'planner':
                    if (typeof displayPlans === 'function') {
                        displayPlans();
                    }
                    break;
                case 'memory':
                    if (typeof displayMemories === 'function') {
                        displayMemories();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error in mode ${mode}:`, error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'mode_switch_error',
                    message: `Failed to switch to ${mode} mode`,
                    error: error.message,
                    severity: 'medium'
                });
            }
        }
    }

    // ========================================
    // THEME MANAGEMENT
    // ========================================

    toggleTheme() {
        if (window.appState) {
            appState.toggleTheme();
        } else {
            // Fallback
            const body = document.body;
            const newTheme = body.classList.contains('light-theme') ? 'dark' : 'light';
            
            if (newTheme === 'light') {
                body.classList.add('light-theme');
            } else {
                body.classList.remove('light-theme');
            }
            
            localStorage.setItem('theme', newTheme);
            this.updateThemeUI();
        }
    }

    updateThemeUI() {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            const theme = window.appState ? 
                appState.ui.theme : 
                (document.body.classList.contains('light-theme') ? 'light' : 'dark');
            
            icon.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    }

    // ========================================
    // SIDEBAR MANAGEMENT
    // ========================================

    toggleSidebar() {
        if (window.appState) {
            appState.toggleSidebar();
        } else {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('mobile-open');
            }
        }
    }

    updateSidebarUI(isOpen) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (isOpen) {
                sidebar.classList.add('mobile-open');
            } else {
                sidebar.classList.remove('mobile-open');
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        if (window.appState) {
            appState.ui.isSidebarOpen = false;
        }
    }

    // ========================================
    // INPUT INITIALIZATION
    // ========================================

    initializeInputs() {
        const inputs = ['geminiInput', 'deepseekInput', 'imageInput'];

        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;

            // Auto-resize
            input.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 150) + 'px';
            });

            // Ctrl+Enter для відправки
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.handleInputSubmit(inputId);
                }
            });

            // Debounce для auto-save
            let saveTimeout;
            input.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.autoSaveDraft(inputId, input.value);
                }, 2000);
            });
        });
    }

    handleInputSubmit(inputId) {
        try {
            if (inputId === 'geminiInput' && window.geminiChat) {
                geminiChat.sendMessage();
            } else if (inputId === 'deepseekInput' && window.deepseekCoder) {
                deepseekCoder.sendMessage();
            } else if (inputId === 'imageInput' && typeof generateImage === 'function') {
                generateImage();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            if (window.showToast) {
                showToast('❌ Помилка відправки повідомлення', 'error');
            }
        }
    }

    autoSaveDraft(inputId, value) {
        if (!value || value.trim() === '') return;
        
        try {
            localStorage.setItem(`draft_${inputId}`, value);
        } catch (e) {
            console.warn('Failed to save draft:', e);
        }
    }

    loadDrafts() {
        const inputs = ['geminiInput', 'deepseekInput', 'imageInput'];

        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const draft = localStorage.getItem(`draft_${inputId}`);
            
            if (input && draft) {
                input.value = draft;
                // Trigger resize
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            }
        });
    }

    clearDraft(inputId) {
        localStorage.removeItem(`draft_${inputId}`);
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================

    initializeShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ігнорувати якщо focus в input/textarea
            if (e.target.matches('input, textarea')) {
                // Дозволити тільки деякі shortcuts
                if (e.ctrlKey || e.metaKey) {
                    this.handleInputShortcuts(e);
                }
                return;
            }

            this.handleGlobalShortcuts(e);
        });
    }

    handleInputShortcuts(e) {
        // Ctrl/Cmd + S - Зберегти
        if (e.key === 's') {
            e.preventDefault();
            const mode = window.appState ? appState.getMode() : null;
            if ((mode === 'gemini' || mode === 'deepseek') && typeof saveConversation === 'function') {
                saveConversation(mode);
            }
        }
    }

    handleGlobalShortcuts(e) {
        try {
            // Ctrl/Cmd + K - Пошук
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }

            // Ctrl/Cmd + B - Toggle code panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                if (typeof toggleCodePanel === 'function') {
                    toggleCodePanel();
                }
            }

            // Ctrl/Cmd + / - Toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.toggleSidebar();
            }

            // Escape - Закрити модальні вікна
            if (e.key === 'Escape') {
                this.closeAllModals();
                
                const preview = document.getElementById('previewPanel');
                if (preview && preview.classList.contains('active') && typeof togglePreview === 'function') {
                    togglePreview();
                }
            }

            // Alt + цифри для переключення режимів
            if (e.altKey && /^[1-8]$/.test(e.key)) {
                e.preventDefault();
                const modes = ['dashboard', 'gemini', 'deepseek', 'image', 'planner', 'memory', 'library', 'settings'];
                const index = parseInt(e.key) - 1;
                if (modes[index]) {
                    this.switchMode(modes[index]);
                }
            }

        } catch (error) {
            console.error('Error handling shortcut:', error);
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('librarySearch') || 
                           document.getElementById('memorySearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // ========================================
    // CHAT CLEARING
    // ========================================

    clearChat(mode) {
        if (window.modalManager) {
            modalManager.confirm('Очистити історію цього чату?', {
                title: 'Підтвердження',
                icon: '🗑️',
                confirmText: 'Очистити',
                cancelText: 'Скасувати',
                danger: true
            }).then(confirmed => {
                if (confirmed) {
                    this.executeClearChat(mode);
                }
            });
        } else {
            if (!confirm('⚠️ Очистити історію цього чату?')) return;
            this.executeClearChat(mode);
        }
    }

    executeClearChat(mode) {
        try {
            if (mode === 'gemini' && window.geminiChat) {
                geminiChat.clearHistory();
            } else if (mode === 'deepseek' && window.deepseekCoder) {
                deepseekCoder.clearHistory();
            } else if (mode === 'image') {
                this.clearImageGallery();
            }

            if (window.showToast) {
                showToast('✅ Чат очищено!', 'success');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            if (window.showToast) {
                showToast('❌ Помилка очищення чату', 'error');
            }
        }
    }

    clearImageGallery() {
        if (window.appState) {
            appState.clearImages();
        }

        const gallery = document.getElementById('imageGallery');
        if (gallery) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <h3>Генерація зображень</h3>
                    <p>Опиши що хочеш згенерувати</p>
                </div>
            `;
        }
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    showLoading(message = 'Завантаження...') {
        // Використати існуючий loading overlay якщо є
        let overlay = document.getElementById('global-loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
            `;
            
            overlay.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>
                <div style="font-size: 24px; font-weight: 600;" id="loading-message">${message}</div>
                <div style="margin-top: 20px;">
                    <div class="loading-dots">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
        } else {
            const messageEl = document.getElementById('loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // ========================================
    // MODAL MANAGEMENT
    // ========================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ========================================
    // CLEANUP
    // ========================================

    cleanup() {
        // Очистити event listeners якщо є EventManager
        if (window.EventManager) {
            EventManager.removeAll();
        }

        // Зберегти важливі дані
        if (window.appState) {
            appState.saveStats();
        }

        console.log('🧹 UI cleanup completed');
    }

    // ========================================
    // NOTIFICATION HELPERS
    // ========================================

    showSuccessMessage(message) {
        if (window.showToast) {
            showToast(`✅ ${message}`, 'success');
        }
    }

    showErrorMessage(message) {
        if (window.showToast) {
            showToast(`❌ ${message}`, 'error');
        }
    }

    showWarningMessage(message) {
        if (window.showToast) {
            showToast(`⚠️ ${message}`, 'warning');
        }
    }

    showInfoMessage(message) {
        if (window.showToast) {
            showToast(`ℹ️ ${message}`, 'info');
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let uiManager = null;

document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();

    // Завантажити drafts
    uiManager.loadDrafts();

    // Експортувати функції для сумісності
    window.switchMode = (mode) => uiManager.switchMode(mode);
    window.toggleTheme = () => uiManager.toggleTheme();
    window.toggleSidebar = () => uiManager.toggleSidebar();
    window.clearChat = (mode) => uiManager.clearChat(mode);
    window.closeModal = (modalId) => uiManager.closeModal(modalId);
    window.openModal = (modalId) => uiManager.openModal(modalId);
    window.showLoading = (msg) => uiManager.showLoading(msg);
    window.hideLoading = () => uiManager.hideLoading();

    console.log('✅ UI initialized');
});

// Експорт класу
window.UIManager = UIManager;
window.uiManager = uiManager;

// Backward compatibility functions
window.addMessage = function(text, sender, messagesId) {
    const messagesDiv = document.getElementById(messagesId);
    if (!messagesDiv) return;

    let messageElement;
    if (window.sanitizer) {
        messageElement = sanitizer.createMessageElement(text, sender);
    } else {
        messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

window.estimateTokens = function(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 3);
};

window.escapeHTML = function(text) {
    if (window.sanitizer) {
        return sanitizer.escapeHTML(text);
    }
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

console.log('✅ General UI module loaded with Dashboard support');
console.log('💡 Shortcuts: Alt+1 (Dashboard), Alt+2 (Gemini), Alt+3 (DeepSeek)...');
