// 🍞 Toast Notifications - Красиві сповіщення (ОНОВЛЕНО)

class ToastManager {
    constructor() {
        this.toasts = new Map();
        this.maxToasts = 5;
        this.defaultDuration = 5000;
        this.positions = {
            'top-right': { top: '20px', right: '20px' },
            'top-left': { top: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
        };
        this.defaultPosition = 'top-right';
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.injectStyles();
        this.createContainer();
        console.log('✅ Toast Manager initialized');
    }

    injectStyles() {
        if (document.getElementById('toast-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-container {
                position: fixed;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
                max-width: 400px;
            }

            .toast {
                background: var(--bg-secondary, #161b22);
                border: 2px solid var(--border-color, #30363d);
                border-radius: 12px;
                padding: 16px 20px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                max-width: 100%;
                pointer-events: all;
                cursor: pointer;
                animation: toastSlideIn 0.3s ease;
                transition: all 0.3s ease;
            }

            .toast:hover {
                transform: translateX(-4px);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
            }

            .toast.removing {
                animation: toastSlideOut 0.3s ease forwards;
            }

            /* Toast типи */
            .toast.success {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                border-color: #22c55e;
            }

            .toast.error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border-color: #ef4444;
            }

            .toast.warning {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-color: #f59e0b;
            }

            .toast.info {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                border-color: #3b82f6;
            }

            .toast-icon {
                font-size: 24px;
                flex-shrink: 0;
                animation: iconBounce 0.5s ease;
            }

            .toast-content {
                flex: 1;
                color: white;
                font-size: 14px;
                line-height: 1.5;
                font-weight: 500;
            }

            .toast-close {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
                transition: all 0.2s ease;
                opacity: 0.7;
            }

            .toast-close:hover {
                background: rgba(255, 255, 255, 0.2);
                opacity: 1;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 10px 10px;
                animation: progressBar linear forwards;
            }

            /* Анімації */
            @keyframes toastSlideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes toastSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            @keyframes iconBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            @keyframes progressBar {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .toast-container {
                    max-width: calc(100% - 40px);
                    width: 100%;
                }

                .toast {
                    min-width: unset;
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    createContainer() {
        if (document.getElementById('toast-container')) return;

        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        
        // Встановити позицію
        Object.assign(container.style, this.positions[this.defaultPosition]);
        
        document.body.appendChild(container);
    }

    // ========================================
    // ПОКАЗАТИ TOAST
    // ========================================

    show(message, type = 'info', duration = this.defaultDuration, options = {}) {
        const {
            icon = this.getDefaultIcon(type),
            closable = true,
            position = this.defaultPosition,
            onClick = null,
            onClose = null,
            persistent = false
        } = options;

        // Перевірити ліміт
        if (this.toasts.size >= this.maxToasts) {
            const oldestToast = Array.from(this.toasts.values())[0];
            this.remove(oldestToast.id);
        }

        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Створити toast
        const toast = this.createToast({
            id: toastId,
            message,
            type,
            icon,
            closable,
            duration,
            persistent,
            onClick,
            onClose
        });

        // Додати в контейнер
        const container = this.getContainer(position);
        container.appendChild(toast);

        // Зберегти
        this.toasts.set(toastId, {
            id: toastId,
            element: toast,
            timeout: null,
            position
        });

        // Автовидалення
        if (duration > 0 && !persistent) {
            const timeout = setTimeout(() => {
                this.remove(toastId);
            }, duration);
            
            this.toasts.get(toastId).timeout = timeout;
        }

        return toastId;
    }

    createToast(config) {
        const {
            id,
            message,
            type,
            icon,
            closable,
            duration,
            persistent,
            onClick,
            onClose
        } = config;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icon;

        // Content
        const content = document.createElement('div');
        content.className = 'toast-content';
        
        // Санітизувати повідомлення
        if (window.sanitizer && typeof sanitizer.escapeHTML === 'function') {
            content.textContent = message;
        } else {
            content.textContent = message;
        }

        // Close button
        let closeBtn = null;
        if (closable) {
            closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '✕';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.remove(id);
                if (onClose) onClose();
            };
        }

        // Progress bar
        let progressBar = null;
        if (duration > 0 && !persistent) {
            progressBar = document.createElement('div');
            progressBar.className = 'toast-progress';
            progressBar.style.animationDuration = `${duration}ms`;
        }

        // Зібрати toast
        toast.appendChild(iconSpan);
        toast.appendChild(content);
        if (closeBtn) toast.appendChild(closeBtn);
        if (progressBar) toast.appendChild(progressBar);

        // Click handler
        if (onClick) {
            toast.style.cursor = 'pointer';
            toast.onclick = (e) => {
                if (e.target !== closeBtn) {
                    onClick();
                    this.remove(id);
                }
            };
        } else {
            toast.onclick = () => this.remove(id);
        }

        return toast;
    }

    // ========================================
    // ВИДАЛИТИ TOAST
    // ========================================

    remove(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;

        const { element, timeout } = toastData;

        // Скасувати timeout
        if (timeout) {
            clearTimeout(timeout);
        }

        // Анімація видалення
        element.classList.add('removing');

        setTimeout(() => {
            element.remove();
            this.toasts.delete(toastId);
        }, 300);
    }

    removeAll() {
        this.toasts.forEach((_, toastId) => {
            this.remove(toastId);
        });
    }

    // ========================================
    // ТИПИ TOAST
    // ========================================

    success(message, duration, options) {
        return this.show(message, 'success', duration, options);
    }

    error(message, duration, options) {
        return this.show(message, 'error', duration, options);
    }

    warning(message, duration, options) {
        return this.show(message, 'warning', duration, options);
    }

    info(message, duration, options) {
        return this.show(message, 'info', duration, options);
    }

    // ========================================
    // HELPERS
    // ========================================

    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    getContainer(position) {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            this.createContainer();
            container = document.getElementById('toast-container');
        }

        // Оновити позицію якщо потрібно
        if (position && position !== this.defaultPosition) {
            Object.assign(container.style, this.positions[position]);
        }

        return container;
    }

    setPosition(position) {
        if (!this.positions[position]) {
            console.warn(`Unknown position: ${position}`);
            return;
        }

        this.defaultPosition = position;
        const container = document.getElementById('toast-container');
        if (container) {
            Object.assign(container.style, this.positions[position]);
        }
    }

    setMaxToasts(max) {
        this.maxToasts = max;
    }

    // ========================================
    // СПЕЦІАЛЬНІ TOAST
    // ========================================

    loading(message = 'Завантаження...', options = {}) {
        return this.show(message, 'info', 0, {
            ...options,
            icon: '⏳',
            persistent: true,
            closable: false
        });
    }

    promise(promise, messages = {}) {
        const {
            loading = 'Завантаження...',
            success = 'Успішно!',
            error = 'Помилка!'
        } = messages;

        const toastId = this.loading(loading);

        promise
            .then((result) => {
                this.remove(toastId);
                this.success(success);
                return result;
            })
            .catch((err) => {
                this.remove(toastId);
                this.error(typeof err === 'string' ? err : error);
                throw err;
            });

        return promise;
    }

    custom(config) {
        return this.show(config.message, config.type || 'info', config.duration, {
            icon: config.icon,
            closable: config.closable,
            position: config.position,
            onClick: config.onClick,
            onClose: config.onClose,
            persistent: config.persistent
        });
    }

    // ========================================
    // ДОДАТКОВІ МЕТОДИ
    // ========================================

    update(toastId, options = {}) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return false;

        const { element } = toastData;
        const content = element.querySelector('.toast-content');
        const icon = element.querySelector('.toast-icon');

        if (options.message && content) {
            content.textContent = options.message;
        }

        if (options.icon && icon) {
            icon.textContent = options.icon;
        }

        if (options.type) {
            element.className = `toast ${options.type}`;
        }

        return true;
    }

    getActiveCount() {
        return this.toasts.size;
    }

    hasToast(toastId) {
        return this.toasts.has(toastId);
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const toastManager = new ToastManager();

// Експорт
window.toastManager = toastManager;

// Backward compatibility з errorHandler
window.showToast = (message, type = 'info', duration = 5000) => {
    return toastManager.show(message, type, duration);
};

// Додаткові функції
window.showSuccessToast = (message, duration) => toastManager.success(message, duration);
window.showErrorToast = (message, duration) => toastManager.error(message, duration);
window.showWarningToast = (message, duration) => toastManager.warning(message, duration);
window.showInfoToast = (message, duration) => toastManager.info(message, duration);
window.showLoadingToast = (message) => toastManager.loading(message);
window.removeToast = (id) => toastManager.remove(id);
window.updateToast = (id, options) => toastManager.update(id, options);

console.log('✅ Toast Manager initialized (Full Updated)');
