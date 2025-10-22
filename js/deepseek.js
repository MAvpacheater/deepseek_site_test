// 💻 Enhanced DeepSeek Coder - Claude-like Navigation

// Стан інтерфейсу
let uiState = {
    codeVisible: true,
    currentFile: null,
    currentVersion: 0,
    filesDropdownOpen: false
};

// Ініціалізація покращеного UI
function initializeEnhancedCodeUI() {
    const codeSection = document.querySelector('#deepseekMode .code-section');
    if (!codeSection) return;
    
    // Додати кнопку згортання/розгортання
    if (!document.getElementById('code-toggle-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'code-toggle-btn';
        toggleBtn.className = 'code-toggle-btn';
        toggleBtn.innerHTML = '◀';
        toggleBtn.title = 'Згорнути/Розгорнути код';
        toggleBtn.onclick = toggleCodePanel;
        codeSection.appendChild(toggleBtn);
    }
    
    // Оновити header
    updateCodeHeader();
}

// Перемкнути панель коду
function toggleCodePanel() {
    const codeSection = document.querySelector('.code-section');
    const toggleBtn = document.getElementById('code-toggle-btn');
    const chatSection = document.querySelector('#deepseekMode .chat-section');
    
    if (!codeSection || !toggleBtn) return;
    
    uiState.codeVisible = !uiState.codeVisible;
    
    if (uiState.codeVisible) {
        codeSection.classList.remove('hidden');
        chatSection.classList.remove('full-width');
        toggleBtn.innerHTML = '◀';
        toggleBtn.title = 'Згорнути код';
    } else {
        codeSection.classList.add('hidden');
        chatSection.classList.add('full-width');
        toggleBtn.innerHTML = '▶';
        toggleBtn.title = 'Розгорнути код';
    }
}

// Оновити header коду
function updateCodeHeader() {
    const codeHeader = document.querySelector('.code-header');
    if (!codeHeader) return;
    
    const filesCount = Object.keys(window.codeFiles || {}).length;
    
    codeHeader.innerHTML = `
        <div class="code-header-left">
            <div class="code-header-title">
                📁 Файли проекту
                <span class="file-count">${filesCount}</span>
            </div>
        </div>
        <div class="code-actions">
            <button onclick="showSmartCommands()" title="Розумні команди">🎯 Команди</button>
            <button onclick="importGitHubRepo()" title="Завантажити з GitHub">🐙 GitHub</button>
            <button onclick="uploadLocalFile()" title="Завантажити файли">📁 Файл</button>
            <button onclick="downloadAllAsZip()" title="Завантажити ZIP">📦 ZIP</button>
        </div>
    `;
}

// Відобразити файли з навігацією (як у Claude)
function displayCodeFilesEnhanced() {
    const contentDiv = document.getElementById('codeContent');
    if (!contentDiv) return;
    
    const files = window.codeFiles || {};
    const fileNames = Object.keys(files);
    
    if (fileNames.length === 0) {
        contentDiv.innerHTML = `
            <div class="code-empty-state">
                <div class="code-empty-icon">📝</div>
                <h3>Немає файлів</h3>
                <p>Завантаж проект з GitHub або створи новий</p>
            </div>
        `;
        updateCodeHeader();
        return;
    }
    
    // Встановити поточний файл якщо немає
    if (!uiState.currentFile || !files[uiState.currentFile]) {
        uiState.currentFile = fileNames[0];
        uiState.currentVersion = 0;
    }
    
    // Створити навігацію
    const navigation = createFileNavigation(fileNames);
    
    // Створити контент
    const currentFile = files[uiState.currentFile];
    const versions = window.codeHistory?.[uiState.currentFile] || [];
    
    contentDiv.innerHTML = `
        ${navigation}
        <div class="code-file active">
            ${createCodeBlock(uiState.currentFile, currentFile, versions)}
        </div>
    `;
    
    updateCodeHeader();
    
    // Підсвічування синтаксису
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

// Створити навігацію файлів
function createFileNavigation(fileNames) {
    const currentFile = uiState.currentFile;
    const versions = window.codeHistory?.[currentFile] || [];
    const totalVersions = versions.length + 1; // +1 для поточної версії
    
    return `
        <div class="code-navigation">
            <div class="files-dropdown">
                <button class="files-dropdown-btn" onclick="toggleFilesDropdown()">
                    <span>📄</span>
                    <span>${getShortFileName(currentFile)}</span>
                    <span>▼</span>
                </button>
                <div class="files-dropdown-menu" id="filesDropdownMenu">
                    ${fileNames.map(filename => `
                        <div class="file-dropdown-item ${filename === currentFile ? 'active' : ''}" 
                             onclick="switchToFile('${escapeHtml(filename)}')">
                            <span class="file-dropdown-icon">${getFileIcon(filename)}</span>
                            <div class="file-dropdown-info">
                                <div class="file-dropdown-name">${escapeHtml(filename)}</div>
                                <div class="file-dropdown-meta">
                                    ${window.codeFiles[filename].language} • ${formatFileSize(window.codeFiles[filename].code.length)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${totalVersions > 1 ? `
                <div class="version-selector">
                    <button class="version-btn" 
                            onclick="previousVersion()"
                            ${uiState.currentVersion === 0 ? 'disabled' : ''}>
                        ← Попередня
                    </button>
                    <span class="version-info">
                        Версія ${uiState.currentVersion + 1} з ${totalVersions}
                    </span>
                    <button class="version-btn" 
                            onclick="nextVersion()"
                            ${uiState.currentVersion >= totalVersions - 1 ? 'disabled' : ''}>
                        Наступна →
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Створити блок коду
function createCodeBlock(filename, file, versions) {
    // Визначити який код показувати (поточний чи історичний)
    let code, language;
    
    if (uiState.currentVersion === 0) {
        // Поточна версія
        code = file.code;
        language = file.language;
    } else {
        // Історична версія
        const versionIndex = versions.length - uiState.currentVersion;
        code = versions[versionIndex];
        language = file.language;
    }
    
    const highlightedCode = typeof Prism !== 'undefined' ? 
        Prism.highlight(code, Prism.languages[language] || Prism.languages.plaintext, language) :
        escapeHtml(code);
    
    return `
        <div class="code-block">
            <div class="code-block-header">
                <div class="code-block-info">
                    <span class="code-block-lang">${language}</span>
                    <span class="code-block-name">${escapeHtml(filename)}</span>
                    ${uiState.currentVersion > 0 ? 
                        '<span style="color: #f59e0b; font-size: 12px; margin-left: 10px;">📜 Історична версія</span>' : 
                        file.modified ? '<span style="color: #f59e0b; font-size: 12px; margin-left: 10px;">● змінено</span>' : ''
                    }
                </div>
                <div class="code-block-actions">
                    ${window.codeHistory?.[filename]?.length > 0 && uiState.currentVersion === 0 ? 
                        `<button onclick="revertToVersion('${escapeHtml(filename)}')">↶ Відмінити</button>` : ''}
                    ${uiState.currentVersion === 0 ? 
                        `<button onclick="editFile('${escapeHtml(filename)}')">✏️ Редагувати</button>` : ''}
                    <button onclick="copyCodeToClipboard('${escapeHtml(filename)}')">📋 Копіювати</button>
                    <button onclick="downloadSingleFile('${escapeHtml(filename)}')">💾 Завантажити</button>
                </div>
            </div>
            <pre><code class="language-${language}">${highlightedCode}</code></pre>
        </div>
    `;
}

// Перемкнути dropdown файлів
function toggleFilesDropdown() {
    const dropdown = document.getElementById('filesDropdownMenu');
    if (!dropdown) return;
    
    uiState.filesDropdownOpen = !uiState.filesDropdownOpen;
    
    if (uiState.filesDropdownOpen) {
        dropdown.classList.add('active');
        
        // Закрити при кліку поза dropdown
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnClickOutside);
        }, 0);
    } else {
        dropdown.classList.remove('active');
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

// Закрити dropdown при кліку поза ним
function closeDropdownOnClickOutside(e) {
    const dropdown = document.getElementById('filesDropdownMenu');
    const button = document.querySelector('.files-dropdown-btn');
    
    if (dropdown && !dropdown.contains(e.target) && !button.contains(e.target)) {
        dropdown.classList.remove('active');
        uiState.filesDropdownOpen = false;
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

// Перемкнутися на інший файл
function switchToFile(filename) {
    uiState.currentFile = filename;
    uiState.currentVersion = 0;
    displayCodeFilesEnhanced();
    
    // Закрити dropdown
    const dropdown = document.getElementById('filesDropdownMenu');
    if (dropdown) {
        dropdown.classList.remove('active');
        uiState.filesDropdownOpen = false;
    }
}

// Попередня версія
function previousVersion() {
    if (uiState.currentVersion > 0) {
        uiState.currentVersion--;
        displayCodeFilesEnhanced();
    }
}

// Наступна версія
function nextVersion() {
    const versions = window.codeHistory?.[uiState.currentFile] || [];
    const totalVersions = versions.length + 1;
    
    if (uiState.currentVersion < totalVersions - 1) {
        uiState.currentVersion++;
        displayCodeFilesEnhanced();
    }
}

// Повернутися до версії
function revertToVersion(filename) {
    const history = window.codeHistory?.[filename];
    if (!history || history.length === 0) return;
    
    if (!confirm(`↶ Відмінити останні зміни в ${filename}?`)) return;
    
    const previousVersion = history.pop();
    window.codeFiles[filename].code = previousVersion;
    window.codeFiles[filename].modified = false;
    
    uiState.currentVersion = 0;
    displayCodeFilesEnhanced();
}

// Копіювати код
function copyCodeToClipboard(filename) {
    const file = window.codeFiles?.[filename];
    if (!file) return;
    
    // Визначити який код копіювати
    let code;
    if (uiState.currentVersion === 0) {
        code = file.code;
    } else {
        const versions = window.codeHistory?.[filename] || [];
        const versionIndex = versions.length - uiState.currentVersion;
        code = versions[versionIndex];
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showToast('✓ Код скопійовано!');
    });
}

// Завантажити один файл
function downloadSingleFile(filename) {
    const file = window.codeFiles?.[filename];
    if (!file) return;
    
    const blob = new Blob([file.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Показати toast повідомлення
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Утиліти
function getShortFileName(filename) {
    if (filename.length <= 25) return filename;
    const parts = filename.split('/');
    const name = parts[parts.length - 1];
    return name.length <= 25 ? name : '...' + name.slice(-22);
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
        'html': '🌐', 'css': '🎨', 'scss': '🎨',
        'json': '📋', 'md': '📝', 'py': '🐍',
        'java': '☕', 'cpp': '⚙️', 'c': '⚙️'
    };
    return icons[ext] || '📄';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Заміна старої функції displayCodeFiles
if (typeof window.displayCodeFiles !== 'undefined') {
    window.displayCodeFiles = displayCodeFilesEnhanced;
}

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    // Затримка для завантаження інших скриптів
    setTimeout(() => {
        initializeEnhancedCodeUI();
        
        // Якщо є файли - показати їх
        if (window.codeFiles && Object.keys(window.codeFiles).length > 0) {
            displayCodeFilesEnhanced();
        }
    }, 500);
});

// Експорт функцій
window.toggleCodePanel = toggleCodePanel;
window.displayCodeFilesEnhanced = displayCodeFilesEnhanced;
window.switchToFile = switchToFile;
window.toggleFilesDropdown = toggleFilesDropdown;
window.previousVersion = previousVersion;
window.nextVersion = nextVersion;
window.revertToVersion = revertToVersion;
window.copyCodeToClipboard = copyCodeToClipboard;
window.downloadSingleFile = downloadSingleFile;
