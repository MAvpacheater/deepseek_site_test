// 🎮 UI Controller - Управління інтерфейсом редактора коду

class UIController {
    constructor() {
        this.isCodePanelOpen = false;
        this.currentFileIndex = 0;
        this.tabsContainer = null;
        this.codeContainer = null;
        this.fileSelector = null;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadState();
        console.log('✅ UI Controller initialized');
    }

    cacheElements() {
        this.tabsContainer = document.getElementById('fileTabs');
        this.codeContainer = document.getElementById('codeContent');
        this.fileSelector = document.getElementById('fileSelector');
        this.codeSection = document.getElementById('codeSection');
        this.chatSection = document.getElementById('deepseekChatSection');
    }

    setupEventListeners() {
        // File selector change
        if (this.fileSelector) {
            this.fileSelector.addEventListener('change', (e) => {
                this.switchToFile(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Підписатися на зміни файлів
        if (window.fileManager) {
            window.fileManager.onFileChanged = (filename) => {
                this.refreshDisplay();
            };
        }
    }

    loadState() {
        // Відновити стан панелі
        const savedState = localStorage.getItem('codePanel_open');
        if (savedState === 'true') {
            this.openCodePanel();
        }
    }

    // ========================================
    // CODE PANEL УПРАВЛІННЯ
    // ========================================

    toggleCodePanel() {
        if (this.isCodePanelOpen) {
            this.closeCodePanel();
        } else {
            this.openCodePanel();
        }
    }

    openCodePanel() {
        if (!this.codeSection || !this.chatSection) return;

        this.codeSection.classList.remove('collapsed');
        this.chatSection.style.width = '55%';
        this.isCodePanelOpen = true;

        localStorage.setItem('codePanel_open', 'true');
        
        if (window.eventBus) {
            eventBus.emit('codePanel:opened');
        }
    }

    closeCodePanel() {
        if (!this.codeSection || !this.chatSection) return;

        this.codeSection.classList.add('collapsed');
        this.chatSection.style.width = '100%';
        this.isCodePanelOpen = false;

        localStorage.setItem('codePanel_open', 'false');
        
        if (window.eventBus) {
            eventBus.emit('codePanel:closed');
        }
    }

    // ========================================
    // ВІДОБРАЖЕННЯ ФАЙЛІВ
    // ========================================

    displayFiles() {
        if (!this.codeContainer) return;

        const files = window.fileManager ? 
            fileManager.getAllFiles() : 
            {};

        if (Object.keys(files).length === 0) {
            this.showEmptyState();
            return;
        }

        // Відкрити панель якщо закрита
        if (!this.isCodePanelOpen) {
            this.openCodePanel();
        }

        // Оновити tabs
        this.renderTabs(files);

        // Оновити selector
        this.renderSelector(files);

        // Оновити код
        this.renderCode(files);
    }

    renderTabs(files) {
        if (!this.tabsContainer) return;

        this.tabsContainer.innerHTML = '';

        const activeFile = window.fileManager?.getActiveFilename();

        Object.keys(files).forEach((filename, index) => {
            const tab = this.createTab(filename, files[filename], filename === activeFile);
            this.tabsContainer.appendChild(tab);
        });
    }

    createTab(filename, file, isActive) {
        const tab = document.createElement('div');
        tab.className = 'file-tab' + (isActive ? ' active' : '');
        tab.dataset.filename = filename;

        if (file.modified) {
            const dot = document.createElement('span');
            dot.style.color = '#f59e0b';
            dot.textContent = '● ';
            tab.appendChild(dot);
        }

        const name = document.createElement('span');
        name.textContent = filename;
        tab.appendChild(name);

        tab.addEventListener('click', () => {
            this.switchToFile(filename);
        });

        return tab;
    }

    renderSelector(files) {
        if (!this.fileSelector) return;

        const activeFile = window.fileManager?.getActiveFilename();

        this.fileSelector.innerHTML = '<option value="">Виберіть файл...</option>';

        Object.keys(files).forEach(filename => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            if (filename === activeFile) {
                option.selected = true;
            }
            this.fileSelector.appendChild(option);
        });
    }

    renderCode(files) {
        if (!this.codeContainer) return;

        this.codeContainer.innerHTML = '';

        const activeFile = window.fileManager?.getActiveFilename();

        Object.entries(files).forEach(([filename, file], index) => {
            const isActive = (activeFile === filename) || (index === 0 && !activeFile);
            const fileDiv = this.createFileDisplay(filename, file, isActive);
            this.codeContainer.appendChild(fileDiv);
        });
    }

    createFileDisplay(filename, file, isActive) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (isActive ? ' active' : '');
        fileDiv.dataset.filename = filename;

        const codeBlock = this.createCodeBlock(filename, file);
        fileDiv.appendChild(codeBlock);

        return fileDiv;
    }

    createCodeBlock(filename, file) {
        const block = document.createElement('div');
        block.className = 'code-block';

        // Header
        const header = this.createCodeBlockHeader(filename, file);
        block.appendChild(header);

        // Code content
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = `language-${file.language || 'plaintext'}`;

        // Highlight code
        if (window.sanitizer) {
            code.innerHTML = sanitizer.highlightCode(file.code, file.language);
        } else {
            code.textContent = file.code;
        }

        pre.appendChild(code);
        block.appendChild(pre);

        // Highlight with Prism if available
        if (typeof Prism !== 'undefined') {
            setTimeout(() => Prism.highlightAllUnder(block), 0);
        }

        return block;
    }

    createCodeBlockHeader(filename, file) {
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // Info section
        const info = document.createElement('div');
        info.className = 'code-block-info';

        const lang = document.createElement('span');
        lang.className = 'code-block-lang';
        lang.textContent = file.language || 'unknown';
        info.appendChild(lang);

        const name = document.createElement('span');
        name.className = 'code-block-name';
        name.textContent = filename;
        info.appendChild(name);

        if (file.modified) {
            const modified = document.createElement('span');
            modified.style.color = '#f59e0b';
            modified.style.fontSize = '12px';
            modified.textContent = '● змінено';
            info.appendChild(modified);
        }

        header.appendChild(info);

        // Buttons section
        const buttons = this.createActionButtons(filename);
        header.appendChild(buttons);

        return header;
    }

    createActionButtons(filename) {
        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.gap = '8px';
        buttons.style.flexWrap = 'wrap';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️ Редагувати';
        editBtn.addEventListener('click', () => this.editFile(filename));
        buttons.appendChild(editBtn);

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Копіювати';
        copyBtn.addEventListener('click', () => this.copyFile(filename));
        buttons.appendChild(copyBtn);

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '💾 Завантажити';
        downloadBtn.addEventListener('click', () => this.downloadFile(filename));
        buttons.appendChild(downloadBtn);

        return buttons;
    }

    showEmptyState() {
        if (!this.codeContainer) return;

        this.codeContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>Немає файлів</h3>
                <p>Опиши що хочеш створити</p>
            </div>
        `;

        if (this.tabsContainer) {
            this.tabsContainer.innerHTML = '';
        }

        if (this.fileSelector) {
            this.fileSelector.innerHTML = '<option value="">Виберіть файл...</option>';
        }
    }

    refreshDisplay() {
        this.displayFiles();
    }

    // ========================================
    // ФАЙЛОВІ ОПЕРАЦІЇ
    // ========================================

    switchToFile(filename) {
        if (!filename || !window.fileManager) return;

        try {
            fileManager.setActiveFile(filename);

            // Оновити активні елементи
            document.querySelectorAll('.file-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filename === filename);
            });

            document.querySelectorAll('.code-file').forEach(file => {
                file.classList.toggle('active', file.dataset.filename === filename);
            });

            if (this.fileSelector) {
                this.fileSelector.value = filename;
            }

        } catch (error) {
            console.error('Failed to switch file:', error);
        }
    }

    editFile(filename) {
        const file = window.fileManager?.getFile(filename);
        if (!file) return;

        const newCode = prompt(`✏️ Редагувати ${filename}:`, file.code);

        if (newCode !== null && newCode !== file.code) {
            try {
                fileManager.updateFile(filename, newCode);
                this.refreshDisplay();
                
                if (window.showToast) {
                    showToast('✅ Файл оновлено!', 'success');
                }
            } catch (error) {
                console.error('Failed to update file:', error);
                if (window.showToast) {
                    showToast('❌ Помилка оновлення', 'error');
                }
            }
        }
    }

    copyFile(filename) {
        const file = window.fileManager?.getFile(filename);
        if (!file) return;

        navigator.clipboard.writeText(file.code).then(() => {
            if (window.showToast) {
                showToast('✅ Код скопійовано!', 'success', 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            if (window.showToast) {
                showToast('❌ Помилка копіювання', 'error');
            }
        });
    }

    downloadFile(filename) {
        if (window.fileManager) {
            fileManager.exportFile(filename, 'download');
            
            if (window.showToast) {
                showToast('✅ Файл завантажено!', 'success', 2000);
            }
        }
    }

    // ========================================
    // НАВІГАЦІЯ
    // ========================================

    navigateToPrevious() {
        const files = window.fileManager?.getFilesList() || [];
        if (files.length === 0) return;

        this.currentFileIndex = (this.currentFileIndex - 1 + files.length) % files.length;
        this.switchToFile(files[this.currentFileIndex]);
    }

    navigateToNext() {
        const files = window.fileManager?.getFilesList() || [];
        if (files.length === 0) return;

        this.currentFileIndex = (this.currentFileIndex + 1) % files.length;
        this.switchToFile(files[this.currentFileIndex]);
    }

    // ========================================
    // КЛАВІАТУРНІ СКОРОЧЕННЯ
    // ========================================

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + B - Toggle code panel
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.toggleCodePanel();
        }

        // Alt + Left/Right - Navigate files
        if (e.altKey) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigateToPrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateToNext();
            }
        }
    }

    // ========================================
    // LOADING STATE
    // ========================================

    showLoading() {
        if (this.codeContainer) {
            this.codeContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px;">
                    <div class="loading-dots">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                </div>
            `;
        }
    }

    hideLoading() {
        this.refreshDisplay();
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const uiController = new UIController();

// Глобальні функції для сумісності
window.toggleCodePanel = () => uiController.toggleCodePanel();
window.switchFile = (filename) => uiController.switchToFile(filename);
window.displayCodeFiles = () => uiController.displayFiles();
window.navigateToPreviousFile = () => uiController.navigateToPrevious();
window.navigateToNextFile = () => uiController.navigateToNext();

window.uiController = uiController;
window.UIController = UIController;

console.log('✅ UI Controller loaded');
