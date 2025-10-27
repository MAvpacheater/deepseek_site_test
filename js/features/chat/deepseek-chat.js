// ✨ Gemini Chat - ПОВНІСТЮ ВИПРАВЛЕНА ВЕРСІЯ

class GeminiChat {
    constructor() {
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        this.model = 'gemini-2.0-flash-exp';
        this.isProcessing = false;
        this.abortController = null;
        this.initialized = false;
        
        console.log('✅ Gemini Chat instance created');
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        if (this.initialized) {
            console.warn('⚠️ Gemini Chat already initialized');
            return;
        }

        this.setupEventListeners();
        this.loadHistory();
        this.initialized = true;
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
            chatState.on('gemini:message', ({ message }) => {
                this.renderMessage(message);
            });

            chatState.on('gemini:clear', () => {
                this.clearUI();
            });
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

        const input = document.getElementById('geminiInput');
        if (!input) {
            console.error('❌ geminiInput not found');
            return;
        }

        const message = input.value.trim();
        if (!message) {
            if (window.showToast) {
                showToast('⚠️ Введи повідомлення', 'warning');
            }
            return;
        }

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

        // Додати повідомлення користувача через chatState
        if (window.chatState) {
            chatState.addGeminiMessage('user', message);
        }

        this.setLoading(true);

        try {
            const response = await this.callAPI(apiKey, message);
            
            // Додати відповідь AI через chatState
            if (window.chatState) {
                chatState.addGeminiMessage('model', response);
            }

            // Оновити статистику
            if (window.appState) {
                appState.incrementStat('geminiRequests');
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
            // Отримати історію через chatState
            const history = window.chatState ? 
                chatState.getGeminiHistory() : 
                [];

            // System prompt
            const systemPrompt = window.appState ?
                appState.getSetting('geminiSystemPrompt') :
                'Ти корисний AI асістент. Говори українською мовою.';

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
    // UI MANAGEMENT
    // ========================================

    renderMessage(msgData) {
        const messagesDiv = document.getElementById('geminiMessages');
        if (!messagesDiv) return;

        // Видалити empty state якщо є
        const emptyState = messagesDiv.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const role = msgData.role === 'user' ? 'user' : 'assistant';
        const text = msgData.parts?.[0]?.text || '';

        if (!text) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '✨';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);

        messagesDiv.appendChild(messageElement);

        // Анімація появи
        requestAnimationFrame(() => {
            messageElement.style.transition = 'all 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });

        this.scrollToBottom();
    }

    loadHistory() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        const messages = window.chatState ? 
            chatState.getGeminiMessages() : 
            [];

        if (messages.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">✨</div>
                    <h3>Gemini Chat</h3>
                    <p>Почніть розмову з AI асистентом</p>
                </div>
            `;
            return;
        }

        messages.forEach((msg, index) => {
            setTimeout(() => {
                this.renderMessage(msg);
            }, index * 50);
        });

        this.scrollToBottom();
    }

    clearUI() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (messagesDiv) {
            // Анімація зникнення
            const messages = messagesDiv.querySelectorAll('.message');
            messages.forEach((msg, index) => {
                setTimeout(() => {
                    msg.style.transition = 'all 0.3s ease';
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateY(-20px)';
                }, index * 30);
            });

            // Після анімації показати empty state
            setTimeout(() => {
                messagesDiv.innerHTML = `
                    <div class="empty-state" style="opacity: 0; transform: scale(0.9);">
                        <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">✨</div>
                        <h3>Gemini Chat</h3>
                        <p>Почніть розмову з AI асистентом</p>
                    </div>
                `;

                // Анімація появи empty state
                requestAnimationFrame(() => {
                    const emptyState = messagesDiv.querySelector('.empty-state');
                    if (emptyState) {
                        emptyState.style.transition = 'all 0.3s ease';
                        emptyState.style.opacity = '1';
                        emptyState.style.transform = 'scale(1)';
                    }
                });
            }, messages.length * 30 + 100);
        }
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('geminiMessages');
        if (messagesDiv) {
            messagesDiv.scrollTo({
                top: messagesDiv.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

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

    // ========================================
    // UTILITY
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

        // Додати повідомлення про помилку в чат
        const messagesDiv = document.getElementById('geminiMessages');
        if (messagesDiv) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'message assistant';
            errorMsg.style.opacity = '0';
            errorMsg.innerHTML = `
                <div class="message-avatar">❌</div>
                <div class="message-content" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white;">${message}</div>
            `;
            
            messagesDiv.appendChild(errorMsg);
            
            requestAnimationFrame(() => {
                errorMsg.style.transition = 'all 0.3s ease';
                errorMsg.style.opacity = '1';
            });

            this.scrollToBottom();
        }
    }

    clearHistory() {
        if (!confirm('⚠️ Очистити історію розмови?')) return;

        if (window.chatState) {
            chatState.clearGeminiChat();
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
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР ТА ЕКСПОРТ
// ========================================

// Створити глобальний екземпляр
if (!window.geminiChat) {
    window.geminiChat = new GeminiChat();
    window.GeminiChat = GeminiChat;
}

// Глобальні функції для сумісності
window.sendGeminiMessage = () => {
    if (window.geminiChat && window.geminiChat.initialized) {
        window.geminiChat.sendMessage();
    }
};

window.clearGeminiChat = () => {
    if (window.geminiChat && window.geminiChat.initialized) {
        window.geminiChat.clearHistory();
    }
};

console.log('✅ Gemini Chat module loaded (FIXED)');
