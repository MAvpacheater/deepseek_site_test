// Глобальні змінні
let codeFiles = {};
let activeFile = null;
let currentMode = 'gemini';

let geminiHistory = [];
let deepseekHistory = [];

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initializeInputs();
});

// Завантаження налаштувань
function loadSettings() {
    const geminiKey = localStorage.getItem('gemini_api_key') || '';
    const groqKey = localStorage.getItem('groq_api_key') || '';
    const geminiPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асистент. Відповідай чітко, стисло та по суті. Говори українською мовою.';
    const deepseekPrompt = localStorage.getItem('deepseek_system_prompt') || 'Ти експерт-програміст. Пиши чистий, оптимізований код з коментарями. Створюй окремі файли для HTML, CSS, JS. Говори українською мовою.';

    if (document.getElementById('geminiApiKey')) {
        document.getElementById('geminiApiKey').value = geminiKey;
    }
    if (document.getElementById('groqApiKey')) {
        document.getElementById('groqApiKey').value = groqKey;
    }
    if (document.getElementById('geminiSystemPrompt')) {
        document.getElementById('geminiSystemPrompt').value = geminiPrompt;
    }
    if (document.getElementById('deepseekSystemPrompt')) {
        document.getElementById('deepseekSystemPrompt').value = deepseekPrompt;
    }
}

// Збереження налаштувань
function saveSettings() {
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const groqKey = document.getElementById('groqApiKey').value.trim();
    const geminiPrompt = document.getElementById('geminiSystemPrompt').value.trim();
    const deepseekPrompt = document.getElementById('deepseekSystemPrompt').value.trim();

    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('groq_api_key', groqKey);
    localStorage.setItem('gemini_system_prompt', geminiPrompt);
    localStorage.setItem('deepseek_system_prompt', deepseekPrompt);

    alert('✅ Налаштування збережено!');
}

// Очищення всіх даних
function clearAllData() {
    if (confirm('⚠️ Видалити всі дані (історію, налаштування, ключі)? Цю дію не можна скасувати!')) {
        localStorage.clear();
        geminiHistory = [];
        deepseekHistory = [];
        codeFiles = {};
        
        document.getElementById('geminiMessages').innerHTML = '';
        document.getElementById('deepseekMessages').innerHTML = '';
        document.getElementById('fileTabs').innerHTML = '';
        document.getElementById('codeContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>Немає файлів</h3>
                <p>Код з'явиться тут після відповіді AI</p>
            </div>
        `;
        
        loadSettings();
        alert('🗑️ Всі дані видалено!');
    }
}

// Перемикання режимів
function switchMode(mode) {
    currentMode = mode;
    
    // Оновлення активної кнопки
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.menu-btn').classList.add('active');
    
    // Оновлення контенту
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${mode}Mode`).classList.add('active');
}

// Ініціалізація полів вводу
function initializeInputs() {
    const inputs = ['geminiInput', 'deepseekInput'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputId === 'geminiInput') {
                    sendGeminiMessage();
                } else if (inputId === 'deepseekInput') {
                    sendDeepseekMessage();
                }
            }
        });
    });
}

// Додавання повідомлення в чат
function addMessage(text, sender, messagesId) {
    const messagesDiv = document.getElementById(messagesId);
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

// Gemini Message
async function sendGeminiMessage() {
    const input = document.getElementById('geminiInput');
    const message = input.value.trim();
    
    if (!message) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Gemini API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'geminiMessages');
    geminiHistory.push({ role: 'user', parts: [{ text: message }] });

    // Обмеження історії до 10 повідомлень
    if (geminiHistory.length > 10) {
        geminiHistory = geminiHistory.slice(-10);
    }

    const sendBtn = document.getElementById('geminiSendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

    try {
        const systemPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асистент.';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: geminiHistory,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Помилка API');
        }

        const aiMessage = data.candidates[0].content.parts[0].text;
        
        geminiHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
        addMessage(aiMessage, 'assistant', 'geminiMessages');

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'geminiMessages');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Надіслати';
    }
}

// DeepSeek Message
async function sendDeepseekMessage() {
    const input = document.getElementById('deepseekInput');
    const message = input.value.trim();
    
    if (!message) return;

    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'deepseekMessages');
    
    const systemPrompt = localStorage.getItem('deepseek_system_prompt') || 'Ти експерт-програміст.';
    
    deepseekHistory.push({ role: 'user', content: message });

    // Обмеження історії до 20 повідомлень
    if (deepseekHistory.length > 20) {
        deepseekHistory = deepseekHistory.slice(-20);
    }

    const sendBtn = document.getElementById('deepseekSendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...deepseekHistory
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Помилка API: ${response.status}`);
        }

        const aiMessage = data.choices[0].message.content;
        
        deepseekHistory.push({ role: 'assistant', content: aiMessage });
        
        const textOnly = removeCodeBlocks(aiMessage);
        addMessage(textOnly, 'assistant', 'deepseekMessages');
        
        extractAndDisplayCode(aiMessage);

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'deepseekMessages');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Надіслати';
    }
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
                    <div>
                        <button onclick="copyCode('${filename}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${filename}')">💾 Завантажити</button>
                    </div>
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
        const originalText = btn.textContent;
        btn.textContent = '✓ Скопійовано!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Завантаження файлу
function downloadFile(filename) {
    const code = codeFiles[filename].code;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Екранування HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
