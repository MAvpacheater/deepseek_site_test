// 💻 Enhanced DeepSeek Coder with GitHub Integration - FIXED VERSION

let deepseekHistory = [];
let codeFiles = {};
let codeHistory = {};
let activeFile = null;
let projectContext = null;

// Безпечні утиліти
function safeGetCodeElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Code element '${id}' not found`);
    }
    return element;
}

function safeGetCodeFiles() {
    if (!window.codeFiles) {
        window.codeFiles = {};
    }
    return window.codeFiles;
}

function safeGetCodeHistory() {
    if (!window.codeHistory) {
        window.codeHistory = {};
    }
    return window.codeHistory;
}

// ========================================
// ENHANCED DEEPSEEK CHAT
// ========================================

async function sendDeepseekMessage() {
    const input = safeGetCodeElement('deepseekInput');
    if (!input) {
        console.error('DeepSeek input not found');
        return;
    }
    
    const message = input.value.trim();
    if (!message) return;

    const apiKey = getGroqApiKey();
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        if (typeof switchMode === 'function') {
            switchMode('settings');
        }
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    if (typeof addMessage === 'function') {
        addMessage(message, 'user', 'deepseekMessages');
    }
    
    // Build context with project files
    const context = buildProjectContext(message);
    
    const systemPrompt = localStorage.getItem('deepseek_system_prompt') || 
        'Ти експерт-програміст. Пиши чистий код з коментарями. ' +
        'Коли редагуєш існуючі файли - показуй ТІЛЬКИ змінені частини. ' +
        'Використовуй формат: // FILE: назва_файлу.js для кожного файлу. ' +
        'Говори українською.';
    
    deepseekHistory.push({ role: 'user', content: context });

    if (deepseekHistory.length > 40) {
        deepseekHistory = deepseekHistory.slice(-40);
    }

    const sendBtn = safeGetCodeElement('deepseekSendBtn');
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
                temperature: 0.5,
                max_tokens: 8000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }

        const aiMessage = data.choices[0].message.content;
        
        deepseekHistory.push({ role: 'assistant', content: aiMessage });
        
        // Display text without code blocks
        const textOnly = removeCodeBlocks(aiMessage);
        if (textOnly.trim() && typeof addMessage === 'function') {
            addMessage(textOnly, 'assistant', 'deepseekMessages');
        }
        
        // Extract and apply code changes
        extractAndApplyCode(aiMessage);
        
        // Update stats
        if (typeof stats !== 'undefined' && typeof saveStats === 'function') {
            stats.deepseekRequests++;
            stats.totalTokens += estimateTokens(message + aiMessage);
            saveStats();
        }

    } catch (error) {
        console.error('DeepSeek Error:', error);
        if (typeof addMessage === 'function') {
            addMessage('❌ Помилка: ' + error.message, 'assistant', 'deepseekMessages');
        }
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Надіслати';
        }
    }
}

// Build project context for AI
function buildProjectContext(userMessage) {
    let context = userMessage;
    
    const files = safeGetCodeFiles();
    
    // If we have project loaded, add context
    if (projectContext && Object.keys(files).length > 0) {
        context += '\n\n--- КОНТЕКСТ ПРОЕКТУ ---\n';
        context += `Репозиторій: ${projectContext.owner}/${projectContext.repo}\n`;
        context += `Файлів: ${projectContext.filesCount}\n\n`;
        
        // Add file structure
        context += 'Структура:\n';
        Object.keys(files).slice(0, 20).forEach(filename => {
            const file = files[filename];
            if (file && file.language) {
                context += `• ${filename} (${file.language}, ${file.size || 0} символів)${file.modified ? ' [змінено]' : ''}\n`;
            }
        });
        
        // If user mentions specific files, add their content
        const mentionedFiles = Object.keys(files).filter(filename => 
            userMessage.toLowerCase().includes(filename.toLowerCase()) ||
            userMessage.toLowerCase().includes(filename.split('/').pop().toLowerCase())
        );
        
        if (mentionedFiles.length > 0) {
            context += '\n--- ЗГАДАНІ ФАЙЛИ ---\n';
            mentionedFiles.forEach(filename => {
                const file = files[filename];
                if (file && file.code) {
                    context += `\n// FILE: ${filename}\n`;
                    context += file.code.substring(0, 3000);
                    if (file.code.length > 3000) {
                        context += '\n... (скорочено)';
                    }
                    context += '\n';
                }
            });
        }
        // If active file is open, add it
        else if (activeFile && files[activeFile]) {
            context += '\n--- АКТИВНИЙ ФАЙЛ ---\n';
            context += `// FILE: ${activeFile}\n`;
            const activeFileContent = files[activeFile].code;
            if (activeFileContent) {
                context += activeFileContent.substring(0, 3000);
                if (activeFileContent.length > 3000) {
                    context += '\n... (скорочено)';
                }
            }
        }
    }
    
    return context;
}

// Extract and apply code changes
function extractAndApplyCode(text) {
    if (!text) return;
    
    const files = safeGetCodeFiles();
    const history = safeGetCodeHistory();
    
    // Method 1: Look for // FILE: markers
    const fileMarkers = text.match(/\/\/\s*FILE:\s*(.+?)(?:\n|$)/gi);
    
    if (fileMarkers && fileMarkers.length > 0) {
        let currentPos = 0;
        
        fileMarkers.forEach((marker, index) => {
            const filename = marker.replace(/\/\/\s*FILE:\s*/i, '').trim();
            const markerPos = text.indexOf(marker, currentPos);
            const nextMarkerPos = index < fileMarkers.length - 1 ? 
                text.indexOf(fileMarkers[index + 1], markerPos) : text.length;
            
            let codeBlock = text.substring(markerPos + marker.length, nextMarkerPos).trim();
            
            // Remove code fences if present
            codeBlock = codeBlock.replace(/```[\w]*\n?/g, '').replace(/```\n?$/g, '').trim();
            
            if (codeBlock) {
                const ext = filename.split('.').pop();
                const language = getLanguageFromExtension(ext);
                
                // Save to history
                if (!history[filename]) {
                    history[filename] = [];
                }
                if (files[filename] && files[filename].code) {
                    history[filename].push(files[filename].code);
                }
                
                files[filename] = {
                    language: language,
                    code: codeBlock,
                    size: codeBlock.length,
                    modified: true
                };
            }
            
            currentPos = nextMarkerPos;
        });
        
        if (Object.keys(files).length > 0 && typeof displayCodeFiles === 'function') {
            displayCodeFiles();
        }
        return;
    }
    
    // Method 2: Traditional code blocks
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let fileIndex = Object.keys(files).length;
    let hasNewFiles = false;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const lang = match[1] || 'txt';
        const code = match[2].trim();
        
        if (!code) continue;
        
        let filename = detectFilename(code, lang);
        
        if (!filename) {
            fileIndex++;
            filename = `file_${fileIndex}.${getExtension(lang)}`;
        }
        
        // Save to history
        if (!history[filename]) {
            history[filename] = [];
        }
        if (files[filename] && files[filename].code) {
            history[filename].push(files[filename].code);
        }
        
        files[filename] = {
            language: lang,
            code: code,
            size: code.length,
            modified: true
        };
        
        hasNewFiles = true;
    }
    
    if (hasNewFiles && typeof displayCodeFiles === 'function') {
        displayCodeFiles();
    }
}

// ========================================
// FILE MANAGEMENT
// ========================================

function displayCodeFiles() {
    const contentDiv = safeGetCodeElement('codeContent');
    const tabsDiv = safeGetCodeElement('fileTabs');
    const fileNav = safeGetCodeElement('fileNavigation');
    const fileSelector = safeGetCodeElement('fileSelector');
    
    if (!contentDiv) {
        console.error('Code content div not found');
        return;
    }
    
    const files = safeGetCodeFiles();
    const history = safeGetCodeHistory();
    
    // Clear previous content
    if (tabsDiv) tabsDiv.innerHTML = '';
    contentDiv.innerHTML = '';
    
    if (Object.keys(files).length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>Немає файлів</h3>
                <p>Завантаж проект з GitHub або створи новий</p>
            </div>
        `;
        if (fileNav) fileNav.style.display = 'none';
        return;
    }
    
    // Show navigation
    if (fileNav) fileNav.style.display = 'block';
    
    const filenames = Object.keys(files).sort();
    
    // Update file selector
    if (fileSelector) {
        fileSelector.innerHTML = '<option value="">Виберіть файл...</option>' +
            filenames.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
        if (activeFile) {
            fileSelector.value = activeFile;
        }
    }
    
    filenames.forEach((filename, index) => {
        const file = files[filename];
        if (!file) return;
        
        // Create tab
        if (tabsDiv) {
            const tab = document.createElement('div');
            tab.className = 'file-tab' + (index === 0 && !activeFile ? ' active' : activeFile === filename ? ' active' : '');
            tab.innerHTML = `
                ${file.modified ? '<span style="color: #f59e0b;">●</span> ' : ''}
                ${escapeHtml(filename)}
            `;
            tab.onclick = () => switchFile(filename);
            tabsDiv.appendChild(tab);
        }
        
        // Create content
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (index === 0 && !activeFile ? ' active' : activeFile === filename ? ' active' : '');
        fileDiv.dataset.filename = filename;
        
        const highlightedCode = typeof Prism !== 'undefined' && file.code ? 
            Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language) :
            escapeHtml(file.code || '');
        
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${escapeHtml(file.language || 'unknown')}</span>
                        <span class="code-block-name">${escapeHtml(filename)}</span>
                        ${file.modified ? '<span style="color: #f59e0b; font-size: 12px;">● змінено</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${history[filename] && history[filename].length > 0 ? 
                            `<button onclick="revertFile('${escapeHtml(filename)}')">↶ Відмінити</button>` : ''}
                        <button onclick="editFile('${escapeHtml(filename)}')">✏️ Редагувати</button>
                        <button onclick="copyCode('${escapeHtml(filename)}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${escapeHtml(filename)}')">💾 Завантажити</button>
                    </div>
                </div>
                <pre><code class="language-${escapeHtml(file.language || 'plaintext')}" id="code-${escapeHtml(filename)}">${highlightedCode}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    if (!activeFile && filenames.length > 0) {
        activeFile = filenames[0];
    }
    
    // Show version control if file has history
    const versionControl = safeGetCodeElement('versionControl');
    if (versionControl && activeFile && history[activeFile] && history[activeFile].length > 0) {
        versionControl.style.display = 'block';
        const versionInfo = safeGetCodeElement('versionInfo');
        if (versionInfo) {
            versionInfo.textContent = `v${history[activeFile].length + 1}/${history[activeFile].length + 1}`;
        }
    } else if (versionControl) {
        versionControl.style.display = 'none';
    }
    
    // Auto-open code panel
    const codeSection = safeGetCodeElement('codeSection');
    if (codeSection && codeSection.classList.contains('collapsed')) {
        if (typeof toggleCodePanel === 'function') {
            toggleCodePanel();
        }
    }
}

function switchFile(filename) {
    if (!filename) return;
    
    const files = safeGetCodeFiles();
    if (!files[filename]) return;
    
    document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.includes(filename)) {
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
    
    // Update selector
    const selector = safeGetCodeElement('fileSelector');
    if (selector) {
        selector.value = filename;
    }
    
    // Update version control
    const history = safeGetCodeHistory();
    const versionControl = safeGetCodeElement('versionControl');
    if (versionControl) {
        if (history[filename] && history[filename].length > 0) {
            versionControl.style.display = 'block';
            const versionInfo = safeGetCodeElement('versionInfo');
            if (versionInfo) {
                versionInfo.textContent = `v${history[filename].length + 1}/${history[filename].length + 1}`;
            }
        } else {
            versionControl.style.display = 'none';
        }
    }
}

function editFile(filename) {
    const files = safeGetCodeFiles();
    const file = files[filename];
    if (!file) return;
    
    const newCode = prompt(`✏️ Редагувати ${filename}:\n\n(Для великих змін краще використати AI)`, file.code);
    
    if (newCode !== null && newCode !== file.code) {
        const history = safeGetCodeHistory();
        
        // Save to history
        if (!history[filename]) {
            history[filename] = [];
        }
        history[filename].push(file.code);
        
        file.code = newCode;
        file.size = newCode.length;
        file.modified = true;
        
        displayCodeFiles();
    }
}

function revertFile(filename) {
    const history = safeGetCodeHistory();
    const historyArray = history[filename];
    
    if (!historyArray || historyArray.length === 0) return;
    
    if (!confirm(`↶ Відмінити зміни в ${filename}?`)) return;
    
    const files = safeGetCodeFiles();
    const previousVersion = historyArray.pop();
    
    if (files[filename]) {
        files[filename].code = previousVersion;
        files[filename].size = previousVersion.length;
    }
    
    displayCodeFiles();
}

function copyCode(filename) {
    const files = safeGetCodeFiles();
    const code = files[filename]?.code;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = event?.target;
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Скопійовано!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('❌ Помилка копіювання');
    });
}

function downloadFile(filename) {
    const files = safeGetCodeFiles();
    const file = files[filename];
    if (!file) return;
    
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
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Помилка завантаження файлу');
    }
}

async function downloadAllAsZip() {
    const files = safeGetCodeFiles();
    
    if (Object.keys(files).length === 0) {
        alert('⚠️ Немає файлів!');
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        alert('❌ JSZip не завантажено!');
        return;
    }
    
    try {
        const zip = new JSZip();
        
        Object.keys(files).forEach(filename => {
            const file = files[filename];
            if (file && file.code) {
                zip.file(filename, file.code);
            }
        });
        
        // Add README if GitHub project
        if (projectContext) {
            const readme = `# ${projectContext.repo}\n\n` +
                `Оригінальний репозиторій: ${projectContext.url}\n\n` +
                `Змінено через AI Assistant Hub\n`;
            zip.file('AI_CHANGES.md', readme);
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = projectContext ? `${projectContext.repo}_modified.zip` : 'project.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('ZIP error:', error);
        alert('❌ Помилка створення ZIP архіву');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function removeCodeBlocks(text) {
    if (!text) return '';
    return text.replace(/```[\s\S]*?```/g, '').trim();
}

function detectFilename(code, lang) {
    if (!code) return null;
    
    const lines = code.split('\n');
    for (let line of lines.slice(0, 5)) {
        if (line.includes('<!DOCTYPE') || line.includes('<html')) return 'index.html';
        if (line.includes('package.json')) return 'package.json';
        if (line.match(/^import .* from/)) return 'index.js';
        if (line.match(/^def .+\(/)) return 'main.py';
    }
    return null;
}

function getExtension(lang) {
    const extensions = {
        'javascript': 'js', 'typescript': 'ts', 'python': 'py',
        'html': 'html', 'css': 'css', 'json': 'json',
        'java': 'java', 'cpp': 'cpp', 'c': 'c',
        'go': 'go', 'rust': 'rs', 'php': 'php'
    };
    return extensions[lang.toLowerCase()] || 'txt';
}

function getLanguageFromExtension(ext) {
    if (!ext) return 'plaintext';
    
    const map = {
        'js': 'javascript', 'jsx': 'javascript',
        'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'html': 'html', 'css': 'css',
        'json': 'json', 'md': 'markdown',
        'java': 'java', 'cpp': 'cpp', 'c': 'c',
        'go': 'go', 'rs': 'rust', 'php': 'php',
        'rb': 'ruby', 'vue': 'html', 'svelte': 'html'
    };
    return map[ext.toLowerCase()] || 'plaintext';
}

function getGroqApiKey() {
    const encrypted = localStorage.getItem('groq_api_key');
    if (!encrypted) return '';
    
    // Check if encrypted
    const isEncrypted = localStorage.getItem('groq_encrypted') === 'true';
    if (isEncrypted && typeof decryptApiKey === 'function') {
        return decryptApiKey(encrypted);
    }
    
    return encrypted;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 3);
}

// ========================================
// INITIALIZATION
// ========================================

function initializeDeepSeek() {
    // Ensure global objects exist
    window.codeFiles = window.codeFiles || {};
    window.codeHistory = window.codeHistory || {};
    window.activeFile = window.activeFile || null;
    window.projectContext = window.projectContext || null;
    
    console.log('✅ Enhanced DeepSeek готовий');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDeepSeek);
} else {
    initializeDeepSeek();
}

// Export functions and variables
window.sendDeepseekMessage = sendDeepseekMessage;
window.displayCodeFiles = displayCodeFiles;
window.downloadAllAsZip = downloadAllAsZip;
window.switchFile = switchFile;
window.editFile = editFile;
window.revertFile = revertFile;
window.copyCode = copyCode;
window.downloadFile = downloadFile;
window.codeFiles = codeFiles;
window.codeHistory = codeHistory;
window.activeFile = activeFile;
window.projectContext = projectContext;
window.deepseekHistory = deepseekHistory;
