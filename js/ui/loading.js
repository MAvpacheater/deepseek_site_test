// ⏳ Loading Manager - Індикатори завантаження

class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.injectStyles();
        console.log('✅ Loading Manager initialized');
    }

    injectStyles() {
        if (document.getElementById('loading-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            .loading-content {
                text-align: center;
                color: white;
            }

            .loading-spinner {
                width: 64px;
                height: 64px;
                margin: 0 auto 24px;
                position: relative;
            }

            .loading-spinner-ring {
                width: 100%;
                height: 100%;
                border: 4px solid transparent;
                border-top-color: var(--accent-primary, #58a6ff);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-text {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
                color: white;
            }

            .loading-subtext {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
            }

            .loading-progress {
                width: 300px;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                margin: 20px auto 0;
                overflow: hidden;
            }

            .loading-progress-bar {
                height: 100%;
                background: var(--accent-primary, #58a6ff);
                width: 0%;
                transition: width 0.3s ease;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;

        document.head.appendChild(styles);
    }

    // ========================================
    // ПОКАЗАТИ LOADING
    // ========================================

    show(options = {}) {
        const {
            text = 'Завантаження...',
            subtext = '',
            progress = false,
            id = 'default'
        } = options;

        // Перевірити чи вже є
        if (this.activeLoaders.has(id)) {
            return this.update(id, options);
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.dataset.loaderId = id;

        const content = document.createElement('div');
        content.className = 'loading-content';

        // Spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="loading-spinner-ring"></div>';

        // Text
        const textEl = document.createElement('div');
        textEl.className = 'loading-text';
        textEl.textContent = text;

        // Subtext
        const subtextEl = document.createElement('div');
        subtextEl.className = 'loading-subtext';
        subtextEl.textContent = subtext;

        content.appendChild(spinner);
        content.appendChild(textEl);
        if (subtext) content.appendChild(subtextEl);

        // Progress bar
        if (progress) {
            const progressEl = document.createElement('div');
            progressEl.className = 'loading-progress';
            progressEl.innerHTML = '<div class="loading-progress-bar"></div>';
            content.appendChild(progressEl);
        }

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        this.activeLoaders.set(id, {
            overlay,
            textEl,
            subtextEl,
            progressBar: progress ? overlay.querySelector('.loading-progress-bar') : null
        });

        // Block scroll
        if (this.activeLoaders.size === 1) {
            document.body.style.overflow = 'hidden';
        }

        return id;
    }

    // ========================================
    // ОНОВИТИ
    // ========================================

    update(id, options = {}) {
        const loader = this.activeLoaders.get(id);
        if (!loader) return false;

        const { text, subtext, progress } = options;

        if (text !== undefined && loader.textEl) {
            loader.textEl.textContent = text;
        }

        if (subtext !== undefined && loader.subtextEl) {
            loader.subtextEl.textContent = subtext;
        }

        if (progress !== undefined && loader.progressBar) {
            loader.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }

        return true;
    }

    // ========================================
    // ПРИХОВАТИ
    // ========================================

    hide(id = 'default') {
        const loader = this.activeLoaders.get(id);
        if (!loader) return false;

        loader.overlay.style.opacity = '0';
        
        setTimeout(() => {
            loader.overlay.remove();
            this.activeLoaders.delete(id);

            // Restore scroll
            if (this.activeLoaders.size === 0) {
                document.body.style.overflow = '';
            }
        }, 200);

        return true;
    }

    hideAll() {
        this.activeLoaders.forEach((_, id) => {
            this.hide(id);
        });
    }

    // ========================================
    // HELPERS
    // ========================================

    isActive(id = 'default') {
        return this.activeLoaders.has(id);
    }

    getActiveCount() {
        return this.activeLoaders.size;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const loadingManager = new LoadingManager();

// Експорт
window.loadingManager = loadingManager;

// Backward compatibility
window.showLoading = (text, subtext) => loadingManager.show({ text, subtext });
window.hideLoading = () => loadingManager.hide();
window.updateLoading = (text, subtext) => loadingManager.update('default', { text, subtext });

console.log('✅ Loading Manager initialized');
