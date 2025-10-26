// 💻 Groq API Service - Сервіс для роботи з Groq API (DeepSeek/Llama)

class GroqAPIService {
    constructor() {
        this.endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.isProcessing = false;
        this.abortController = null;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.maxContextLength = 24000; // chars (~6000 tokens)
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        // Налаштувати rate limiting
        if (window.errorHandler) {
            errorHandler.setRateLimit('groq_api', {
                minInterval: 500,
                maxRequests: 30,
                window: 60000
            });
        }

        console.log('✅ Groq API Service initialized');
    }

    // ========================================
    // ОСНОВНИЙ ЗАПИТ
    // ========================================

    /**
     * Надіслати запит до Groq API
     * @param {string} message - Повідомлення користувача
     * @param {Array} history - Історія розмови
     * @param {Object} options - Додаткові опції
     * @returns {Promise<string>} - Відповідь AI
     */
    async sendMessage(message, history = [], options = {}) {
        if (this.isProcessing && !options.force) {
            throw new Error('Already processing request');
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key not found');
        }

        // Валідація введення
        if (window.sanitizer) {
            const validation = sanitizer.validateInput(message, {
                maxLength: 10000,
                required: true,
                allowHTML: false
            });

            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }
        }

        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            const response = await this.makeRequest(apiKey, message, history, options);
            return response;

        } catch (error) {
            // Retry logic
            if (this.shouldRetry(error) && (options.retryCount || 0) < this.maxRetries) {
                console.warn(`⚠️ Retrying Groq request (${(options.retryCount || 0) + 1}/${this.maxRetries})`);
                await this.delay(this.retryDelay * ((options.retryCount || 0) + 1));
                
                return this.sendMessage(message, history, {
                    ...options,
                    retryCount: (options.retryCount || 0) + 1
                });
            }

            throw error;

        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    /**
     * Зробити HTTP запит
     */
    async makeRequest(apiKey, message, history, options) {
        const systemPrompt = options.systemPrompt || 
            (window.appState ? appState.getSetting('deepseekSystemPrompt') : null) ||
            'Ти експерт-програміст. Пиши чистий код з коментарями.';

        // Побудувати messages
        let messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        // Перевірити розмір контексту
        messages = this.trimContext(messages);

        const requestBody = {
            model: options.model || this.model,
            messages: messages,
            temperature: options.temperature || 0.5,
            max_tokens: options.maxTokens || 8000,
            top_p: options.topP || 0.95,
            stream: false
        };

        let response;
        
        if (window.errorHandler) {
            response = await errorHandler.fetchWithRetry(this.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal,
                timeout: options.timeout || 45000
            });
        } else {
            response = await fetch(this.endpoint, {
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
                throw this.createAPIError(response, errorData);
            }
        }

        const data = await response.json();

        // Валідація відповіді
        this.validateResponse(data);

        const aiMessage = data.choices[0].message.content;

        // Логувати в EventBus
        if (window.eventBus) {
            eventBus.emit(EventBusEvents.MESSAGE_RECEIVE, {
                service: 'groq',
                message: aiMessage,
                tokens: this.estimateTokens(message + aiMessage)
            });
        }

        return aiMessage;
    }

    // ========================================
    // CONTEXT MANAGEMENT
    // ========================================

    /**
     * Обрізати контекст якщо занадто великий
     */
    trimContext(messages) {
        const totalLength = JSON.stringify(messages).length;

        if (totalLength <= this.maxContextLength) {
            return messages;
        }

        console.warn(`⚠️ Context too large: ${totalLength} chars, trimming...`);

        // Зберегти system prompt та останнє повідомлення
        const systemMessage = messages[0];
        const userMessage = messages[messages.length - 1];
        let historyMessages = messages.slice(1, -1);

        // Видаляти найстаріші повідомлення
        while (JSON.stringify([systemMessage, ...historyMessages, userMessage]).length > this.maxContextLength) {
            if (historyMessages.length === 0) break;
            historyMessages.shift();
        }

        return [systemMessage, ...historyMessages, userMessage];
    }

    // ========================================
    // ВАЛІДАЦІЯ ТА ПОМИЛКИ
    // ========================================

    validateResponse(data) {
        if (!data.choices || !data.choices[0]) {
            throw new Error('Invalid API response: No choices');
        }

        if (!data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid API response: No content');
        }

        const content = data.choices[0].message.content;
        if (!content || content.trim() === '') {
            throw new Error('Empty response from API');
        }
    }

    createAPIError(response, errorData) {
        const error = new Error(errorData.error?.message || `API Error: ${response.status}`);
        error.status = response.status;
        error.type = 'api_error';
        error.data = errorData;

        if (response.status === 401 || response.status === 403) {
            error.type = 'auth_error';
            error.message = 'Invalid API key';
        } else if (response.status === 429) {
            error.type = 'rate_limit';
            error.message = 'Rate limit exceeded';
        } else if (response.status >= 500) {
            error.type = 'server_error';
        }

        return error;
    }

    shouldRetry(error) {
        if (error.name === 'AbortError') return false;
        if (error.type === 'auth_error') return false;
        
        return error.type === 'server_error' || 
               error.type === 'network_error' ||
               error.type === 'timeout_error';
    }

    // ========================================
    // CODE GENERATION
    // ========================================

    /**
     * Спеціалізований метод для генерації коду
     */
    async generateCode(prompt, context = null, options = {}) {
        let fullPrompt = prompt;

        // Додати контекст проекту
        if (context) {
            fullPrompt = this.buildCodeContext(prompt, context);
        }

        return this.sendMessage(fullPrompt, [], {
            ...options,
            temperature: 0.5,
            maxTokens: 8000
        });
    }

    /**
     * Побудувати контекст для генерації коду
     */
    buildCodeContext(prompt, context) {
        let fullPrompt = prompt;

        if (context.files && Object.keys(context.files).length > 0) {
            fullPrompt += '\n\n--- КОНТЕКСТ ПРОЕКТУ ---\n';
            fullPrompt += `Файлів: ${Object.keys(context.files).length}\n\n`;
            
            fullPrompt += 'Структура:\n';
            Object.keys(context.files).slice(0, 20).forEach(filename => {
                const file = context.files[filename];
                const size = file.code ? `${(file.code.length / 1024).toFixed(1)}KB` : '0KB';
                fullPrompt += `• ${filename} (${file.language || 'unknown'}, ${size})\n`;
            });

            // Додати найважливіші файли
            if (context.relevantFiles && context.relevantFiles.length > 0) {
                fullPrompt += '\n--- РЕЛЕВАНТНІ ФАЙЛИ ---\n';
                
                context.relevantFiles.forEach(filename => {
                    const file = context.files[filename];
                    if (file && file.code) {
                        fullPrompt += `\n// FILE: ${filename}\n`;
                        fullPrompt += file.code.substring(0, 2000);
                        if (file.code.length > 2000) {
                            fullPrompt += '\n... (обрізано)';
                        }
                        fullPrompt += '\n';
                    }
                });
            }
        }

        return fullPrompt;
    }

    // ========================================
    // AI SUBTASKS GENERATION
    // ========================================

    /**
     * Згенерувати підзавдання для плану
     */
    async generateSubtasks(planTitle, planDescription) {
        const prompt = `Розбий це завдання на конкретні підзавдання (3-7 штук):

Завдання: ${planTitle}
Опис: ${planDescription}

Формат відповіді - список підзавдань через новий рядок, без нумерації:`;

        const response = await this.sendMessage(prompt, [], {
            temperature: 0.7,
            maxTokens: 500,
            systemPrompt: 'Ти помічник для планування. Створюй чіткі, конкретні підзавдання.'
        });

        // Парсинг відповіді
        const subtasks = response
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[-•*\d.]+\s*/, '').trim())
            .filter(line => line.length > 0)
            .map(title => ({
                id: Date.now() + Math.random(),
                title: title,
                completed: false
            }));

        return subtasks;
    }

    // ========================================
    // UTILITY МЕТОДИ
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
        return Math.ceil(text.length / 4);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================
    // СКАСУВАННЯ
    // ========================================

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.isProcessing = false;
            console.log('🛑 Groq request cancelled');
        }
    }

    // ========================================
    // ТЕСТУВАННЯ
    // ========================================

    /**
     * Тестовий запит для перевірки API ключа
     */
    async testConnection(apiKey = null) {
        const key = apiKey || this.getApiKey();
        
        if (!key) {
            return {
                success: false,
                error: 'API key not found'
            };
        }

        try {
            const response = await this.sendMessage(
                'Привіт! Це тестове повідомлення. Відповідь має бути короткою.',
                [],
                {
                    maxTokens: 50,
                    timeout: 10000
                }
            );

            return {
                success: true,
                message: 'Connection successful',
                response: response
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                type: error.type
            };
        }
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    getStats() {
        return {
            isProcessing: this.isProcessing,
            model: this.model,
            endpoint: this.endpoint,
            maxContextLength: this.maxContextLength
        };
    }

    // ========================================
    // НАЛАШТУВАННЯ
    // ========================================

    setModel(model) {
        this.model = model;
        console.log(`✅ Groq model changed to: ${model}`);
    }

    setSystemPrompt(prompt) {
        if (window.appState) {
            appState.setSetting('deepseekSystemPrompt', prompt);
        } else {
            localStorage.setItem('deepseek_system_prompt', prompt);
        }
    }

    /**
     * Доступні моделі
     */
    static get Models() {
        return {
            LLAMA_70B: 'llama-3.3-70b-versatile',
            LLAMA_8B: 'llama-3.1-8b-instant',
            MIXTRAL: 'mixtral-8x7b-32768',
            GEMMA_7B: 'gemma-7b-it'
        };
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const groqAPI = new GroqAPIService();

// Експорт
window.groqAPI = groqAPI;
window.GroqAPIService = GroqAPIService;

console.log('✅ Groq API Service loaded');
