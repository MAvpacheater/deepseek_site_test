// 💻 Enhanced DeepSeek Coder with GitHub Integration

let deepseekHistory = [];
let codeFiles = {};
let codeHistory = {};
let activeFile = null;
let projectContext = null;

// ========================================
// ENHANCED DEEPSEEK CHAT
// ========================================

async function sendDeepseekMessage() {
    const input = document.getElementById('deepseekInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;

    const apiKey = getGroqApiKey();
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'deepseekMessages');
    
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
                temperature: 0.5,
                max_tokens: 8000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `API Error: ${response.status}`);
        }

        const aiMessage = data.choices[0].message.content;
        
        deepseekHistory.push({ role: 'assistant', content: aiMessage });
        
        // Display text without code blocks
        const textOnly = removeCodeBlocks(aiMessage);
        if (textOnly.trim()) {
            addMessage(textOnly, 'assistant', 'deepseekMessages');
        }
        
        // Extract and apply code changes
        extractAndApplyCode(aiMessage);
        
        // Update stats
        if (typeof stats !== 'undefined') {
            stats.deepseekRequests++;
            stats.totalTokens += estimateTokens(message + aiMessage);
            saveStats();
        }

    } catch (error) {
        console.error('Error:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'deepseekMessages');
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
    
    // If we have project loaded, add context
    if (projectContext && Object.keys(codeFiles).length > 0) {
        context += '\n\n--- КОНТЕКСТ ПРОЕКТУ ---\n';
        context += `Репозиторій: ${projectContext.owner}/${projectContext.repo}\n`;
        context += `Файлів: ${projectContext.filesCount}\n\n`;
        
        // Add file structure
        context += 'Структура:\n';
        Object.keys(codeFiles).slice(0, 20).forEach(filename => {
            const file = codeFiles[filename];
            context += `• ${filename} (${file.language}, ${file.size} символів)${file.modified ? ' [змінено]' : ''}\n`;
        });
        
        // If user mentions specific files, add their content
        const mentionedFiles = Object.keys(codeFiles).filter(filename => 
            userMessage.toLowerCase().includes(filename.toLowerCase()) ||
            userMessage.toLowerCase().includes(filename.split('/').pop().toLowerCase())
        );
        
        if (mentionedFiles.length > 0) {
            context += '\n--- ЗГАДАНІ ФАЙЛИ ---\n';
            mentionedFiles.forEach(filename => {
                const file = codeFiles[filename];
                context += `\n// FILE: ${filename}\n`;
                context += file.code.substring(0, 3000); // Limit size
                if (file.code.length > 3000) {
                    context += '\n... (скорочено)';
                }
                context += '\n';
            });
        }
        // If active file is open, add it
        else if (activeFile && codeFiles[activeFile]) {
            context += '\n--- АКТИВНИЙ ФАЙЛ ---\n';
            context += `// FILE: ${activeFile}\n`;
            context += codeFiles[activeFile].code.substring(0, 3000);
            if (codeFiles[activeFile].code.length > 3000) {
                context += '\n... (скорочено)';
            }
        }
    }
    
    return context;
}

// Extract and apply code changes
function extractAndApplyCode(text) {
    // Method 1: Look for // FILE: markers
    const fileMarkers = text.match(/\/\/\s*FILE:\s*(.+?)(?:\n|$)/gi);
    
    if (fileMarkers) {
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
                if (!codeHistory[filename]) {
                    codeHistory[filename] = [];
                }
                if (codeFiles[filename]) {
                    codeHistory[filename].push(codeFiles[filename].code);
                }
                
                codeFiles[filename] = {
                    language: language,
                    code: codeBlock,
                    size: codeBlock.length,
                    modified: true
                };
            }
            
            currentPos = nextMarkerPos;
        });
        
        if (Object.keys(codeFiles).length > 0) {
            displayCodeFiles();
        }
        return;
    }
    
    // Method 2: Traditional code blocks
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let fileIndex = Object.keys(codeFiles).length;
    
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
        if (!codeHistory[filename]) {
            codeHistory[filename] = [];
        }
        if (codeFiles[filename]) {
            codeHistory[filename].push(codeFiles[filename].code);
        }
        
        codeFiles[filename] = {
            language: lang,
            code: code,
            size: code.length,
            modified: true
        };
    }
    
    if (Object.keys(codeFiles).length > 0) {
        displayCodeFiles();
    }
}

// ========================================
// FILE MANAGEMENT
// ========================================

function displayCodeFiles() {
    const contentDiv = document.getElementById('codeContent');
    const tabsDiv = document.getElementById('fileTabs');
    const fileNav = document.getElementById('fileNavigation');
    const fileSelector = document.getElementById('fileSelector');
    
    if (!contentDiv) return;
    
    // Clear previous content
    if (tabsDiv) tabsDiv.innerHTML = '';
    contentDiv.innerHTML = '';
    
    if (Object.keys(codeFiles).length === 0) {
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
    
    const filenames = Object.keys(codeFiles).sort();
    
    // Update file selector
    if (fileSelector) {
        fileSelector.innerHTML = '<option value="">Виберіть файл...</option>' +
            filenames.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
        if (activeFile) {
            fileSelector.value = activeFile;
        }
    }
    
    filenames.forEach((filename, index) => {
        const file = codeFiles[filename];
        
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
        
        const highlightedCode = typeof Prism !== 'undefined' ? 
            Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language) :
            escapeHtml(file.code);
        
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${escapeHtml(file.language)}</span>
                        <span class="code-block-name">${escapeHtml(filename)}</span>
                        ${file.modified ? '<span style="color: #f59e0b; font-size: 12px;">● змінено</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${codeHistory[filename] && codeHistory[filename].length > 0 ? 
                            `<button onclick="revertFile('${escapeHtml(filename)}')">↶ Відмінити</button>` : ''}
                        <button onclick="editFile('${escapeHtml(filename)}')">✏️ Редагувати</button>
                        <button onclick="copyCode('${escapeHtml(filename)}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${escapeHtml(filename)}')">💾 Завантажити</button>
                    </div>
                </div>
                <pre><code class="language-${escapeHtml(file.language)}" id="code-${escapeHtml(filename)}">${highlightedCode}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    if (!activeFile) {
        activeFile = filenames[0];
    }
    
    // Show version control if file has history
    const versionControl = document.getElementById('versionControl');
    if (versionControl && activeFile && codeHistory[activeFile] && codeHistory[activeFile].length > 0) {
        versionControl.style.display = 'block';
        const versionInfo = document.getElementById('versionInfo');
        if (versionInfo) {
            versionInfo.textContent = `v${codeHistory[activeFile].length + 1}/${codeHistory[activeFile].length + 1}`;
        }
    } else if (versionControl) {
        versionControl.style.display = 'none';
    }
    
    // Auto-open code panel
    const codeSection = document.getElementById('codeSection');
    if (codeSection && codeSection.classList.contains('collapsed')) {
        if (typeof toggleCodePanel === 'function') {
            toggleCodePanel();
        }
    }
}

function switchFile(filename) {
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
    const selector = document.getElementById('fileSelector');
    if (selector) {
        selector.value = filename;
    }
    
    // Update version control
    const versionControl = document.getElementById('versionControl');
    if (versionControl) {
        if (codeHistory[filename] && codeHistory[filename].length > 0) {
            versionControl.style.display = 'block';
            const versionInfo = document.getElementById('versionInfo');
            if (versionInfo) {
                versionInfo.textContent = `v${codeHistory[filename].length + 1}/${codeHistory[filename].length + 1}`;
            }
        } else {
            versionControl.style.display = 'none';
        }
    }
}

function editFile(filename) {
    const file = codeFiles[filename];
    if (!file) return;
    
    const newCode = prompt(`✏️ Редагувати ${filename}:\n\n(Для великих змін краще використати AI)`, file.code);
    
    if (newCode !== null && newCode !== file.code) {
        // Save to history
        if (!codeHistory[filename]) {
            codeHistory[filename] = [];
        }
        codeHistory[filename].push(file.code);
        
        file.code = newCode;
        file.size = newCode.length;
        file.modified = true;
        
        displayCodeFiles();
    }
}

function revertFile(filename) {
    const history = codeHistory[filename];
    if (!history || history.length === 0) return;
    
    if (!confirm(`↶ Відмінити зміни в ${filename}?`)) return;
    
    const previousVersion = history.pop();
    codeFiles[filename].code = previousVersion;
    codeFiles[filename].size = previousVersion.length;
    
    displayCodeFiles();
}

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

function downloadFile(filename) {
    const file = codeFiles[filename];
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

async function downloadAllAsZip() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає файлів!');
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
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function removeCodeBlocks(text) {
    return text.replace(/```[\s\S]*?```/g, '').trim();
}

function detectFilename(code, lang) {
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

// ========================================
// INITIALIZATION
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Enhanced DeepSeek готовий');
});

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
