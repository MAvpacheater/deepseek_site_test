// DeepSeek Coder Logic
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
        
        // Оновити статистику
        stats.deepseekRequests++;
        stats.totalTokens += estimateTokens(message + aiMessage);
        saveStats();

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

// Визначення імені файлу з коду
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
        
        // Підсвічування синтаксису з Prism.js
        const languageClass = `language-${file.language}`;
        const highlightedCode = Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language);
        
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
                <pre><code class="${languageClass}" id="code-${filename}">${highlightedCode}</code></pre>
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
    const code = codeFiles[filename].code;
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

// Завантаження всіх файлів як ZIP
async function downloadAllAsZip() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає файлів для завантаження!');
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

// Diff Viewer
function showDiffViewer() {
    if (Object.keys(codeHistory).length < 1) {
        alert('⚠️ Потрібно мінімум 2 версії файлу для порівняння!');
        return;
    }
    
    const modal = document.getElementById('diffModal');
    const select1 = document.getElementById('diffFile1');
    const select2 = document.getElementById('diffFile2');
    
    select1.innerHTML = '<option value="">Виберіть версію 1</option>';
    select2.innerHTML = '<option value="">Виберіть версію 2</option>';
    
    Object.keys(codeHistory).forEach((filename) => {
        const versions = codeHistory[filename];
        if (versions.length < 2) return;
        
        versions.forEach((version, vIndex) => {
            const option = `<option value="${filename}-${vIndex}">${filename} (v${vIndex + 1})</option>`;
            select1.innerHTML += option;
            select2.innerHTML += option;
        });
    });
    
    modal.classList.add('active');
}

function closeDiffViewer() {
    const modal = document.getElementById('diffModal');
    modal.classList.remove('active');
}

function compareDiff() {
    const file1 = document.getElementById('diffFile1').value;
    const file2 = document.getElementById('diffFile2').value;
    
    if (!file1 || !file2) {
        alert('⚠️ Виберіть обидві версії!');
        return;
    }
    
    const [filename1, version1] = file1.split('-');
    const [filename2, version2] = file2.split('-');
    
    const code1 = codeHistory[filename1][version1].split('\n');
    const code2 = codeHistory[filename2][version2].split('\n');
    
    const result = document.getElementById('diffResult');
    result.innerHTML = '';
    
    const maxLines = Math.max(code1.length, code2.length);
    
    for (let i = 0; i < maxLines; i++) {
        const line1 = code1[i] || '';
        const line2 = code2[i] || '';
        
        let className = 'unchanged';
        let content = escapeHtml(line2 || line1);
        
        if (line1 !== line2) {
            if (!line1) {
                className = 'added';
                content = '+ ' + escapeHtml(line2);
            } else if (!line2) {
                className = 'removed';
                content = '- ' + escapeHtml(line1);
            } else {
                className = 'added';
                result.innerHTML += `<div class="diff-line removed">- ${escapeHtml(line1)}</div>`;
                content = '+ ' + escapeHtml(line2);
            }
        }
        
        result.innerHTML += `<div class="diff-line ${className}">${content}</div>`;
    }
}
