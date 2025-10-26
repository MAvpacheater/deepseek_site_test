// 💻 DeepSeek Chat - ВИПРАВЛЕНА ВЕРСІЯ

class DeepSeekChat {
    constructor() {
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.isProcessing = false;
        this.abortController = null;
        this.initialized = false;
        
        console.log('✅ DeepSeek Chat instance created');
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        if (this.initialized) {
            console.warn('⚠️ DeepSeek Chat already initialized');
            return;
        }

        this.setupEventListeners();
        this.initialized = true;
        console.log('✅ DeepSeek Chat initialized');
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
            // Видалити старі обробники
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            // Додати новий обробник
            newBtn.addEventListener('click', () => {
                if (!this.isProcessing) {
                    this.sendMessage();
                }
            });
        }

        // Підписатися на зміни в chatState
        if (window.chatState) {
            chatState.on('deepseek:clear', () => this.clearUI());
        }
    }

    // ========================================
    // SEND MESSAGE
    // ========================================

    async sendMessage() {
        if (this.isProcessing) {
            if (window.showToast) {
                showToast('⏳ Зачекай завершення попереднього запиту', 'warning');
            }
            return;
        }

        const input = document.getElementById('deepseekInput');
        if (!input) {
            console.error('❌ deepseekInput not found');
            return;
        }

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

        // Валідація
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

        // Додати повідомлення через chatState
        if (window.chatState) {
            chatState.addDeepSeekMessage('user', message);
        }

        this.setLoading(true);

        try {
            const response = await this.callAPI(apiKey, message);
            this.processResponse(response);

            // Оновити статистику
            if (window.appState) {
                appState.incrementStat('deepseekRequests');
                appState.incrementStat('totalTokens', this.estimateTokens(message + response));
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    // ========================================
    // API CALL
    // ========================================

    async callAPI(apiKey, message) {
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            const history = window.chatState ? 
                chatState.getDeepSeekHistory() : 
                [];

            const systemPrompt = window.appState ?
                appState.getSetting('deepseekSystemPrompt') :
                'Ти експерт-програміст. Пиши чистий код з коментарями.';

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            // Обрізати якщо занадто великий
            const MAX_CONTEXT = 24000;
            while (JSON.stringify(messages).length > MAX_CONTEXT && messages.length > 2) {
                messages.splice(1, 1);
            }

            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 8000,
                top_p: 0.95
            };

            const response = await fetch(this.apiEndpoint, {
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
            console.error('DeepSeek API error:', error);
            throw error;
        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    // ========================================
    // PROCESS RESPONSE
    // ========================================

    processResponse(response) {
        // Додати відповідь через chatState
        if (window.chatState) {
            chatState.addDeepSeekMessage('assistant', response);
        }

        // Витягти текст без коду
        const textOnly = this.removeCodeBlocks(response);
        
        if (textOnly.trim()) {
            this.renderMessage(textOnly, 'assistant');
        }

        // Передати код в code-editor
        if (window.codeExtractor) {
            const filesExtracted = codeExtractor.extractAndApply(response);
            
            if (filesExtracted > 0) {
                if (window.showToast) {
                    showToast(`✅ Створено ${filesExtracted} файлів`, 'success');
                }
                
                // Відобразити файли через uiController
                if (window.uiController) {
                    uiController.displayFiles();
                }
            }
        }

        this.scrollToBottom();
    }

    removeCodeBlocks(text) {
        if (!text) return '';
        return text.replace(/```[\s\S]*?```/g, '').trim();
    }

    // ========================================
    // UI MANAGEMENT
    // ========================================

    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        // Видалити empty state якщо є
        const emptyState = messagesDiv.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '💻';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);

        messagesDiv.appendChild(messageElement);
    }

    loadHistory() {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const messages = window.chatState ? 
            chatState.getDeepSeekMessages() : 
            [];

        if (messages.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">💻</div>
                    <h3>DeepSeek Coder</h3>
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
                <div class="empty-state">
                    <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">💻</div>
                    <h3>DeepSeek Coder</h3>
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

            if (isLoading) {
                sendBtn.innerHTML = `
                    <div class="loading-dots">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                `;
            } else {
                sendBtn.textContent = 'Створити';
            }
        }

        if (input) {
            input.disabled = isLoading;
        }
    }

    // ========================================
    // UTILITY
    // ========================================

    getApiKey() {
        if (window.appState) {
            return appState.getApiKey('groq');
        }
        return localStorage.getItem('groq_api_key');
    }

    estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        return Math.ceil(text.length / 3);
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

    clearHistory() {
        if (!confirm('⚠️ Очистити історію та файли?')) return;

        if (window.chatState) {
            chatState.clearDeepSeekChat();
            chatState.clearCodeFiles();
        }

        this.clearUI();

        if (window.uiController) {
            uiController.displayFiles();
        }

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
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР ТА ЕКСПОРТ
// ========================================

// Створити глобальний екземпляр
if (!window.deepseekChat) {
    window.deepseekChat = new DeepSeekChat();
    window.DeepSeekChat = DeepSeekChat;
}

// Глобальні функції для сумісності
window.sendDeepseekMessage = () => {
    if (window.deepseekChat && window.deepseekChat.initialized) {
        window.deepseekChat.sendMessage();
    }
};

window.clearDeepseekChat = () => {
    if (window.deepseekChat && window.deepseekChat.initialized) {
        window.deepseekChat.clearHistory();
    }
};

console.log('✅ DeepSeek Chat module loaded');
