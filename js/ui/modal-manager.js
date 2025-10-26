// 🪟 Modal Manager - Красиві модальні вікна замість alert/confirm

class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.init();
    }

    init() {
        this.injectStyles();
        this.createModalContainer();
        this.setupKeyboardHandlers();
        console.log('✅ Modal Manager initialized');
    }

    // ========================================
    // STYLES
    // ========================================

    injectStyles() {
        if (document.getElementById('modal-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-manager-styles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                animation: fadeIn 0.2s ease forwards;
                padding: 20px;
            }

            .modal-box {
                background: var(--bg-secondary, #161b22);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
                border: 2px solid var(--border-color, #30363d);
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9) translateY(20px);
                animation: modalSlideIn 0.3s ease forwards;
            }

            .modal-header {
                padding: 24px;
                border-bottom: 1px solid var(--border-color, #30363d);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .modal-icon {
                font-size: 32px;
                flex-shrink: 0;
            }

            .modal-title {
                flex: 1;
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary, #e6edf3);
                margin: 0;
            }

            .modal-close {
                background: transparent;
                border: none;
                color: var(--text-secondary, #8b949e);
                font-size: 24px;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                background: var(--bg-hover, #30363d);
                color: var(--text-primary, #e6edf3);
            }

            .modal-body {
                padding: 24px;
                color: var(--text-primary, #e6edf3);
                line-height: 1.6;
            }

            .modal-body p {
                margin: 0 0 12px 0;
            }

            .modal-body p:last-child {
                margin-bottom: 0;
            }

            .modal-footer {
                padding: 20px 24px;
                border-top: 1px solid var(--border-color, #30363d);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .modal-btn-primary {
                background: linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3);
            }

            .modal-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(88, 166, 255, 0.4);
            }

            .modal-btn-danger {
                background: linear-gradient(135deg, #f85149 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(248, 81, 73, 0.3);
            }

            .modal-btn-danger:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(248, 81, 73, 0.4);
            }

            .modal-btn-secondary {
                background: var(--bg-card, #21262d);
                color: var(--text-primary, #e6edf3);
                border: 1px solid var(--border-color, #30363d);
            }

            .modal-btn-secondary:hover {
                background: var(--bg-hover, #30363d);
                border-color: var(--accent-primary, #58a6ff);
            }

            .modal-input-group {
                margin-bottom: 16px;
            }

            .modal-input-group label {
                display: block;
                color: var(--text-primary, #e6edf3);
                font-weight: 500;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .modal-input-group input,
            .modal-input-group textarea,
            .modal-input-group select {
                width: 100%;
                padding: 10px 12px;
                background: var(--bg-primary, #0d1117);
                border: 2px solid var(--border-color, #30363d);
                border-radius: 8px;
                color: var(--text-primary, #e6edf3);
                font-size: 14px;
                font-family: inherit;
                transition: all 0.2s ease;
            }

            .modal-input-group input:focus,
            .modal-input-group textarea:focus,
            .modal-input-group select:focus {
                outline: none;
                border-color: var(--accent-primary, #58a6ff);
                box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
            }

            .modal-input-group textarea {
                min-height: 100px;
                resize: vertical;
            }

            .modal-input-group small {
                display: block;
                color: var(--text-secondary, #8b949e);
                font-size: 12px;
                margin-top: 4px;
            }

            @keyframes fadeIn {
                to { opacity: 1; }
            }

            @keyframes modalSlideIn {
                to {
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }

            .modal-shake {
                animation: shake 0.3s ease;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .modal-box {
                    max-width: 95%;
                    margin: 10px;
                }

                .modal-header {
                    padding: 20px;
                }

                .modal-body {
                    padding: 20px;
                }

                .modal-footer {
                    padding: 16px 20px;
                    flex-direction: column;
                }

                .modal-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // ========================================
    // CONTAINER
    // ========================================

    createModalContainer() {
        if (document.getElementById('modal-container')) return;

        const container = document.createElement('div');
        container.id = 'modal-container';
        document.body.appendChild(container);
    }

    // ========================================
    // ALERT (інформаційне повідомлення)
    // ========================================

    alert(message, options = {}) {
        const {
            title = 'Повідомлення',
            icon = 'ℹ️',
            confirmText = 'Зрозуміло',
            type = 'info'
        } = options;

        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                icon,
                message,
                type,
                buttons: [
                    {
                        text: confirmText,
                        className: 'modal-btn-primary',
                        onClick: () => {
                            this.closeModal(modal);
                            resolve(true);
                        }
                    }
                ]
            });

            this.showModal(modal);
        });
    }

    // ========================================
    // CONFIRM (підтвердження)
    // ========================================

    confirm(message, options = {}) {
        const {
            title = 'Підтвердження',
            icon = '❓',
            confirmText = 'Так',
            cancelText = 'Скасувати',
            danger = false
        } = options;

        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                icon,
                message,
                type: danger ? 'danger' : 'confirm',
                buttons: [
                    {
                        text: cancelText,
                        className: 'modal-btn-secondary',
                        onClick: () => {
                            this.closeModal(modal);
                            resolve(false);
                        }
                    },
                    {
                        text: confirmText,
                        className: danger ? 'modal-btn-danger' : 'modal-btn-primary',
                        onClick: () => {
                            this.closeModal(modal);
                            resolve(true);
                        }
                    }
                ]
            });

            this.showModal(modal);
        });
    }

    // ========================================
    // PROMPT (введення тексту)
    // ========================================

    prompt(message, options = {}) {
        const {
            title = 'Введіть дані',
            icon = '✏️',
            defaultValue = '',
            placeholder = '',
            confirmText = 'Підтвердити',
            cancelText = 'Скасувати',
            multiline = false,
            required = false,
            validator = null
        } = options;

        return new Promise((resolve) => {
            const inputId = 'modal-prompt-input-' + Date.now();
            
            const bodyContent = `
                <p>${message}</p>
                <div class="modal-input-group">
                    ${multiline ? 
                        `<textarea id="${inputId}" placeholder="${placeholder}" rows="4">${defaultValue}</textarea>` :
                        `<input type="text" id="${inputId}" placeholder="${placeholder}" value="${defaultValue}">`
                    }
                </div>
            `;

            const modal = this.createModal({
                title,
                icon,
                bodyHTML: bodyContent,
                type: 'prompt',
                buttons: [
                    {
                        text: cancelText,
                        className: 'modal-btn-secondary',
                        onClick: () => {
                            this.closeModal(modal);
                            resolve(null);
                        }
                    },
                    {
                        text: confirmText,
                        className: 'modal-btn-primary',
                        onClick: () => {
                            const input = document.getElementById(inputId);
                            const value = input.value.trim();

                            // Валідація
                            if (required && !value) {
                                this.shakeModal(modal);
                                input.focus();
                                return;
                            }

                            if (validator && !validator(value)) {
                                this.shakeModal(modal);
                                input.focus();
                                return;
                            }

                            this.closeModal(modal);
                            resolve(value || null);
                        }
                    }
                ]
            });

            this.showModal(modal);

            // Фокус на input
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    if (!multiline) {
                        input.select();
                    }
                }
            }, 100);
        });
    }

    // ========================================
    // SELECT (вибір зі списку)
    // ========================================

    select(message, options = {}) {
        const {
            title = 'Виберіть опцію',
            icon = '📋',
            choices = [],
            defaultValue = null,
            confirmText = 'Вибрати',
            cancelText = 'Скасувати'
        } = options;

        return new Promise((resolve) => {
            const selectId = 'modal-select-' + Date.now();
            
            const bodyContent = `
                <p>${message}</p>
                <div class="modal-input-group">
                    <select id="${selectId}">
                        ${choices.map(choice => {
                            const value = typeof choice === 'object' ? choice.value : choice;
                            const label = typeof choice === 'object' ? choice.label : choice;
                            const selected = value === defaultValue ? 'selected' : '';
                            return `<option value="${value}" ${selected}>${label}</option>`;
                        }).join('')}
                    </select>
                </div>
            `;

            const modal = this.createModal({
                title,
                icon,
                bodyHTML: bodyContent,
                type: 'select',
                buttons: [
                    {
                        text: cancelText,
                        className: 'modal-btn-secondary',
                        onClick: () => {
                            this.closeModal(modal);
                            resolve(null);
                        }
                    },
                    {
                        text: confirmText,
                        className: 'modal-btn-primary',
                        onClick: () => {
                            const select = document.getElementById(selectId);
                            const value = select.value;
                            this.closeModal(modal);
                            resolve(value);
                        }
                    }
                ]
            });

            this.showModal(modal);
        });
    }

    // ========================================
    // СТВОРЕННЯ МОДАЛЬНОГО ВІКНА
    // ========================================

    createModal(config) {
        const {
            title = 'Повідомлення',
            icon = 'ℹ️',
            message = '',
            bodyHTML = null,
            type = 'info',
            buttons = [],
            closable = true
        } = config;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const box = document.createElement('div');
        box.className = 'modal-box';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <span class="modal-icon">${icon}</span>
            <h3 class="modal-title">${title}</h3>
            ${closable ? '<button class="modal-close" data-action="close">✕</button>' : ''}
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (bodyHTML) {
            body.innerHTML = bodyHTML;
        } else {
            body.innerHTML = `<p>${message}</p>`;
        }

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-btn ${btn.className || 'modal-btn-secondary'}`;
            button.textContent = btn.text;
            button.onclick = btn.onClick;
            footer.appendChild(button);
        });

        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(footer);
        overlay.appendChild(box);

        // Event listeners
        if (closable) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    buttons[0]?.onClick();
                }
            });

            const closeBtn = header.querySelector('[data-action="close"]');
            if (closeBtn) {
                closeBtn.onclick = () => buttons[0]?.onClick();
            }
        }

        return overlay;
    }

    // ========================================
    // ПОКАЗАТИ / ЗАКРИТИ
    // ========================================

    showModal(modal) {
        const container = document.getElementById('modal-container');
        container.appendChild(modal);
        this.activeModals.add(modal);

        // Block body scroll
        if (this.activeModals.size === 1) {
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (!modal) return;

        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            this.activeModals.delete(modal);

            // Restore body scroll
            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }
        }, 200);
    }

    closeAllModals() {
        this.activeModals.forEach(modal => this.closeModal(modal));
    }

    shakeModal(modal) {
        const box = modal.querySelector('.modal-box');
        if (box) {
            box.classList.add('modal-shake');
            setTimeout(() => {
                box.classList.remove('modal-shake');
            }, 300);
        }
    }

    // ========================================
    // KEYBOARD HANDLERS
    // ========================================

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                // Закрити останнє модальне вікно
                const lastModal = Array.from(this.activeModals).pop();
                const cancelBtn = lastModal.querySelector('.modal-btn-secondary');
                if (cancelBtn) {
                    cancelBtn.click();
                }
            }

            // Enter для підтвердження
            if (e.key === 'Enter' && e.ctrlKey && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals).pop();
                const confirmBtn = lastModal.querySelector('.modal-btn-primary');
                if (confirmBtn) {
                    confirmBtn.click();
                }
            }
        });
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const modalManager = new ModalManager();

// Override standard functions
window.alert = (message) => modalManager.alert(message);
window.confirm = (message) => modalManager.confirm(message);
window.prompt = (message, defaultValue) => modalManager.prompt(message, { defaultValue });

// Export additional functions
window.modalManager = modalManager;
window.showAlert = (message, options) => modalManager.alert(message, options);
window.showConfirm = (message, options) => modalManager.confirm(message, options);
window.showPrompt = (message, options) => modalManager.prompt(message, options);
window.showSelect = (message, options) => modalManager.select(message, options);

console.log('✅ Modal Manager initialized - alert/confirm/prompt replaced');
