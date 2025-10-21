// 💻 DeepSeek Coder Logic - Оновлено з GitHub та файл-менеджментом
let deepseekHistory = [];
let codeFiles = {};
let codeHistory = {};
let activeFile = null;

// Відправка повідомлення в DeepSeek
async function sendDeepseekMessage() {
    const input = document.getElementById('deepseekInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;

    const apiKey = typeof getGroqApiKey === 'function' ? getGroqApiKey() : localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'deepseekMessages');
    
    const systemPrompt = localStorage.getItem('deepseek_system_prompt') || 
        'Ти експерт-програміст. Пиши чистий, оптимізований код з коментарями. Говори українською.';
    
    deepseekHistory.push({ role: 'user', content: message });

    if (deepseekHistory.length > 40) {
        deepseekHistory = deepseekHistory.slice(-40);
    }

    const sendBtn = document.getElementById('deepseekSendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    }

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
        
        // Статистика
        if (typeof stats !== 'undefined') {
            stats.deepseekRequests++;
            stats.totalTokens += estimateTokens(message + aiMessage);
            saveStats();
        }

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'deepseekMessages');
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Надіслати';
        }
    }
}

// Видалення блоків коду
function removeCodeBlocks(text) {
    return text.replace(/```[\s\S]*?```/g, '').trim();
}

// Витяг та відображення коду
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
        
        // Зберегти версію для diff
        if (!codeHistory[filename]) {
            codeHistory[filename] = [];
        }
        codeHistory[filename].push(code);
        
        codeFiles[filename] = {
            language: lang,
            code: code
        };
    }
    
    if (Object.keys(codeFiles).length > 0) {
        displayCodeFiles();
    }
}

// Визначення імені файлу
function detectFilename(code, lang) {
    const lines = code.split('\n');
    for (let line of lines.slice(0, 5)) {
        if (line.includes('<!DOCTYPE') || line.includes('<html')) return 'index.html';
        if (line.includes('def ') && lang === 'python') return 'main.py';
        if (line.includes('function ') || line.includes('const ') || line.includes('let ')) return 'script.js';
        if (line.includes('body {') || line.includes('* {')) return 'styles.css';
    }
    return null;
}

// Розширення за мовою
function getExtension(lang) {
    const extensions = {
        'javascript': 'js', 'python': 'py', 'html': 'html', 'css': 'css',
        'java': 'java', 'cpp': 'cpp', 'c': 'c', 'go': 'go', 'rust': 'rs',
        'php': 'php', 'ruby': 'rb', 'swift': 'swift', 'kotlin': 'kt',
        'typescript': 'ts', 'json': 'json', 'xml': 'xml', 'sql': 'sql'
    };
    return extensions[lang.toLowerCase()] || 'txt';
}

// Відображення файлів
function displayCodeFiles() {
    const tabsDiv = document.getElementById('fileTabs');
    const contentDiv = document.getElementById('codeContent');
    
    if (!tabsDiv || !contentDiv) return;
    
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
        
        const languageClass = `language-${file.language}`;
        const highlightedCode = typeof Prism !== 'undefined' ? 
            Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language) :
            escapeHtml(file.code);
        
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${file.language}</span>
                        <span class="code-block-name">${filename}</span>
                    </div>
                    <div>
                        <button onclick="copyCode('${escapeHtml(filename)}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${escapeHtml(filename)}')">💾 Завантажити</button>
                    </div>
                </div>
                <pre><code class="${languageClass}" id="code-${escapeHtml(filename)}">${highlightedCode}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    activeFile = filenames[0];
    
    // Ініціалізувати додаткові функції
    setTimeout(() => {
        if (typeof initializeCoderEnhancements === 'function') {
            initializeCoderEnhancements();
        }
        if (typeof initializeGitHubButtons === 'function') {
            initializeGitHubButtons();
        }
    }, 100);
}

// Перемикання файлів
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

// Копіювання коду
function copyCode(filename) {
    const code = codeFiles[filename]?.code;
    if (!code) return;
    
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
    if (!codeFiles[filename]) return;
    
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

// Preview HTML
function togglePreview() {
    const panel = document.getElementById('previewPanel');
    const isActive = panel.classList.contains('active');
    
    if (isActive) {
        closePreview();
    } else {
        const htmlFile = Object.keys(codeFiles).find(name => name.endsWith('.html'));
        if (!htmlFile) {
            alert('⚠️ HTML файл не знайдено!');
            return;
        }
        
        const frame = document.getElementById('previewFrame');
        let htmlContent = codeFiles[htmlFile].code;
        
        const cssFile = Object.keys(codeFiles).find(name => name.endsWith('.css'));
        const jsFile = Object.keys(codeFiles).find(name => name.endsWith('.js'));
        
        if (cssFile) {
            const cssContent = codeFiles[cssFile].code;
            htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        
        if (jsFile) {
            const jsContent = codeFiles[jsFile].code;
            htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script></body>`);
        }
        
        frame.srcdoc = htmlContent;
        panel.classList.add('active');
    }
}

function closePreview() {
    const panel = document.getElementById('previewPanel');
    panel.classList.remove('active');
}

// Завантаження як ZIP
async function downloadAllAsZip() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає файлів для завантаження!');
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        alert('❌ JSZip не завантажено!');
        return;
    }
    
    const zip = new JSZip();
    
    Object.keys(codeFiles).forEach(filename => {
        zip.file(filename, codeFiles[filename].code);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Ініціалізація кнопок покращень
function initializeCoderEnhancements() {
    const codeHeader = document.querySelector('.code-header');
    if (!codeHeader || document.getElementById('coder-enhancements')) return;
    
    const enhancementsDiv = document.createElement('div');
    enhancementsDiv.id = 'coder-enhancements';
    enhancementsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;';
    
    enhancementsDiv.innerHTML = `
        <button onclick="analyzeCodeForErrors()" title="Аналіз помилок" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🔍 Аналіз</button>
        <button onclick="generateTests()" title="Генерація тестів" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🧪 Тести</button>
        <button onclick="generateDocumentation()" title="Документація" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">📚 Docs</button>
        <button onclick="refactorCode()" title="Рефакторинг" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🎯 Рефактор</button>
    `;
    
    codeHeader.appendChild(enhancementsDiv);
}

// Ініціалізація GitHub кнопок
function initializeGitHubButtons() {
    const codeActions = document.querySelector('.code-actions');
    if (!codeActions || document.getElementById('github-quick-actions')) return;
    
    const githubDiv = document.createElement('div');
    githubDiv.id = 'github-quick-actions';
    githubDiv.style.cssText = 'display: flex; gap: 8px; margin-left: 10px;';
    
    githubDiv.innerHTML = `
        <button onclick="importFromGitHub()" title="Імпорт з GitHub" style="background: rgba(46, 160, 67, 0.2); color: white; border: 1px solid #2ea043; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🐙 Імпорт</button>
        <button onclick="analyzeImportedCode()" title="Аналізувати" style="background: rgba(46, 160, 67, 0.2); color: white; border: 1px solid #2ea043; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🔍 Аналіз</button>
        <button onclick="exportToGitHub()" title="Експорт" style="background: rgba(46, 160, 67, 0.2); color: white; border: 1px solid #2ea043; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">📤 Експорт</button>
        <button onclick="setupGitHubToken()" title="GitHub Token" style="background: rgba(46, 160, 67, 0.2); color: white; border: 1px solid #2ea043; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">🔑 Token</button>
    `;
    
    codeActions.appendChild(githubDiv);
}

// Функції аналізу та покращення (базові версії)
async function analyzeCodeForErrors() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для аналізу!');
        return;
    }
    
    const activeFileName = activeFile || Object.keys(codeFiles)[0];
    const code = codeFiles[activeFileName].code;
    const language = codeFiles[activeFileName].language;
    
    const errors = [];
    
    if (language === 'javascript' || language === 'js') {
        if (code.match(/console\.log/g)?.length > 5) {
            errors.push('⚠️ Забагато console.log');
        }
        if (code.includes('var ')) {
            errors.push('💡 Використовується var - краще let/const');
        }
        if (code.match(/[^=!]==(?!=)/g)) {
            errors.push('❌ Використовується == замість ===');
        }
    }
    
    if (errors.length === 0) {
        alert('✅ Помилок не знайдено!');
    } else {
        alert('🔍 Результати аналізу:\n\n' + errors.join('\n'));
    }
}

async function generateTests() {
    alert('🧪 Функція генерації тестів доступна з Groq API');
}

async function generateDocumentation() {
    alert('📚 Функція генерації документації доступна');
}

async function refactorCode() {
    alert('🎯 Функція рефакторингу доступна з Groq API');
}
