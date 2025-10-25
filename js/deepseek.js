// 💻 DeepSeek Coder - ВИПРАВЛЕНО (saveCodeFile exported)

class DeepSeekCoder {
    constructor() {
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.maxHistoryLength = 40;
        this.isProcessing = false;
        this.abortController = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHistory();
        console.log('✅ DeepSeek Coder initialized');
    }

    setupEventListeners() {
        const input = document.getElementById('deepseekInput');
        const sendBtn = document.getElementById('deepseekSendBtn');

        if (input) {
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey && !this.isProcessing) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            newBtn.addEventListener('click', () => {
                if (!this.isProcessing) {
                    this.sendMessage();
                }
            });
        }

        if (window.appState) {
            appState.on('deepseek:clear', () => this.clearUI());
            appState.on('codeFile:set', () => this.displayCodeFiles());
        }
    }

    async sendMessage() {
        if (this.isProcessing) {
            if (window.showToast) {
                showToast('⏳ Зачекай завершення попереднього запиту', 'warning');
            }
            return;
        }

        const input = document.getElementById('deepseekInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) {
            if (window.showToast) {
                showToast('⚠️ Опиши що створити', 'warning');
            }
            return;
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            if (window.showToast) {
                showToast('🔑 Введи Groq API ключ у налаштуваннях!', 'error');
            }
            if (typeof switchMode === 'function') {
                switchMode('settings');
            }
            return;
        }

        if (window.sanitizer) {
            const validation = sanitizer.validateInput(message, {
                maxLength: 10000,
                required: true,
                allowHTML: false
            });

            if (!validation.valid) {
                if (window.showToast) {
                    showToast(`⚠️ ${validation.errors.join(', ')}`, 'error');
                }
                return;
            }
        }

        input.value = '';
        input.style.height = 'auto';

        this.addUserMessageToState(message);
        this.renderMessage(message, 'user');
        this.setLoading(true);

        try {
            const contextMessage = this.buildProjectContext(message);
            const response = await this.callDeepSeekAPI(apiKey, contextMessage);
            this.processResponse(response);

            if (window.appState) {
                appState.incrementStat('totalTokens', this.estimateTokens(message + response));
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async callDeepSeekAPI(apiKey, message) {
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            const history = window.appState ? appState.getDeepSeekHistory() : [];
            const systemPrompt = window.appState ?
                appState.getSetting('deepseekSystemPrompt') :
                localStorage.getItem('deepseek_system_prompt') ||
                'Ти експерт-програміст. Пиши чистий код з коментарями.';

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 8000,
                top_p: 0.95
            };

            let response;
            if (window.errorHandler) {
                response = await errorHandler.fetchWithRetry(
                    this.apiEndpoint,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody),
                        signal: this.abortController.signal,
                        timeout: 45000
                    }
                );
            } else {
                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: this.abortController.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
                }
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response format');
            }

            const aiMessage = data.choices[0].message.content;

            if (!aiMessage) {
                throw new Error('Empty response from API');
            }

            return aiMessage;

        } catch (error) {
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'api_error',
                    message: 'DeepSeek API call failed',
                    error: error.message,
                    severity: 'high',
                    context: 'DeepSeekCoder.callDeepSeekAPI'
                });
            }

            throw error;
        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    processResponse(response) {
        this.addAssistantMessageToState(response);
        const textOnly = this.removeCodeBlocks(response);
        
        if (textOnly.trim()) {
            this.renderMessage(textOnly, 'assistant');
        }

        const filesExtracted = this.extractAndApplyCode(response);

        if (filesExtracted > 0) {
            if (window.showToast) {
                showToast(`✅ Створено ${filesExtracted} файлів`, 'success');
            }
        }

        this.scrollToBottom();
    }

    buildProjectContext(userMessage) {
        let context = userMessage;
        
        const files = window.appState ? appState.getAllCodeFiles() : {};
        const projectContext = window.appState ? appState.getProjectContext() : null;

        const MAX_CONTEXT_LENGTH = 50000;
        const MAX_FILE_PREVIEW = 2000;
        const MAX_FILES_TO_INCLUDE = 5;

        if (projectContext && Object.keys(files).length > 0) {
            let projectInfo = '\n\n--- КОНТЕКСТ ПРОЕКТУ ---\n';
            
            if (projectContext.repo) {
                projectInfo += `Репозиторій: ${projectContext.owner}/${projectContext.repo}\n`;
            }
            
            projectInfo += `Файлів: ${Object.keys(files).length}\n\n`;
            projectInfo += 'Структура:\n';
            
            Object.keys(files).slice(0, 30).forEach(filename => {
                const file = files[filename];
                const size = file.code ? `${(file.code.length / 1024).toFixed(1)}KB` : '0KB';
                projectInfo += `• ${filename} (${file.language || 'unknown'}, ${size})${file.modified ? ' [змінено]' : ''}\n`;
            });
            
            if (Object.keys(files).length > 30) {
                projectInfo += `... та ще ${Object.keys(files).length - 30} файлів\n`;
            }
            
            if ((context + projectInfo).length > MAX_CONTEXT_LENGTH) {
                projectInfo = projectInfo.substring(0, 2000) + '\n... (структуру скорочено)\n';
            }
            
            context += projectInfo;
            
            const mentionedFiles = this.selectRelevantFiles(userMessage, files, MAX_FILES_TO_INCLUDE);
            
            if (mentionedFiles.length > 0) {
                context += '\n--- РЕЛЕВАНТНІ ФАЙЛИ ---\n';
                
                let filesAdded = 0;
                for (const filename of mentionedFiles) {
                    const file = files[filename];
                    if (!file || !file.code) continue;
                    
                    let fileContent = `\n// FILE: ${filename}\n`;
                    const code = file.code;
                    
                    if (code.length > MAX_FILE_PREVIEW) {
                        const half = Math.floor(MAX_FILE_PREVIEW / 2);
                        fileContent += code.substring(0, half);
                        fileContent += '\n\n... (середину скорочено) ...\n\n';
                        fileContent += code.substring(code.length - half);
                        fileContent += `\n// Повний розмір: ${(code.length / 1024).toFixed(1)}KB`;
                    } else {
                        fileContent += code;
                    }
                    
                    if ((context + fileContent).length > MAX_CONTEXT_LENGTH) {
                        context += `\n// Файл ${filename} пропущено (ліміт контексту)\n`;
                        break;
                    }
                    
                    context += fileContent;
                    filesAdded++;
                    
                    if (filesAdded >= MAX_FILES_TO_INCLUDE) {
                        if (mentionedFiles.length > filesAdded) {
                            context += `\n// Ще ${mentionedFiles.length - filesAdded} файлів доступні\n`;
                        }
                        break;
                    }
                }
            }
        }
        
        if (context.length > MAX_CONTEXT_LENGTH) {
            context = context.substring(0, MAX_CONTEXT_LENGTH);
            context += '\n\n... (контекст обрізано)\n';
        }
        
        return context;
    }

    selectRelevantFiles(userMessage, files, maxFiles) {
        const messageLower = userMessage.toLowerCase();
        const fileEntries = Object.entries(files);
        
        const scoredFiles = fileEntries.map(([filename, file]) => {
            let score = 0;
            const filenameLower = filename.toLowerCase();
            const basename = filename.split('/').pop().toLowerCase();
            
            if (messageLower.includes(filenameLower)) {
                score += 100;
            } else if (messageLower.includes(basename)) {
                score += 80;
            }
            
            const keywords = ['main', 'index', 'app', 'core', 'config'];
            for (const keyword of keywords) {
                if (filenameLower.includes(keyword)) {
                    score += 30;
                    break;
                }
            }
            
            if (file.modified) score += 20;
            
            if (messageLower.includes('html') && filename.endsWith('.html')) score += 40;
            if (messageLower.includes('css') && filename.endsWith('.css')) score += 40;
            if (messageLower.includes('js') && filename.endsWith('.js')) score += 40;
            
            const fileSize = file.code ? file.code.length : 0;
            if (fileSize < 5000) {
                score += 10;
            } else if (fileSize > 20000) {
                score -= 10;
            }
            
            return { filename, score, size: fileSize };
        });
        
        scoredFiles.sort((a, b) => b.score - a.score);
        
        const selected = scoredFiles
            .filter(f => f.score > 0)
            .slice(0, maxFiles)
            .map(f => f.filename);
        
        if (selected.length === 0) {
            const activeFile = window.appState ? appState.ui.activeFile : null;
            if (activeFile && files[activeFile]) {
                selected.push(activeFile);
            } else {
                selected.push(...scoredFiles.slice(0, 2).map(f => f.filename));
            }
        }
        
        return selected;
    }

    extractAndApplyCode(text) {
        if (!text) return 0;
        
        let filesCreated = 0;

        const fileMarkers = text.match(/\/\/\s*FILE:\s*(.+?)(?:\n|$)/gi);
        
        if (fileMarkers && fileMarkers.length > 0) {
            filesCreated = this.extractFromFileMarkers(text, fileMarkers);
            if (filesCreated > 0) {
                this.displayCodeFiles();
                return filesCreated;
            }
        }

        filesCreated = this.extractFromCodeBlocks(text);
        if (filesCreated > 0) {
            this.displayCodeFiles();
        }

        return filesCreated;
    }

    extractFromFileMarkers(text, markers) {
        let filesCreated = 0;
        let currentPos = 0;
        
        markers.forEach((marker, index) => {
            const filename = marker.replace(/\/\/\s*FILE:\s*/i, '').trim();
            const markerPos = text.indexOf(marker, currentPos);
            const nextMarkerPos = index < markers.length - 1 ? 
                text.indexOf(markers[index + 1], markerPos) : text.length;
            
            let codeBlock = text.substring(markerPos + marker.length, nextMarkerPos).trim();
            codeBlock = codeBlock.replace(/```[\w]*\n?/g, '').replace(/```\n?$/g, '').trim();
            
            if (codeBlock) {
                const ext = filename.split('.').pop();
                const language = this.getLanguageFromExtension(ext);
                
                this.saveCodeFile(filename, codeBlock, language);
                filesCreated++;
            }
            
            currentPos = nextMarkerPos;
        });
        
        return filesCreated;
    }

    extractFromCodeBlocks(text) {
        const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
        let match;
        let filesCreated = 0;
        let fileIndex = Object.keys(window.appState ? appState.getAllCodeFiles() : {}).length;
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const lang = match[1] || 'txt';
            const code = match[2].trim();
            
            if (!code) continue;
            
            let filename = this.detectFilename(code, lang);
            
            if (!filename) {
                fileIndex++;
                filename = `file_${fileIndex}.${this.getExtension(lang)}`;
            }
            
            this.saveCodeFile(filename, code, lang);
            filesCreated++;
        }
        
        return filesCreated;
    }

    // ✅ ВИПРАВЛЕНО: Експортувати saveCodeFile
    saveCodeFile(filename, code, language) {
        if (window.appState) {
            const existing = appState.getCodeFile(filename);
            if (existing && existing.code) {
                appState.addCodeHistory(filename, existing.code);
            }
            
            appState.setCodeFile(filename, {
                language: language,
                code: code,
                size: code.length,
                modified: true
            });
        }
    }

    addUserMessageToState(content) {
        if (window.appState) {
            appState.addDeepSeekMessage('user', content);
        }
    }

    addAssistantMessageToState(content) {
        if (window.appState) {
            appState.addDeepSeekMessage('assistant', content);
        }
    }

    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        let messageElement;

        if (window.sanitizer) {
            messageElement = sanitizer.createMessageElement(text, sender);
        } else {
            messageElement = document.createElement('div');
            messageElement.className = `message ${sender}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = sender === 'user' ? '👤' : '🤖';
            
            const content = document.createElement('div');
            content.className = 'message-content';
            content.textContent = text;
            
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
        }

        messagesDiv.appendChild(messageElement);
    }

    renderMessages() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const history = window.appState ? appState.getDeepSeekHistory() : [];

        history.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.content || '';
            
            const textOnly = this.removeCodeBlocks(content);
            if (textOnly.trim()) {
                this.renderMessage(textOnly, role);
            }
        });

        this.scrollToBottom();
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    displayCodeFiles() {
        const contentDiv = document.getElementById('codeContent');
        const tabsDiv = document.getElementById('fileTabs');
        const fileNav = document.getElementById('fileNavigation');
        const fileSelector = document.getElementById('fileSelector');
        
        if (!contentDiv) return;

        const files = window.appState ? appState.getAllCodeFiles() : {};
        
        if (tabsDiv) tabsDiv.innerHTML = '';
        contentDiv.innerHTML = '';
        
        if (Object.keys(files).length === 0) {
            contentDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3>Немає файлів</h3>
                    <p>Опиши що хочеш створити</p>
                </div>
            `;
            if (fileNav) fileNav.style.display = 'none';
            return;
        }

        if (fileNav) fileNav.style.display = 'block';

        const filenames = Object.keys(files).sort();
        const activeFile = window.appState ? appState.ui.activeFile : null;

        if (fileSelector) {
            fileSelector.innerHTML = '<option value="">Виберіть файл...</option>' +
                filenames.map(f => {
                    const escaped = this.escapeHTML(f);
                    return `<option value="${escaped}">${escaped}</option>`;
                }).join('');
            
            if (activeFile && filenames.includes(activeFile)) {
                fileSelector.value = this.escapeHTML(activeFile);
            }
        }

        filenames.forEach((filename, index) => {
            const file = files[filename];
            if (!file) return;

            const isActive = (activeFile === filename) || (index === 0 && !activeFile);

            if (tabsDiv) {
                const tab = document.createElement('div');
                tab.className = 'file-tab' + (isActive ? ' active' : '');
                
                const tabContent = document.createElement('span');
                tabContent.textContent = filename;
                
                if (file.modified) {
                    const modifiedDot = document.createElement('span');
                    modifiedDot.style.color = '#f59e0b';
                    modifiedDot.textContent = '● ';
                    tab.appendChild(modifiedDot);
                }
                
                tab.appendChild(tabContent);
                tab.addEventListener('click', () => this.switchFile(filename));
                tabsDiv.appendChild(tab);
            }

            this.createFileContent(contentDiv, filename, file, isActive);
        });

        if (!activeFile && filenames.length > 0 && window.appState) {
            appState.setActiveFile(filenames[0]);
        }

        const codeSection = document.getElementById('codeSection');
        if (codeSection && codeSection.classList.contains('collapsed')) {
            if (typeof toggleCodePanel === 'function') {
                toggleCodePanel();
            }
        }
    }

    createFileContent(container, filename, file, isActive) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (isActive ? ' active' : '');
        fileDiv.dataset.filename = filename;

        let highlightedCode = '';
        if (window.sanitizer && file.code) {
            highlightedCode = sanitizer.highlightCode(file.code, file.language || 'plaintext');
        } else if (file.code) {
            highlightedCode = this.escapeHTML(file.code);
        }

        const escapedFilename = this.escapeHTML(filename);
        const escapedLanguage = this.escapeHTML(file.language || 'unknown');

        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.innerHTML = `
            <div class="code-block-header">
                <div class="code-block-info">
                    <span class="code-block-lang">${escapedLanguage}</span>
                    <span class="code-block-name">${escapedFilename}</span>
                    ${file.modified ? '<span style="color: #f59e0b; font-size: 12px;">● змінено</span>' : ''}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="deepseekCoder.editFile('${escapedFilename}')">✏️ Редагувати</button>
                    <button onclick="deepseekCoder.copyCode('${escapedFilename}')">📋 Копіювати</button>
                    <button onclick="deepseekCoder.downloadFile('${escapedFilename}')">💾 Завантажити</button>
                </div>
            </div>
            <pre><code class="language-${escapedLanguage}" id="code-${escapedFilename}">${highlightedCode}</code></pre>
        `;

        fileDiv.appendChild(codeBlock);
        container.appendChild(fileDiv);
    }

    switchFile(filename) {
        if (!filename) return;

        const files = window.appState ? appState.getAllCodeFiles() : {};
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

        if (window.appState) {
            appState.setActiveFile(filename);
        }

        const selector = document.getElementById('fileSelector');
        if (selector) {
            selector.value = this.escapeHTML(filename);
        }
    }

    editFile(filename) {
        const files = window.appState ? appState.getAllCodeFiles() : {};
        const file = files[filename];
        if (!file) return;

        const newCode = prompt(`✏️ Редагувати ${filename}:`, file.code);

        if (newCode !== null && newCode !== file.code) {
            this.saveCodeFile(filename, newCode, file.language);
            this.displayCodeFiles();
            
            if (window.showToast) {
                showToast('✅ Файл оновлено!', 'success');
            }
        }
    }

    copyCode(filename) {
        const files = window.appState ? appState.getAllCodeFiles() : {};
        const code = files[filename]?.code;
        if (!code) return;

        navigator.clipboard.writeText(code).then(() => {
            if (window.showToast) {
                showToast('✅ Код скопійовано!', 'success', 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            if (window.showToast) {
                showToast('❌ Помилка копіювання', 'error');
            }
        });
    }

    downloadFile(filename) {
        const files = window.appState ? appState.getAllCodeFiles() : {};
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

            if (window.showToast) {
                showToast('✅ Файл завантажено!', 'success', 2000);
            }
        } catch (error) {
            console.error('Download error:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження', 'error');
            }
        }
    }

    async downloadAllAsZip() {
        const files = window.appState ? appState.getAllCodeFiles() : {};

        if (Object.keys(files).length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає файлів!', 'warning');
            }
            return;
        }

        if (typeof JSZip === 'undefined') {
            if (window.showToast) {
                showToast('❌ JSZip не завантажено!', 'error');
            }
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

            const projectContext = window.appState ? appState.getProjectContext() : null;
            if (projectContext && projectContext.repo) {
                const readme = `# ${projectContext.repo}\n\nОригінал: ${projectContext.url}\n`;
                zip.file('AI_CHANGES.md', readme);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = projectContext && projectContext.repo ? 
                `${projectContext.repo}_modified.zip` : 'project.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.showToast) {
                showToast('✅ ZIP створено!', 'success');
            }
        } catch (error) {
            console.error('ZIP error:', error);
            if (window.showToast) {
                showToast('❌ Помилка створення ZIP', 'error');
            }
        }
    }

    setLoading(isLoading) {
        const sendBtn = document.getElementById('deepseekSendBtn');
        const input = document.getElementById('deepseekInput');

        if (sendBtn) {
            sendBtn.disabled = isLoading;

            if (isLoading) {
                sendBtn.innerHTML = `
                    <div class="loading-dots">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                `;
            } else {
                sendBtn.textContent = 'Надіслати';
            }
        }

        if (input) {
            input.disabled = isLoading;
        }
    }

    clearUI() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
        }

        const contentDiv = document.getElementById('codeContent');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>Немає файлів</h3>
                    <p>Опиши що хочеш створити</p>
                </div>
            `;
        }

        const tabsDiv = document.getElementById('fileTabs');
        if (tabsDiv) {
            tabsDiv.innerHTML = '';
        }
    }

    getApiKey() {
        if (typeof getGroqApiKey === 'function') {
            return getGroqApiKey();
        }

        if (window.appState) {
            return appState.getApiKey('groq');
        }

        return localStorage.getItem('groq_api_key');
    }

    estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        return Math.ceil(text.length / 3);
    }

    removeCodeBlocks(text) {
        if (!text) return '';
        return text.replace(/```[\s\S]*?```/g, '').trim();
    }

    detectFilename(code, lang) {
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

    getExtension(lang) {
        const extensions = {
            'javascript': 'js', 'typescript': 'ts', 'python': 'py',
            'html': 'html', 'css': 'css', 'json': 'json',
            'java': 'java', 'cpp': 'cpp', 'c': 'c',
            'go': 'go', 'rust': 'rs', 'php': 'php'
        };
        return extensions[lang.toLowerCase()] || 'txt';
    }

    getLanguageFromExtension(ext) {
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

    escapeHTML(text) {
        if (!text) return '';
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleError(error) {
        let message = '❌ Помилка: ';

        if (error.name === 'AbortError') {
            message += 'Запит скасовано';
        } else if (error.message.includes('API key')) {
            message += 'Невірний API ключ';
        } else if (error.message.includes('quota')) {
            message += 'Перевищено ліміт запитів';
        } else if (error.message.includes('network')) {
            message += 'Проблеми з інтернетом';
        } else {
            message += error.message || 'Щось пішло не так';
        }

        if (window.showToast) {
            showToast(message, 'error', 7000);
        }

        this.renderMessage(message, 'assistant');
    }

    loadHistory() {
        if (window.appState) {
            this.renderMessages();
            this.displayCodeFiles();
        }
    }

    clearHistory() {
        if (!confirm('⚠️ Очистити історію та файли?')) return;

        if (window.appState) {
            appState.clearDeepSeekHistory();
        }

        this.clearUI();

        if (window.showToast) {
            showToast('🗑️ Історію очищено', 'success');
        }
    }

    cancelRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.setLoading(false);

            if (window.showToast) {
                showToast('🛑 Запит скасовано', 'info');
            }
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let deepseekCoder = null;

document.addEventListener('DOMContentLoaded', () => {
    deepseekCoder = new DeepSeekCoder();

    // ✅ ВИПРАВЛЕНО: Експортувати всі методи
    window.sendDeepseekMessage = () => deepseekCoder.sendMessage();
    window.clearDeepseekChat = () => deepseekCoder.clearHistory();
    window.downloadAllAsZip = () => deepseekCoder.downloadAllAsZip();
    window.displayCodeFiles = () => deepseekCoder.displayCodeFiles();
    window.switchFile = (filename) => deepseekCoder.switchFile(filename);
    window.editFile = (filename) => deepseekCoder.editFile(filename);
    window.copyCode = (filename) => deepseekCoder.copyCode(filename);
    window.downloadFile = (filename) => deepseekCoder.downloadFile(filename);
    window.cancelDeepseekRequest = () => deepseekCoder.cancelRequest();
});

window.DeepSeekCoder = DeepSeekCoder;
window.deepseekCoder = deepseekCoder;

console.log('✅ DeepSeek Coder loaded (FIXED - saveCodeFile exported)');
