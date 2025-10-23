// 📁 File Upload - Завантаження файлів з пристрою

function uploadLocalFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    showLoadingOverlay('Завантаження файлів...');
    
    let processedCount = 0;
    const validFiles = [];
    
    // Валідація файлів
    for (let file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.error + '\n' + file.name);
            continue;
        }
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) {
        hideLoadingOverlay();
        alert('❌ Немає валідних файлів для завантаження!');
        return;
    }
    
    // Очистити попередні файли при першому завантаженні
    if (!window.codeFiles) {
        window.codeFiles = {};
    }
    
    for (let file of validFiles) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const filename = file.name;
            const content = e.target.result;
            const language = getLanguageFromFilename(filename);
            
            window.codeFiles[filename] = {
                language: language,
                code: content,
                size: content.length,
                modified: false
            };
            
            processedCount++;
            updateLoadingOverlay(`Завантажено ${processedCount}/${validFiles.length} файлів`);
            
            if (processedCount === validFiles.length) {
                hideLoadingOverlay();
                
                if (typeof displayCodeFiles === 'function') {
                    displayCodeFiles();
                }
                
                switchMode('deepseek');
                
                // Додати повідомлення про завантаження
                addFileUploadMessage(validFiles.length);
                
                alert(`✅ Завантажено ${validFiles.length} файлів!\n\nТепер ти можеш редагувати, аналізувати та покращувати код.`);
                
                // Запам'ятати дію
                if (typeof agent !== 'undefined' && agent) {
                    agent.addMemory({
                        type: 'files_uploaded',
                        count: validFiles.length,
                        files: Array.from(validFiles).map(f => f.name),
                        date: new Date()
                    });
                }
            }
        };
        
        reader.onerror = function() {
            alert(`❌ Помилка читання файлу: ${file.name}`);
            processedCount++;
            
            if (processedCount === validFiles.length) {
                hideLoadingOverlay();
            }
        };
        
        reader.readAsText(file);
    }
    
    // Очистити input для можливості повторного завантаження
    event.target.value = '';
}

function getLanguageFromFilename(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'css',
        'sass': 'css',
        'less': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'json': 'json',
        'xml': 'xml',
        'sql': 'sql',
        'md': 'markdown',
        'txt': 'plaintext',
        'vue': 'html',
        'svelte': 'html'
    };
    
    return languageMap[ext] || 'plaintext';
}

// Додати повідомлення про завантаження файлів
function addFileUploadMessage(count) {
    const messagesDiv = document.getElementById('deepseekMessages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 12px;
        color: white;
        margin-bottom: 20px;
    `;
    
    const filesList = Object.keys(window.codeFiles)
        .map(f => `<li>${f}</li>`)
        .join('');
    
    messageDiv.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center;">
            <div style="font-size: 48px;">📁</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px;">Файли завантажено</h3>
                <p style="margin: 0 0 12px 0; opacity: 0.9;">📄 ${count} файлів готові до роботи</p>
                <div style="max-height: 150px; overflow-y: auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.6;">
                        ${filesList}
                    </ul>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">💡 Що можна зробити:</p>
                    <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.8;">
                        <li>Аналізувати код на помилки</li>
                        <li>Рефакторити та оптимізувати</li>
                        <li>Генерувати тести</li>
                        <li>Додавати нові функції</li>
                        <li>Перевіряти безпеку</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Валідація файлу
function validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = [
        'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass', 'less',
        'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'swift', 'kt',
        'json', 'xml', 'sql', 'md', 'txt', 'vue', 'svelte'
    ];
    
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `❌ Файл занадто великий (макс ${maxSize / 1024 / 1024}MB)`
        };
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: `❌ Недозволений тип файлу: .${ext}`
        };
    }
    
    return { valid: true };
}

// Функції-помічники для overlay
function showLoadingOverlay(message) {
    let overlay = document.getElementById('file-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'file-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">📁</div>
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 10px;" id="file-loading-title">Завантаження...</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 20px;" id="file-loading-subtitle"></div>
            <div style="margin-top: 20px;">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    const title = document.getElementById('file-loading-title');
    if (title) title.textContent = message;
    
    overlay.style.display = 'flex';
}

function updateLoadingOverlay(message) {
    const subtitle = document.getElementById('file-loading-subtitle');
    if (subtitle) {
        subtitle.textContent = message;
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('file-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    console.log('✅ File Upload система готова');
});

// Експорт функцій
window.uploadLocalFile = uploadLocalFile;
window.handleFileUpload = handleFileUpload;
