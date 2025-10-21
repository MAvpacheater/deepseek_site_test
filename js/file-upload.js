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
    
    for (let file of files) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const filename = file.name;
            const content = e.target.result;
            const language = getLanguageFromFilename(filename);
            
            if (codeFiles && typeof codeFiles === 'object') {
                codeFiles[filename] = {
                    language: language,
                    code: content
                };
            }
            
            processedCount++;
            updateLoadingOverlay(`Завантажено ${processedCount}/${files.length} файлів`);
            
            if (processedCount === files.length) {
                hideLoadingOverlay();
                
                if (displayCodeFiles && typeof displayCodeFiles === 'function') {
                    displayCodeFiles();
                }
                
                switchMode('deepseek');
                alert(`✅ Завантажено ${files.length} файлів!\n\nТеперь ти можеш редагувати, аналізувати та покращувати код.`);
                
                // Запам'ятати дію
                if (agent) {
                    agent.addMemory({
                        type: 'files_uploaded',
                        count: files.length,
                        files: Array.from(files).map(f => f.name),
                        date: new Date()
                    });
                }
            }
        };
        
        reader.readAsText(file);
    }
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
        'txt': 'plaintext'
    };
    
    return languageMap[ext] || 'plaintext';
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

// Безпечне завантаження 
function validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = [
        'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'less',
        'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'swift', 'kt',
        'json', 'xml', 'sql', 'md', 'txt'
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

// Багатофайловий менеджер
class FileManager {
    constructor() {
        this.files = {};
        this.uploadHistory = [];
    }
    
    addFiles(newFiles) {
        Object.assign(this.files, newFiles);
        this.uploadHistory.push({
            timestamp: new Date(),
            count: Object.keys(newFiles).length,
            files: Object.keys(newFiles)
        });
    }
    
    removeFile(filename) {
        delete this.files[filename];
    }
    
    getFilesByLanguage(language) {
        return Object.entries(this.files)
            .filter(([_, file]) => file.language === language)
            .map(([name, file]) => ({ name, ...file }));
    }
    
    exportAsZip() {
        const zip = new JSZip();
        
        Object.entries(this.files).forEach(([filename, file]) => {
            zip.file(filename, file.code);
        });
        
        return zip.generateAsync({ type: 'blob' });
    }
    
    clear() {
        this.files = {};
    }
}

// Глобальний менеджер
const fileManager = new FileManager();

// Ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    console.log('✅ File Upload систем готова');
});
