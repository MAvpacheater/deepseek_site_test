// 💻 DeepSeek Coder - ВИПРАВЛЕНО (без подвійного рендерингу)

class DeepSeekCoder {
    constructor() {
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.maxHistoryLength = 40;
        this.isProcessing = false;
        this.abortController = null;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        this.loadHistory();
        console.log('✅ DeepSeek Coder initialized');
    }

    setupEventListeners() {
        const input = document.getElementById('deepseekInput');
        const sendBtn = document.getElementById('deepseekSendBtn');

        if (input) {
            // Auto-resize
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            });

            // Ctrl+Enter для відправки
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Підписатися на зміни в appState
        if (window.appState) {
            appState.on('deepseek:clear', () => this.clearUI());
            appState.on('codeFile:set', () => this.displayCodeFiles());
        }
    }

    // ========================================
    // ВІДПРАВКА ПОВІДОМЛЕННЯ
    // ========================================

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

        // Перевірити API ключ
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

        // Валідація введення
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

        // Очистити input
        input.value = '';
        input.style.height = 'auto';

        // ✅ ВИПРАВЛЕНО: Додати в appState БЕЗ рендерингу
        this.addUserMessageToState(message);
        
        // ✅ Рендерити тільки ОДИН раз
        this.renderMessage(message, 'user');

        // Показати loading
        this.setLoading(true);

        try {
            // Побудувати контекст з проектом
            const contextMessage = this.buildProjectContext(message);
            
            // Відправити запит
            const response = await this.callDeepSeekAPI(apiKey, contextMessage);
            
            // Обробити відповідь
            this.processResponse(response);

            // Оновити статистику
            if (window.appState) {
                appState.incrementStat('totalTokens', this.estimateTokens(message + response));
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    // ========================================
    // API ВИКЛИКИ
    // ========================================

    async callDeepSeekAPI(apiKey, message) {
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            // Отримати історію
            const history = window.appState ? 
                appState.getDeepSeekHistory() : 
                [];

            // Отримати system prompt
            const systemPrompt = window.appState ?
                appState.getSetting('deepseekSystemPrompt') :
                localStorage.getItem('deepseek_system_prompt') ||
                'Ти експерт-програміст. Пиши чистий код з коментарями. ' +
                'Використовуй формат: // FILE: назва_файлу.js для кожного файлу. ' +
                'Говори українською.';

            // Побудувати запит
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

            // Використати errorHandler для retry
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

            // Валідація відповіді
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response format');
            }

            const aiMessage = data.choices[0].message.content;

            if (!aiMessage) {
                throw new Error('Empty response from API');
            }

            return aiMessage;

        } catch (error) {
            // Логувати помилку
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

    // ========================================
    // ОБРОБКА ВІДПОВІДІ
    // ========================================

    processResponse(response) {
        // ✅ ВИПРАВЛЕНО: Додати в appState БЕЗ рендерингу
        this.addAssistantMessageToState(response);

        // Витягти текст без коду
        const textOnly = this.removeCodeBlocks(response);
        
        // ✅ Рендерити текст тільки ОДИН раз
        if (textOnly.trim()) {
            this.renderMessage(textOnly, 'assistant');
        }

        // Витягти та застосувати код
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
        
        const files = window.appState ? 
            appState.getAllCodeFiles() : 
            {};
        
        const projectContext = window.appState ?
            appState.getProjectContext() :
            null;

        // Якщо є завантажений проект, додати контекст
        if (projectContext && Object.keys(files).length > 0) {
            context += '\n\n--- КОНТЕКСТ ПРОЕКТУ ---\n';
            
            if (projectContext.repo) {
                context += `Репозиторій: ${projectContext.owner}/${projectContext.repo}\n`;
            }
            
            context += `Файлів: ${Object.keys(files).length}\n\n`;
            
            // Додати структуру файлів
            context += 'Структура:\n';
            Object.keys(files).slice(0, 20).forEach(filename => {
                const file = files[filename];
                context += `• ${filename} (${file.language || 'unknown'})${file.modified ? ' [змінено]' : ''}\n`;
            });
            
            // Додати згадані файли
            const mentionedFiles = Object.keys(files).filter(filename => 
                userMessage.toLowerCase().includes(filename.toLowerCase()) ||
                userMessage.toLowerCase().includes(filename.split('/').pop().toLowerCase())
            );
            
            if (mentionedFiles.length > 0 && mentionedFiles.length <= 3) {
                context += '\n--- ЗГАДАНІ ФАЙЛИ ---\n';
                mentionedFiles.forEach(filename => {
                    const file = files[filename];
                    context += `\n// FILE: ${filename}\n`;
                    const code = file.code || '';
                    context += code.substring(0, 3000);
                    if (code.length > 3000) {
                        context += '\n... (скорочено)';
                    }
                });
            }
        }
        
        return context;
    }

    extractAndApplyCode(text) {
        if (!text) return 0;
        
        let filesCreated = 0;

        // Метод 1: // FILE: markers
        const fileMarkers = text.match(/\/\/\s*FILE:\s*(.+?)(?:\n|$)/gi);
        
        if (fileMarkers && fileMarkers.length > 0) {
            filesCreated = this.extractFromFileMarkers(text, fileMarkers);
            if (filesCreated > 0) {
                this.displayCodeFiles();
                return filesCreated;
            }
        }

        // Метод 2: Code blocks
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
            
            // Видалити code fences
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

    saveCodeFile(filename, code, language) {
        if (window.appState) {
            // Зберегти в історію перед оновленням
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

    // ========================================
    // УПРАВЛІННЯ ПОВІДОМЛЕННЯМИ - ✅ ВИПРАВЛЕНО
    // ========================================

    // ✅ Додати в appState БЕЗ рендерингу
    addUserMessageToState(content) {
        if (window.appState) {
            appState.addDeepSeekMessage('user', content);
        }
    }

    // ✅ Додати в appState БЕЗ рендерингу
    addAssistantMessageToState(content) {
        if (window.appState) {
            appState.addDeepSeekMessage('assistant', content);
        }
    }

    // ✅ Рендерити повідомлення (викликається вручну)
    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        let messageElement;

        // Використати sanitizer для безпечного створення
        if (window.sanitizer) {
            messageElement = sanitizer.createMessageElement(text, sender);
        } else {
            // Fallback
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

    // ✅ Рендерити всі повідомлення з історії
    renderMessages() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const history = window.appState ? 
            appState.getDeepSeekHistory() : 
            [];

        history.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.content || '';
            
            // Показати тільки текст, без коду
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

    // ========================================
    // ВІДОБРАЖЕННЯ ФАЙЛІВ
    // ========================================

    displayCodeFiles() {
        const contentDiv = document.getElementById('codeContent');
        const tabsDiv = document.getElementById('fileTabs');
        const fileNav = document.getElementById('fileNavigation');
        const fileSelector = document.getElementById('fileSelector');
        
        if (!contentDiv) return;

        const files = window.appState ? 
            appState.getAllCodeFiles() : 
            {};
        
        // Очистити
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

        // Показати навігацію
        if (fileNav) fileNav.style.display = 'block';

        const filenames = Object.keys(files).sort();
        const activeFile = window.appState ? appState.ui.activeFile : null;

        // Оновити file selector
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

        // Створити tabs та content
        filenames.forEach((filename, index) => {
            const file = files[filename];
            if (!file) return;

            const isActive = (activeFile === filename) || (index === 0 && !activeFile);

            // Створити tab
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

            // Створити content
            this.createFileContent(contentDiv, filename, file, isActive);
        });

        // Встановити activeFile якщо немає
        if (!activeFile && filenames.length > 0 && window.appState) {
            appState.setActiveFile(filenames[0]);
        }

        // Автоматично відкрити панель коду
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

        // Використати sanitizer для безпечного highlighting
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

        // Оновити tabs
        document.querySelectorAll('.file-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.includes(filename)) {
                tab.classList.add('active');
            }
        });

        // Оновити content
        document.querySelectorAll('.code-file').forEach(file => {
            file.classList.remove('active');
            if (file.dataset.filename === filename) {
                file.classList.add('active');
            }
        });

        // Зберегти activeFile
        if (window.appState) {
            appState.setActiveFile(filename);
        }

        // Оновити selector
        const selector = document.getElementById('fileSelector');
        if (selector) {
            selector.value = this.escapeHTML(filename);
        }
    }

    // ========================================
    // FILE OPERATIONS
    // ========================================

    editFile(filename) {
        const files = window.appState ? appState.getAllCodeFiles() : {};
        const file = files[filename];
        if (!file) return;

        const newCode = prompt(`✏️ Редагувати ${filename}:\n\n(Для великих змін краще використати AI)`, file.code);

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

            // Додати README якщо є GitHub проект
            const projectContext = window.appState ? appState.getProjectContext() : null;
            if (projectContext && projectContext.repo) {
                const readme = `# ${projectContext.repo}\n\n` +
                    `Оригінальний репозиторій: ${projectContext.url}\n\n` +
                    `Змінено через AI Assistant Hub\n`;
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

    // ========================================
    // UI УПРАВЛІННЯ
    // ========================================

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

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

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

        // ✅ ВИПРАВЛЕНО: Показати toast ОДИН раз
        if (window.showToast) {
            showToast(message, 'error', 7000);
        }

        // ✅ ВИПРАВЛЕНО: Додати в чат ОДИН раз
        this.renderMessage(message, 'assistant');
    }

    // ========================================
    // HISTORY MANAGEMENT
    // ========================================

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

    // Експортувати функції для сумісності
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

// Експорт класу
window.DeepSeekCoder = DeepSeekCoder;
window.deepseekCoder = deepseekCoder;

console.log('✅ DeepSeek Coder module loaded (FIXED - no double rendering)');
