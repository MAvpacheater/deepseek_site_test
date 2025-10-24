// ✨ Gemini Chat - ВИПРАВЛЕНО

class GeminiChat {
    constructor() {
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        this.maxHistoryLength = 20;
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
        console.log('✅ Gemini Chat initialized');
    }

    setupEventListeners() {
        const input = document.getElementById('geminiInput');
        const sendBtn = document.getElementById('geminiSendBtn');

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
            appState.on('gemini:message', () => {
                // НЕ рендерити тут - вже зроблено в addUserMessage/addAssistantMessage
            });
            appState.on('gemini:clear', () => this.clearUI());
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

        const input = document.getElementById('geminiInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) {
            if (window.showToast) {
                showToast('⚠️ Введи повідомлення', 'warning');
            }
            return;
        }

        // Перевірити API ключ
        const apiKey = this.getApiKey();
        if (!apiKey) {
            if (window.showToast) {
                showToast('🔑 Введи Gemini API ключ у налаштуваннях!', 'error');
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

        // Додати повідомлення користувача
        this.addUserMessage(message);

        // Показати loading
        this.setLoading(true);

        try {
            // Відправити запит
            const response = await this.callGeminiAPI(apiKey, message);
            
            // Додати відповідь AI
            this.addAssistantMessage(response);

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

    async callGeminiAPI(apiKey, message) {
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            // Отримати історію
            const history = window.appState ? 
                appState.getGeminiHistory() : 
                [];

            // Отримати system prompt
            const systemPrompt = window.appState ?
                appState.getSetting('geminiSystemPrompt') :
                localStorage.getItem('gemini_system_prompt') ||
                'Ти корисний AI асістент. Говори українською мовою.';

            // ВИПРАВЛЕНО: Правильний формат для Gemini API
            const requestBody = {
                contents: history,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    topP: 0.95,
                    topK: 40
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };

            // Використати errorHandler для retry
            let response;
            if (window.errorHandler) {
                response = await errorHandler.fetchWithRetry(
                    `${this.apiEndpoint}?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody),
                        signal: this.abortController.signal,
                        timeout: 30000
                    }
                );
            } else {
                // Fallback без errorHandler
                response = await fetch(`${this.apiEndpoint}?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
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
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid API response format');
            }

            const aiMessage = data.candidates[0].content.parts[0].text;

            if (!aiMessage) {
                throw new Error('Empty response from API');
            }

            return aiMessage;

        } catch (error) {
            // Логувати помилку
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'api_error',
                    message: 'Gemini API call failed',
                    error: error.message,
                    severity: 'high',
                    context: 'GeminiChat.callGeminiAPI'
                });
            }

            throw error;
        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    // ========================================
    // УПРАВЛІННЯ ПОВІДОМЛЕННЯМИ
    // ========================================

    addUserMessage(content) {
        if (window.appState) {
            appState.addGeminiMessage('user', content);
        }
        
        // ВИПРАВЛЕНО: рендерити тільки ОДИН раз
        this.renderMessage(content, 'user');
        this.scrollToBottom();
    }

    addAssistantMessage(content) {
        if (window.appState) {
            appState.addGeminiMessage('model', content);
        }
        
        // ВИПРАВЛЕНО: рендерити тільки ОДИН раз
        this.renderMessage(content, 'assistant');
        this.scrollToBottom();

        // Автоматично запам'ятати важливу інформацію
        if (window.agent && content.toLowerCase().includes('важлив')) {
            agent.addMemory({
                type: 'gemini_response',
                content: content.substring(0, 200),
                date: new Date()
            });
        }
    }

    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('geminiMessages');
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

    renderMessages() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const history = window.appState ? 
            appState.getGeminiHistory() : 
            [];

        history.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.parts?.[0]?.text || '';
            if (content) {
                this.renderMessage(content, role);
            }
        });

        this.scrollToBottom();
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    // ========================================
    // UI УПРАВЛІННЯ
    // ========================================

    setLoading(isLoading) {
        const sendBtn = document.getElementById('geminiSendBtn');
        const input = document.getElementById('geminiInput');

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
        const messagesDiv = document.getElementById('geminiMessages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
        }
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    getApiKey() {
        // Використати безпечну функцію
        if (typeof getGeminiApiKey === 'function') {
            return getGeminiApiKey();
        }

        // Fallback
        if (window.appState) {
            return appState.getApiKey('gemini');
        }

        return localStorage.getItem('gemini_api_key');
    }

    estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        return Math.ceil(text.length / 3);
    }

    handleError(error) {
        let message = '❌ Помилка: ';

        if (error.name === 'AbortError') {
            message += 'Запит скасовано';
        } else if (error.message.includes('API key') || error.message.includes('401')) {
            message += 'Невірний API ключ';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
            message += 'Перевищено ліміт запитів';
        } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
            message += 'Проблеми з інтернетом';
        } else {
            message += error.message || 'Щось пішло не так';
        }

        // Показати toast ОДИН раз
        if (window.showToast) {
            showToast(message, 'error', 7000);
        }

        // Додати в чат ОДИН раз
        this.renderMessage(message, 'assistant');
    }

    // ========================================
    // HISTORY MANAGEMENT
    // ========================================

    loadHistory() {
        // Історія тепер в appState
        if (window.appState) {
            this.renderMessages();
        }
    }

    async saveHistory() {
        if (!window.storageManager || !window.appState) return;

        try {
            const history = appState.getGeminiHistory();
            
            if (history.length === 0) {
                if (window.showToast) {
                    showToast('⚠️ Немає повідомлень для збереження', 'warning');
                }
                return;
            }

            // Показати модальне вікно для збереження
            if (typeof saveConversation === 'function') {
                saveConversation('gemini');
            }

        } catch (error) {
            console.error('Failed to save history:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження', 'error');
            }
        }
    }

    clearHistory() {
        if (!confirm('⚠️ Очистити історію розмови?')) return;

        if (window.appState) {
            appState.clearGeminiHistory();
        }

        this.clearUI();

        if (window.showToast) {
            showToast('🗑️ Історію очищено', 'success');
        }
    }

    // ========================================
    // ЕКСПОРТ
    // ========================================

    async exportToMarkdown() {
        const history = window.appState ? 
            appState.getGeminiHistory() : 
            [];

        if (history.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає повідомлень для експорту', 'warning');
            }
            return;
        }

        let markdown = '# Gemini Chat\n\n';
        markdown += `Експортовано: ${new Date().toLocaleString('uk-UA')}\n\n`;
        markdown += '---\n\n';

        history.forEach((msg, i) => {
            const role = msg.role === 'user' ? '👤 Користувач' : '🤖 Gemini';
            const content = msg.parts?.[0]?.text || '';
            
            markdown += `## ${role}\n\n`;
            markdown += `${content}\n\n`;
            
            if (i < history.length - 1) {
                markdown += '---\n\n';
            }
        });

        // Створити і завантажити файл
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini-chat-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            showToast('✅ Експортовано в Markdown!', 'success');
        }
    }

    // ========================================
    // CANCEL REQUEST
    // ========================================

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

let geminiChat = null;

document.addEventListener('DOMContentLoaded', () => {
    geminiChat = new GeminiChat();
    
    // Експортувати функції для сумісності
    window.sendGeminiMessage = () => geminiChat.sendMessage();
    window.clearGeminiChat = () => geminiChat.clearHistory();
    window.saveGeminiChat = () => geminiChat.saveHistory();
    window.exportGeminiChat = () => geminiChat.exportToMarkdown();
    window.cancelGeminiRequest = () => geminiChat.cancelRequest();
});

// Експорт класу
window.GeminiChat = GeminiChat;
window.geminiChat = geminiChat;

console.log('✅ Gemini Chat module loaded (FIXED)');
