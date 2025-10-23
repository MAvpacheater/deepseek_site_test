// 🎮 DeepSeek UI Controls - Керування інтерфейсом

// Стан UI
let isCodePanelOpen = false;
let isPreviewOpen = false;
let currentFileIndex = 0;

// ========================================
// CODE PANEL CONTROLS
// ========================================

function toggleCodePanel() {
    const codeSection = document.getElementById('codeSection');
    const chatSection = document.getElementById('deepseekChatSection');
    
    if (!codeSection || !chatSection) return;
    
    isCodePanelOpen = !isCodePanelOpen;
    
    if (isCodePanelOpen) {
        codeSection.classList.remove('collapsed');
        chatSection.style.width = '55%';
    } else {
        codeSection.classList.add('collapsed');
        chatSection.style.width = '100%';
    }
    
    // Зберегти стан
    localStorage.setItem('codePanel_open', isCodePanelOpen);
}

// ========================================
// PREVIEW CONTROLS
// ========================================

function togglePreview() {
    const previewPanel = document.getElementById('previewPanel');
    if (!previewPanel) return;
    
    isPreviewOpen = !isPreviewOpen;
    
    if (isPreviewOpen) {
        previewPanel.classList.add('active');
        updatePreview();
    } else {
        previewPanel.classList.remove('active');
    }
}

function updatePreview() {
    const previewFrame = document.getElementById('previewFrame');
    if (!previewFrame) return;
    
    // Знайти HTML файл
    let htmlFile = null;
    let htmlContent = '';
    
    if (window.codeFiles) {
        // Шукати index.html або перший HTML файл
        htmlFile = window.codeFiles['index.html'] || 
                   Object.entries(window.codeFiles).find(([name]) => name.endsWith('.html'));
        
        if (htmlFile) {
            if (Array.isArray(htmlFile)) {
                htmlContent = htmlFile[1].code;
            } else {
                htmlContent = htmlFile.code;
            }
            
            // Вбудувати CSS та JS
            htmlContent = injectAssetsIntoHTML(htmlContent);
        }
    }
    
    if (!htmlContent) {
        previewFrame.srcdoc = `
            <html>
                <body style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; color: #666;">
                    <div style="text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                        <h3>Немає HTML для перегляду</h3>
                        <p>Створи файл index.html</p>
                    </div>
                </body>
            </html>
        `;
        return;
    }
    
    // Показати preview
    previewFrame.srcdoc = htmlContent;
}

function injectAssetsIntoHTML(html) {
    if (!window.codeFiles) return html;
    
    let result = html;
    
    // Знайти всі CSS файли
    const cssFiles = Object.entries(window.codeFiles)
        .filter(([name]) => name.endsWith('.css'))
        .map(([name, file]) => file.code);
    
    // Знайти всі JS файли
    const jsFiles = Object.entries(window.codeFiles)
        .filter(([name]) => name.endsWith('.js') && !name.includes('test'))
        .map(([name, file]) => file.code);
    
    // Вбудувати CSS
    if (cssFiles.length > 0) {
        const cssTag = `<style>\n${cssFiles.join('\n\n')}\n</style>`;
        
        if (result.includes('</head>')) {
            result = result.replace('</head>', `${cssTag}\n</head>`);
        } else if (result.includes('<head>')) {
            result = result.replace('<head>', `<head>\n${cssTag}`);
        } else {
            result = cssTag + result;
        }
    }
    
    // Вбудувати JS
    if (jsFiles.length > 0) {
        const jsTag = `<script>\n${jsFiles.join('\n\n')}\n</script>`;
        
        if (result.includes('</body>')) {
            result = result.replace('</body>', `${jsTag}\n</body>`);
        } else {
            result = result + jsTag;
        }
    }
    
    return result;
}

// ========================================
// FILE NAVIGATION
// ========================================

function switchToFile(filename) {
    if (!filename || !window.codeFiles || !window.codeFiles[filename]) return;
    
    // Викликати функцію з deepseek.js
    if (typeof switchFile === 'function') {
        switchFile(filename);
    }
    
    // Оновити індекс
    const files = Object.keys(window.codeFiles);
    currentFileIndex = files.indexOf(filename);
}

function navigateToPreviousFile() {
    if (!window.codeFiles) return;
    
    const files = Object.keys(window.codeFiles);
    if (files.length === 0) return;
    
    currentFileIndex = (currentFileIndex - 1 + files.length) % files.length;
    const filename = files[currentFileIndex];
    
    // Оновити selector
    const selector = document.getElementById('fileSelector');
    if (selector) {
        selector.value = filename;
    }
    
    switchToFile(filename);
}

function navigateToNextFile() {
    if (!window.codeFiles) return;
    
    const files = Object.keys(window.codeFiles);
    if (files.length === 0) return;
    
    currentFileIndex = (currentFileIndex + 1) % files.length;
    const filename = files[currentFileIndex];
    
    // Оновити selector
    const selector = document.getElementById('fileSelector');
    if (selector) {
        selector.value = filename;
    }
    
    switchToFile(filename);
}

// ========================================
// VERSION CONTROL
// ========================================

let currentVersionIndex = {};

function previousVersion() {
    if (!window.activeFile || !window.codeHistory || !window.codeHistory[window.activeFile]) return;
    
    const history = window.codeHistory[window.activeFile];
    if (history.length === 0) return;
    
    if (!currentVersionIndex[window.activeFile]) {
        currentVersionIndex[window.activeFile] = history.length;
    }
    
    currentVersionIndex[window.activeFile] = Math.max(0, currentVersionIndex[window.activeFile] - 1);
    
    displayVersion(window.activeFile, currentVersionIndex[window.activeFile]);
}

function nextVersion() {
    if (!window.activeFile || !window.codeHistory || !window.codeHistory[window.activeFile]) return;
    
    const history = window.codeHistory[window.activeFile];
    if (history.length === 0) return;
    
    if (!currentVersionIndex[window.activeFile]) {
        currentVersionIndex[window.activeFile] = 0;
    }
    
    currentVersionIndex[window.activeFile] = Math.min(history.length, currentVersionIndex[window.activeFile] + 1);
    
    displayVersion(window.activeFile, currentVersionIndex[window.activeFile]);
}

function displayVersion(filename, versionIndex) {
    const history = window.codeHistory[filename];
    const versionInfo = document.getElementById('versionInfo');
    
    if (versionInfo) {
        versionInfo.textContent = `v${versionIndex + 1}/${history.length + 1}`;
    }
    
    // Показати код цієї версії
    const code = versionIndex === history.length ? 
        window.codeFiles[filename].code : 
        history[versionIndex];
    
    // Знайти code block і оновити
    const codeBlock = document.querySelector(`.code-file[data-filename="${filename}"] code`);
    if (codeBlock && typeof Prism !== 'undefined') {
        const file = window.codeFiles[filename];
        const highlightedCode = Prism.highlight(
            code, 
            Prism.languages[file.language] || Prism.languages.plaintext, 
            file.language
        );
        codeBlock.innerHTML = highlightedCode;
    }
}

function revertToVersion() {
    if (!window.activeFile || !window.codeHistory || !window.codeHistory[window.activeFile]) return;
    
    const history = window.codeHistory[window.activeFile];
    const versionIndex = currentVersionIndex[window.activeFile];
    
    if (versionIndex === undefined || versionIndex === history.length) {
        alert('ℹ️ Це вже поточна версія!');
        return;
    }
    
    if (!confirm(`↶ Відновити версію ${versionIndex + 1}?`)) return;
    
    const code = history[versionIndex];
    
    // Зберегти поточну версію в історію
    history.push(window.codeFiles[window.activeFile].code);
    
    // Відновити версію
    window.codeFiles[window.activeFile].code = code;
    window.codeFiles[window.activeFile].modified = true;
    
    // Оновити відображення
    if (typeof displayCodeFiles === 'function') {
        displayCodeFiles();
    }
    
    alert('✅ Версію відновлено!');
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + B - Toggle code panel
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleCodePanel();
        }
        
        // Ctrl/Cmd + P - Toggle preview
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            togglePreview();
        }
        
        // Alt + Left - Previous file
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateToPreviousFile();
        }
        
        // Alt + Right - Next file
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            navigateToNextFile();
        }
        
        // Escape - Close preview
        if (e.key === 'Escape' && isPreviewOpen) {
            togglePreview();
        }
    });
}

// ========================================
// INITIALIZATION
// ========================================

function initializeDeepSeekUI() {
    // Відновити стан панелі коду
    const savedState = localStorage.getItem('codePanel_open');
    if (savedState === 'true') {
        isCodePanelOpen = true;
        const codeSection = document.getElementById('codeSection');
        const chatSection = document.getElementById('deepseekChatSection');
        if (codeSection && chatSection) {
            codeSection.classList.remove('collapsed');
            chatSection.style.width = '55%';
        }
    }
    
    // Ініціалізувати гарячі клавіші
    initializeKeyboardShortcuts();
    
    console.log('✅ DeepSeek UI Controls ініціалізовано');
}

// Автоматична ініціалізація
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDeepSeekUI);
} else {
    initializeDeepSeekUI();
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

window.toggleCodePanel = toggleCodePanel;
window.togglePreview = togglePreview;
window.updatePreview = updatePreview;
window.switchToFile = switchToFile;
window.navigateToPreviousFile = navigateToPreviousFile;
window.navigateToNextFile = navigateToNextFile;
window.previousVersion = previousVersion;
window.nextVersion = nextVersion;
window.revertToVersion = revertToVersion;
