// Глобальні змінні
let codeFiles = {};
let activeFile = null;

// Перевірка наявності API ключа при завантаженні
window.addEventListener('DOMContentLoaded', function() {
    const apiKey = localStorage.getItem('groq_api_key');
    if (apiKey) {
        document.getElementById('apiSetup').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
    }
});

// Збереження API ключа
function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (key) {
        localStorage.setItem('groq_api_key', key);
        document.getElementById('apiSetup').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
    } else {
        alert('Введи API ключ!');
    }
}

// Автоматичне розширення textarea
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('userInput');
    
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// Додавання повідомлення в чат
function addMessage(text, sender) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text || '(Код у правій панелі)';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Видалення блоків коду з тексту
function removeCodeBlocks(text) {
    return text.replace(/```[\s\S]*?```/g, '').trim();
}

// Витягування та відображення коду
function extractAndDisplayCode(text) {
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let fileIndex = Object.keys(codeFiles).length;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const lang = match[1] || 'txt';
        const code = match[2].trim();
        
        let filename = detectFilename(code, lang);
        
        if (!filename) {
            fileIndex++;
            filename = `file_${fileIndex}.${getExtension(lang)}`;
        }
        
        codeFiles[filename] = {
            language: lang,
            code: code
        };
    }
    
    if (Object.keys(codeFiles).length > 0) {
        displayCodeFiles();
    }
}

// Визначення імені файлу з коду
function detectFilename(code, lang) {
    const lines = code.split('\n');
    for (let line of lines.slice(0, 5)) {
        if (line.includes('<!DOCTYPE') || line.includes('<html')) return 'index.html';
        if (line.includes('def ') && lang === 'python') return 'main.py';
        if (line.includes('function ') || line.includes('const ') || line.includes('let ')) return 'script.js';
    }
    return null;
}

// Отримання розширення файлу за мовою
function getExtension(lang) {
    const extensions = {
        'javascript': 'js',
        'python': 'py',
        'html': 'html',
        'css': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
        'typescript': 'ts',
        'json': 'json'
    };
    return extensions[lang.toLowerCase()] || 'txt';
}

// Відображення файлів з кодом
function displayCodeFiles() {
    const tabsDiv = document.getElementById('fileTabs');
    const contentDiv = document.getElementById('codeContent');
    
    tabsDiv.innerHTML = '';
    contentDiv.innerHTML = '';
    
    const filenames = Object.keys(codeFiles);
    
    filenames.forEach((filename, index) => {
        const tab = document.createElement('div');
        tab.className = 'file-tab' + (index === 0 ? ' active' : '');
        tab.textContent = filename;
        tab.onclick = () => switchFile(filename);
        tabsDiv.appendChild(tab);
        
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (index === 0 ? ' active' : '');
        fileDiv.dataset.filename = filename;
        
        const file = codeFiles[filename];
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${file.language}</span>
                        <span class="code-block-name">${filename}</span>
                    </div>
                    <button class="copy-btn" onclick="copyCode('${filename}')">Копіювати</button>
                </div>
                <pre><code id="code-${filename}">${escapeHtml(file.code)}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    activeFile = filenames[0];
}

// Перемикання між файлами
function switchFile(filename) {
    document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === filename) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.code-file').forEach(file => {
        file.classList.remove('active');
        if (file.dataset.filename === filename) {
            file.classList.add('active');
        }
    });
    
    activeFile = filename;
}

// Копіювання коду в буфер обміну
function copyCode(filename) {
    const code = document.getElementById(`code-${filename}`).textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = event.target;
        btn.textContent = '✓ Скопійовано!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Копіювати';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Екранування HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
