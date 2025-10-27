// 💻 DeepSeek Chat - ПОВНЕ ВИПРАВЛЕННЯ З ВИТЯГУВАННЯМ КОДУ

class DeepSeekChat {
    constructor() {
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.isProcessing = false;
        this.abortController = null;
        this.initialized = false;
        
        console.log('✅ DeepSeek Chat instance created');
    }

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.loadHistory();
        this.initialized = true;
        console.log('✅ DeepSeek Chat initialized');
    }

    setupEventListeners() {
        const input = document.getElementById('deepseekInput');
        const sendBtn = document.getElementById('deepseekSendBtn');

        if (input) {
            input.disabled = false;
            input.readOnly = false;
            
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isProcessing) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.addEventListener('click', () => {
                if (!this.isProcessing) this.sendMessage();
            });
        }

        if (window.chatState) {
            chatState.on('deepseek:clear', () => this.clearUI());
        }
    }

    async sendMessage() {
        if (this.isProcessing) {
            if (window.showToast) showToast('⏳ Зачекай завершення попереднього запиту', 'warning');
            return;
        }

        const input = document.getElementById('deepseekInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) {
            if (window.showToast) showToast('⚠️ Опиши що створити', 'warning');
            return;
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            if (window.showToast) showToast('🔑 Введи Groq API ключ у налаштуваннях!', 'error');
            if (typeof switchMode === 'function') switchMode('settings');
            return;
        }

        input.value = '';
        input.style.height = 'auto';

        if (window.chatState) chatState.addDeepSeekMessage('user', message);
        this.renderMessage(message, 'user');
        this.setLoading(true);

        try {
            const response = await this.callAPI(apiKey, message);
            this.processResponse(response);

            if (window.appState) {
                appState.incrementStat('deepseekRequests');
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async callAPI(apiKey, message) {
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            const history = window.chatState ? chatState.getDeepSeekHistory() : [];
            const systemPrompt = window.appState ?
                appState.getSetting('deepseekSystemPrompt') :
                'Ти експерт-програміст. Пиши чистий код з коментарями. Обгортай код в блоки ```language\nкод\n```';

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const MAX_CONTEXT = 24000;
            while (JSON.stringify(messages).length > MAX_CONTEXT && messages.length > 2) {
                messages.splice(1, 1);
            }

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.5,
                    max_tokens: 8000,
                    top_p: 0.95
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response');
            }

            return data.choices[0].message.content;
        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    processResponse(response) {
        console.log('📝 Processing response...');
        console.log('Response length:', response.length);
        
        if (window.chatState) {
            chatState.addDeepSeekMessage('assistant', response);
        }

        // Витягти текст без коду
        const textOnly = this.removeCodeBlocks(response);
        if (textOnly.trim()) {
            this.renderMessage(textOnly, 'assistant');
        }

        // КРИТИЧНО: Витягти та зберегти код
        const filesExtracted = this.extractAndSaveCode(response);
        
        console.log(`Files extracted: ${filesExtracted}`);
        
        if (filesExtracted > 0) {
            if (window.showToast) {
                showToast(`✅ Створено ${filesExtracted} файлів`, 'success');
            }
            
            // Показати вікно коду
            this.showCodePanel();
            
            // Відобразити файли
            setTimeout(() => {
                if (window.uiController) {
                    uiController.displayFiles();
                } else if (typeof displayCodeFiles === 'function') {
                    displayCodeFiles();
                }
            }, 100);
        }

        this.scrollToBottom();
    }

    extractAndSaveCode(text) {
        let filesCreated = 0;
        
        // Витягти всі code blocks
        const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
        let match;
        let fileIndex = this.getExistingFilesCount();
        
        console.log('Searching for code blocks...');
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const lang = match[1] || 'txt';
            const code = match[2].trim();
            
            console.log(`Found code block: ${lang}, length: ${code.length}`);
            
            if (!code) continue;
            
            // Визначити ім'я файлу
            let filename = this.detectFilename(code, lang);
            
            if (!filename) {
                fileIndex++;
                const ext = this.getExtension(lang);
                filename = `file_${fileIndex}.${ext}`;
            }
            
            console.log(`Saving file: ${filename}`);
            
            // КРИТИЧНО: Зберегти файл
            this.saveFile(filename, code, lang);
            filesCreated++;
        }
        
        console.log(`Total files created: ${filesCreated}`);
        return filesCreated;
    }

    saveFile(filename, code, language) {
        if (!window.appState) {
            console.error('❌ appState not available');
            return;
        }

        const fileData = {
            language: language || 'plaintext',
            code: code,
            size: code.length,
            modified: true,
            created: Date.now(),
            updated: Date.now()
        };
        
        appState.setCodeFile(filename, fileData);
        console.log(`✅ Saved: ${filename} (${code.length} chars)`);
    }

    detectFilename(code, lang) {
        const trimmed = code.trim();
        
        // HTML
        if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
            return 'index.html';
        }
        
        // CSS
        if (lang === 'css' || /^[.#\w-]+\s*\{/.test(trimmed)) {
            return 'styles.css';
        }
        
        // JavaScript
        if (lang === 'javascript' || lang === 'js') {
            if (trimmed.includes('import React')) return 'App.jsx';
            return 'script.js';
        }
        
        // Python
        if (lang === 'python' || lang === 'py') {
            return 'app.py';
        }
        
        return null;
    }

    getExtension(lang) {
        const map = {
            'javascript': 'js', 'typescript': 'ts', 'python': 'py',
            'html': 'html', 'css': 'css', 'json': 'json'
        };
        return map[lang.toLowerCase()] || 'txt';
    }

    getExistingFilesCount() {
        if (window.appState) {
            return Object.keys(appState.getAllCodeFiles()).length;
        }
        return 0;
    }

    showCodePanel() {
        const codeSection = document.getElementById('codeSection');
        if (codeSection) {
            codeSection.style.display = 'flex';
            codeSection.classList.remove('collapsed');
        }
    }

    removeCodeBlocks(text) {
        if (!text) return '';
        return text.replace(/```[\s\S]*?```/g, '').trim();
    }

    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        const emptyState = messagesDiv.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.style.cssText = `
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            padding: 16px;
            background: ${sender === 'user' ? 'var(--bg-secondary)' : 'transparent'};
            border-radius: 12px;
        `;
        
        const avatar = document.createElement('div');
        avatar.style.cssText = 'font-size: 24px; flex-shrink: 0;';
        avatar.textContent = sender === 'user' ? '👤' : '💻';
        
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            color: var(--text-primary);
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        content.textContent = text;
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        messagesDiv.appendChild(messageElement);
        
        this.scrollToBottom();
    }

    loadHistory() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';
        const messages = window.chatState ? chatState.getDeepSeekMessages() : [];

        if (messages.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 64px; margin-bottom: 20px;">💻</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 10px;">DeepSeek Coder</h3>
                    <p>Опишіть що хочете створити</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.content || '';
            const textOnly = this.removeCodeBlocks(content);
            if (textOnly.trim()) {
                this.renderMessage(textOnly, role);
            }
        });

        this.scrollToBottom();
    }

    clearUI() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 64px; margin-bottom: 20px;">💻</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 10px;">DeepSeek Coder</h3>
                    <p>Опишіть що хочете створити</p>
                </div>
            `;
        }
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    setLoading(isLoading) {
        const sendBtn = document.getElementById('deepseekSendBtn');
        const input = document.getElementById('deepseekInput');

        if (sendBtn) {
            sendBtn.disabled = isLoading;
            sendBtn.textContent = isLoading ? '⏳ Генерація...' : 'Створити';
        }

        if (input) {
            input.disabled = isLoading;
        }
    }

    async saveConversation() {
        if (!window.chatState) {
            if (window.showToast) showToast('❌ ChatState недоступний', 'error');
            return;
        }

        const messages = chatState.getDeepSeekMessages();
        if (messages.length === 0) {
            if (window.showToast) showToast('⚠️ Немає повідомлень', 'warning');
            return;
        }

        const title = prompt('Введіть назву проекту:', `DeepSeek - ${new Date().toLocaleDateString('uk-UA')}`);
        if (!title) return;

        try {
            const result = await chatState.saveChat('deepseek', title);
            if (result) {
                if (window.showToast) showToast('✅ Проект збережено!', 'success');
            }
        } catch (error) {
            console.error('Save error:', error);
            if (window.showToast) showToast('❌ Помилка збереження', 'error');
        }
    }

    clearHistory() {
        if (!window.chatState) return;
        
        const confirmed = confirm('⚠️ Очистити історію та файли?');
        if (confirmed) {
            chatState.clearDeepSeekChat();
            chatState.clearCodeFiles();
            this.clearUI();
            
            if (window.uiController) {
                uiController.displayFiles();
            }
            
            if (window.showToast) showToast('🗑️ Історію очищено', 'success');
        }
    }

    getApiKey() {
        if (window.appState) return appState.getApiKey('groq');
        return localStorage.getItem('groq_api_key');
    }

    handleError(error) {
        let message = '❌ Помилка: ';
        if (error.name === 'AbortError') message += 'Запит скасовано';
        else if (error.message.includes('API key')) message += 'Невірний API ключ';
        else message += error.message || 'Щось пішло не так';

        if (window.showToast) showToast(message, 'error', 7000);
        this.renderMessage(message, 'assistant');
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

if (!window.deepseekChat) {
    window.deepseekChat = new DeepSeekChat();
    window.DeepSeekChat = DeepSeekChat;
}

window.sendDeepseekMessage = () => {
    if (window.deepseekChat?.initialized) window.deepseekChat.sendMessage();
};

window.clearDeepseekChat = () => {
    if (window.deepseekChat?.initialized) window.deepseekChat.clearHistory();
};

window.saveDeepseekProject = () => {
    if (window.deepseekChat?.initialized) window.deepseekChat.saveConversation();
};

window.toggleCodeSection = function() {
    const codeSection = document.getElementById('codeSection');
    if (codeSection) {
        const isHidden = codeSection.style.display === 'none';
        codeSection.style.display = isHidden ? 'flex' : 'none';
        if (!isHidden) codeSection.classList.add('collapsed');
        else codeSection.classList.remove('collapsed');
    }
};

console.log('✅ DeepSeek Chat COMPLETE - Ready!');
