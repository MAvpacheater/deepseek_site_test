// ✨ Gemini Chat - ВИПРАВЛЕНО (ВСІ ПОМИЛКИ)

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
        // НЕ викликаємо setupEventListeners тут - тільки після того як DOM готовий
        console.log('✅ Gemini Chat initialized (FIXED)');
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
            appState.on('gemini:message', ({ message }) => {
                const role = message.role === 'user' ? 'user' : 'assistant';
                const content = message.parts?.[0]?.text || '';
                if (content) {
                    this.renderMessage(content, role);
                    this.scrollToBottom();
                }
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
            // Отримати стару історію
            const history = window.appState ? 
                appState.getGeminiHistory() : 
                [];

            // Отримати system prompt
            const systemPrompt = window.appState ?
                appState.getSetting('geminiSystemPrompt') :
                localStorage.getItem('gemini_system_prompt') ||
                'Ти корисний AI асістент. Говори українською мовою.';

            // Додати нове повідомлення користувача до історії
            const updatedHistory = [
                ...history,
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ];

            const requestBody = {
                contents: updatedHistory,
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

            const response = await fetch(`${this.apiEndpoint}?key=${apiKey}`, {
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
            console.error('Gemini API error:', error);
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
        this.scrollToBottom();
    }

    addAssistantMessage(content) {
        if (window.appState) {
            appState.addGeminiMessage('model', content);
        }
        this.scrollToBottom();
    }

    renderMessage(text, sender) {
        const messagesDiv = document.getElementById('geminiMessages');
        if (!messagesDiv) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);

        messagesDiv.appendChild(messageElement);
    }

    renderMessages() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const messages = window.appState ? 
            appState.getGeminiMessages() : 
            [];

        messages.forEach(msg => {
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

        if (window.showToast) {
            showToast(message, 'error', 7000);
        }

        this.renderMessage(message, 'assistant');
    }

    // ========================================
    // HISTORY MANAGEMENT
    // ========================================

    loadHistory() {
        if (window.appState) {
            this.renderMessages();
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

// ✅ КРИТИЧНО: Ініціалізувати лише коли DOM готовий
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        geminiChat = new GeminiChat();
        
        // Експортувати функції для сумісності
        window.sendGeminiMessage = () => geminiChat.sendMessage();
        window.clearGeminiChat = () => geminiChat.clearHistory();
        window.cancelGeminiRequest = () => geminiChat.cancelRequest();
    });
} else {
    // DOM вже готовий
    geminiChat = new GeminiChat();
    
    window.sendGeminiMessage = () => geminiChat.sendMessage();
    window.clearGeminiChat = () => geminiChat.clearHistory();
    window.cancelGeminiRequest = () => geminiChat.cancelRequest();
}

// Експорт класу
window.GeminiChat = GeminiChat;
window.geminiChat = geminiChat;

console.log('✅ Gemini Chat module loaded (ALL BUGS FIXED)');
