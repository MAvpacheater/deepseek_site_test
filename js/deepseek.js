// 💻 Enhanced DeepSeek Coder with GitHub Integration

let deepseekHistory = [];
let codeFiles = {};
let codeHistory = {};
let activeFile = null;
let projectContext = null;

// GitHub Integration State
let githubState = {
    token: localStorage.getItem('github_token') || null,
    currentRepo: null,
    branch: 'main'
};

// ========================================
// GITHUB INTEGRATION
// ========================================

async function importGitHubRepo() {
    const repoUrl = prompt(
        '🐙 Введи URL GitHub репозиторія:\n\n' +
        'Формати:\n' +
        '• https://github.com/owner/repo\n' +
        '• owner/repo\n\n' +
        'Публічні репозиторії працюють без токену!'
    );
    
    if (!repoUrl) return;
    
    // Parse URL
    let owner, repo;
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
        owner = match[1];
        repo = match[2].replace('.git', '');
    } else if (repoUrl.includes('/')) {
        [owner, repo] = repoUrl.split('/');
    } else {
        alert('❌ Невірний формат!');
        return;
    }
    
    showLoadingOverlay(`📥 Завантаження ${owner}/${repo}...`);
    
    try {
        const headers = githubState.token ? {
            'Authorization': `Bearer ${githubState.token}`,
            'Accept': 'application/vnd.github.v3+json'
        } : {};
        
        // Get repository tree
        let treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        let response = await fetch(treeUrl, { headers });
        
        if (!response.ok && response.status === 404) {
            treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            response = await fetch(treeUrl, { headers });
        }
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Rate limit exceeded. Додай GitHub токен у налаштуваннях.');
            }
            throw new Error('Репозиторій не знайдено або він приватний.');
        }
        
        const data = await response.json();
        const files = data.tree.filter(item => item.type === 'blob');
        
        // Filter code files
        const codeExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass',
            '.json', '.md', '.py', '.java', '.cpp', '.c', '.go', '.rs',
            '.php', '.rb', '.swift', '.kt', '.vue', '.svelte'
        ];
        
        const codeFilesOnly = files.filter(file => {
            const hasValidExt = codeExtensions.some(ext => file.path.endsWith(ext));
            const notIgnored = !file.path.includes('node_modules') &&
                             !file.path.includes('.git') &&
                             !file.path.includes('dist') &&
                             !file.path.includes('build') &&
                             !file.path.includes('.next') &&
                             !file.path.includes('package-lock.json');
            return hasValidExt && notIgnored;
        });
        
        if (codeFilesOnly.length === 0) {
            throw new Error('Не знайдено файлів коду!');
        }
        
        // Limit files
        const MAX_FILES = 50;
        const filesToLoad = codeFilesOnly.slice(0, MAX_FILES);
        
        if (codeFilesOnly.length > MAX_FILES) {
            const proceed = confirm(
                `⚠️ Знайдено ${codeFilesOnly.length} файлів.\n\n` +
                `Завантажити перші ${MAX_FILES}?`
            );
            if (!proceed) {
                hideLoadingOverlay();
                return;
            }
        }
        
        // Load files content
        codeFiles = {};
        let loadedCount = 0;
        
        for (const file of filesToLoad) {
            updateLoadingOverlay(`${++loadedCount}/${filesToLoad.length}: ${file.path}`);
            
            try {
                const branch = githubState.branch;
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
                const contentResponse = await fetch(rawUrl);
                
                if (contentResponse.ok) {
                    const content = await contentResponse.text();
                    const ext = file.path.split('.').pop();
                    
                    codeFiles[file.path] = {
                        language: getLanguageFromExtension(ext),
                        code: content,
                        size: content.length,
                        modified: false
                    };
                }
            } catch (err) {
                console.warn(`Failed to load ${file.path}:`, err);
            }
            
            // Rate limiting protection
            await new Promise(r => setTimeout(r, 50));
        }
        
        // Save project context
        projectContext = {
            owner: owner,
            repo: repo,
            branch: githubState.branch,
            filesCount: Object.keys(codeFiles).length,
            url: `https://github.com/${owner}/${repo}`
        };
        
        githubState.currentRepo = { owner, repo };
        
        hideLoadingOverlay();
        
        // Switch to DeepSeek mode
        switchMode('deepseek');
        displayCodeFiles();
        
        // Add success message
        addGitHubSuccessMessage(owner, repo, Object.keys(codeFiles).length);
        
        alert(
            `✅ Репозиторій завантажено!\n\n` +
            `📁 ${Object.keys(codeFiles).length} файлів\n` +
            `📦 ${owner}/${repo}`
        );
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('GitHub error:', error);
        alert('❌ Помилка:\n' + error.message);
    }
}

function addGitHubSuccessMessage(owner, repo, filesCount) {
    const messagesDiv = document.getElementById('deepseekMessages');
    if (!messagesDiv) return;
    
    const msg = document.createElement('div');
    msg.className = 'message assistant';
    msg.style.cssText = `
        background: linear-gradient(135deg, #2ea043 0%, #238636 100%);
        padding: 20px;
        border-radius: 12px;
        color: white;
        margin-bottom: 20px;
    `;
    
    msg.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center;">
            <div style="font-size: 48px;">🐙</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px;">Репозиторій завантажено з GitHub</h3>
                <p style="margin: 0 0 8px 0; opacity: 0.9;">📦 ${owner}/${repo}</p>
                <p style="margin: 0 0 12px 0; opacity: 0.9;">📁 ${filesCount} файлів</p>
                <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">💡 Тепер можеш:</p>
                    <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.8;">
                        <li>Редагувати кілька файлів одночасно</li>
                        <li>Аналізувати код на помилки</li>
                        <li>Рефакторити та оптимізувати</li>
                        <li>Генерувати тести</li>
                        <li>Додавати нові функції</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

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

    if (deepseekHistory.length > 20) {
        deepseekHistory = deepseekHistory.slice(-20);
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
        
        displayCodeFiles();
        return;
    }
    
    // Method 2: Traditional code blocks
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
    const tabsDiv = document.getElementById('fileTabs');
    const contentDiv = document.getElementById('codeContent');
    
    if (!tabsDiv || !contentDiv) return;
    
    tabsDiv.innerHTML = '';
    contentDiv.innerHTML = '';
    
    if (Object.keys(codeFiles).length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>Немає файлів</h3>
                <p>Завантаж проект з GitHub або створи новий</p>
            </div>
        `;
        return;
    }
    
    const filenames = Object.keys(codeFiles).sort();
    
    filenames.forEach((filename, index) => {
        const file = codeFiles[filename];
        
        // Create tab
        const tab = document.createElement('div');
        tab.className = 'file-tab' + (index === 0 ? ' active' : '');
        tab.innerHTML = `
            ${file.modified ? '<span style="color: #f59e0b;">●</span> ' : ''}
            ${filename}
        `;
        tab.onclick = () => switchFile(filename);
        tabsDiv.appendChild(tab);
        
        // Create content
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (index === 0 ? ' active' : '');
        fileDiv.dataset.filename = filename;
        
        const highlightedCode = typeof Prism !== 'undefined' ? 
            Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language) :
            escapeHtml(file.code);
        
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${file.language}</span>
                        <span class="code-block-name">${filename}</span>
                        ${file.modified ? '<span style="color: #f59e0b; font-size: 12px;">● змінено</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        ${codeHistory[filename] && codeHistory[filename].length > 0 ? 
                            `<button onclick="revertFile('${escapeHtml(filename)}')">↶ Відмінити</button>` : ''}
                        <button onclick="editFile('${escapeHtml(filename)}')">✏️ Редагувати</button>
                        <button onclick="copyCode('${escapeHtml(filename)}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${escapeHtml(filename)}')">💾 Завантажити</button>
                    </div>
                </div>
                <pre><code class="language-${file.language}" id="code-${escapeHtml(filename)}">${highlightedCode}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    activeFile = filenames[0];
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

function showLoadingOverlay(message) {
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
            z-index: 9999; display: flex; flex-direction: column;
            align-items: center; justify-content: center; color: white;
        `;
        overlay.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">🐙</div>
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 10px;" id="loading-title">Завантаження...</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.7);" id="loading-subtitle"></div>
            <div style="margin-top: 30px;">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    const title = document.getElementById('loading-title');
    if (title) title.textContent = message;
    overlay.style.display = 'flex';
}

function updateLoadingOverlay(message) {
    const subtitle = document.getElementById('loading-subtitle');
    if (subtitle) subtitle.textContent = message;
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
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

// ========================================
// INITIALIZATION
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    // Add GitHub button to header
    const codeHeader = document.querySelector('#deepseekMode .code-header');
    if (codeHeader) {
        const actions = codeHeader.querySelector('.code-actions');
        if (actions && !document.getElementById('github-import-btn')) {
            const githubBtn = document.createElement('button');
            githubBtn.id = 'github-import-btn';
            githubBtn.textContent = '🐙 GitHub';
            githubBtn.title = 'Завантажити репозиторій з GitHub';
            githubBtn.onclick = importGitHubRepo;
            githubBtn.style.cssText = `
                background: rgba(46, 160, 67, 0.2);
                color: white;
                border: 1px solid #2ea043;
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
            `;
            actions.insertBefore(githubBtn, actions.firstChild);
        }
    }
    
    console.log('✅ Enhanced DeepSeek ready');
});

// Export functions
window.importGitHubRepo = importGitHubRepo;
window.sendDeepseekMessage = sendDeepseekMessage;
window.displayCodeFiles = displayCodeFiles;
window.downloadAllAsZip = downloadAllAsZip;
window.codeFiles = codeFiles;
