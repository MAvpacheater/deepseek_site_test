// 🎮 UI Controller - Управління інтерфейсом редактора коду (FIXED)

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

        this.codeSection.style.display = 'flex';
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

        this.codeSection.style.display = 'none';
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
        if (!this.codeContainer) {
            console.error('❌ codeContainer not found');
            return;
        }

        const files = window.fileManager ? 
            fileManager.getAllFiles() : 
            (window.appState ? appState.getAllCodeFiles() : {});

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
        tab.style.cssText = `
            padding: 10px 16px;
            background: ${isActive ? 'var(--bg-secondary)' : 'transparent'};
            border-bottom: 2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'};
            color: ${isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'};
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        `;

        if (file.modified) {
            const dot = document.createElement('span');
            dot.style.cssText = 'color: #f59e0b; font-size: 16px;';
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
        fileDiv.style.display = isActive ? 'block' : 'none';

        const codeBlock = this.createCodeBlock(filename, file);
        fileDiv.appendChild(codeBlock);

        return fileDiv;
    }

    createCodeBlock(filename, file) {
        const block = document.createElement('div');
        block.className = 'code-block';
        block.style.cssText = `
            background: var(--bg-primary);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
        `;

        // Header
        const header = this.createCodeBlockHeader(filename, file);
        block.appendChild(header);

        // Code content
        const pre = document.createElement('pre');
        pre.style.cssText = `
            margin: 0;
            padding: 20px;
            overflow-x: auto;
            background: var(--bg-primary);
            max-width: 100%;
        `;

        const code = document.createElement('code');
        code.className = `language-${file.language || 'plaintext'}`;
        code.style.cssText = `
            color: var(--text-primary);
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.6;
        `;

        // Підсвітка коду
        if (window.sanitizer) {
            code.textContent = file.code;
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
        header.style.cssText = `
            background: var(--bg-secondary);
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-primary);
            gap: 12px;
        `;

        // Info section
        const info = document.createElement('div');
        info.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;';

        const lang = document.createElement('span');
        lang.style.cssText = `
            color: var(--text-tertiary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            background: var(--bg-primary);
            padding: 4px 8px;
            border-radius: 6px;
        `;
        lang.textContent = file.language || 'unknown';
        info.appendChild(lang);

        const name = document.createElement('span');
        name.style.cssText = `
            color: var(--text-primary);
            font-size: 13px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        name.textContent = filename;
        info.appendChild(name);

        if (file.modified) {
            const modified = document.createElement('span');
            modified.style.cssText = 'color: #f59e0b; font-size: 12px;';
            modified.textContent = '● змінено';
            info.appendChild(modified);
        }

        header.appendChild(info);

        // Buttons section
        const buttons = this.createActionButtons(filename, file);
        header.appendChild(buttons);

        return header;
    }

    createActionButtons(filename, file) {
        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

        const buttonStyle = `
            background: var(--accent-primary);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            white-space: nowrap;
        `;

        // Preview button (ТІЛЬКИ для HTML)
        if (filename.endsWith('.html')) {
            const previewBtn = document.createElement('button');
            previewBtn.textContent = '👁️ Preview';
            previewBtn.style.cssText = buttonStyle;
            previewBtn.onclick = () => this.previewFile(filename, file);
            buttons.appendChild(previewBtn);
        }

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Копіювати';
        copyBtn.style.cssText = buttonStyle;
        copyBtn.onclick = () => this.copyFile(filename, file);
        buttons.appendChild(copyBtn);

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '💾 Завантажити';
        downloadBtn.style.cssText = buttonStyle;
        downloadBtn.onclick = () => this.downloadFile(filename, file);
        buttons.appendChild(downloadBtn);

        return buttons;
    }

    showEmptyState() {
        if (!this.codeContainer) return;

        this.codeContainer.innerHTML = `
            <div class="empty-state" style="
                text-align: center;
                padding: 60px 20px;
                color: var(--text-secondary);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">📁</div>
                <h3 style="color: var(--text-primary); margin-bottom: 10px;">Немає файлів</h3>
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
                const isActive = tab.dataset.filename === filename;
                tab.classList.toggle('active', isActive);
                tab.style.background = isActive ? 'var(--bg-secondary)' : 'transparent';
                tab.style.borderBottomColor = isActive ? 'var(--accent-primary)' : 'transparent';
                tab.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-secondary)';
            });

            document.querySelectorAll('.code-file').forEach(file => {
                const isActive = file.dataset.filename === filename;
                file.classList.toggle('active', isActive);
                file.style.display = isActive ? 'block' : 'none';
            });

            if (this.fileSelector) {
                this.fileSelector.value = filename;
            }

        } catch (error) {
            console.error('Failed to switch file:', error);
        }
    }

    previewFile(filename, file) {
        if (!filename.endsWith('.html')) {
            if (window.showToast) {
                showToast('⚠️ Preview доступний тільки для HTML файлів', 'warning');
            }
            return;
        }

        // Створити preview у новому вікні
        const previewWindow = window.open('', '_blank', 'width=1200,height=800');
        if (previewWindow) {
            previewWindow.document.write(file.code);
            previewWindow.document.close();
        }
    }

    copyFile(filename, file) {
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

    downloadFile(filename, file) {
        try {
            const blob = new Blob([file.code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (window.showToast) {
                showToast('✅ Файл завантажено!', 'success', 2000);
            }
        } catch (error) {
            console.error('Download failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження', 'error');
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

console.log('✅ UI Controller loaded (FULLY FIXED with Preview)');
