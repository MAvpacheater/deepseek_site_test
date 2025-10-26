// ✨ Gemini API Service - Сервіс для роботи з Gemini API

class GeminiAPIService {
    constructor() {
        this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        this.model = 'gemini-2.0-flash-exp';
        this.isProcessing = false;
        this.abortController = null;
        this.requestQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        // Налаштувати rate limiting
        if (window.errorHandler) {
            errorHandler.setRateLimit('gemini_api', {
                minInterval: 1000,
                maxRequests: 15,
                window: 60000
            });
        }

        console.log('✅ Gemini API Service initialized');
    }

    // ========================================
    // ОСНОВНИЙ ЗАПИТ
    // ========================================

    /**
     * Надіслати запит до Gemini API
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
            if (this.shouldRetry(error) && options.retryCount < this.maxRetries) {
                console.warn(`⚠️ Retrying Gemini request (${options.retryCount + 1}/${this.maxRetries})`);
                await this.delay(this.retryDelay * (options.retryCount + 1));
                
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
            (window.appState ? appState.getSetting('geminiSystemPrompt') : null) ||
            'Ти корисний AI асістент. Говори українською мовою.';

        // Побудувати contents
        const contents = [
            ...history,
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ];

        const requestBody = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048,
                topP: options.topP || 0.95,
                topK: options.topK || 40
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const url = `${this.endpoint}?key=${apiKey}`;

        let response;
        
        if (window.errorHandler) {
            response = await errorHandler.fetchWithRetry(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal,
                timeout: options.timeout || 30000
            });
        } else {
            response = await fetch(url, {
                method: 'POST',
                headers: {
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

        const aiMessage = data.candidates[0].content.parts[0].text;

        // Логувати в EventBus
        if (window.eventBus) {
            eventBus.emit(EventBusEvents.MESSAGE_RECEIVE, {
                service: 'gemini',
                message: aiMessage,
                tokens: this.estimateTokens(message + aiMessage)
            });
        }

        return aiMessage;
    }

    // ========================================
    // ВАЛІДАЦІЯ ТА ПОМИЛКИ
    // ========================================

    validateResponse(data) {
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Invalid API response: No candidates');
        }

        const candidate = data.candidates[0];

        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
            throw new Error('Invalid API response: No content');
        }

        if (!candidate.content.parts[0].text) {
            throw new Error('Empty response from API');
        }

        // Перевірити на блокування контенту
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Response blocked by safety filters');
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
    // STREAMING (для майбутнього)
    // ========================================

    /**
     * Streaming відповідь (не підтримується в поточній версії Gemini API через fetch)
     */
    async sendMessageStreaming(message, history = [], onChunk, options = {}) {
        // TODO: Implement streaming when supported
        throw new Error('Streaming not yet implemented for Gemini API');
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    getApiKey() {
        if (typeof getGeminiApiKey === 'function') {
            return getGeminiApiKey();
        }

        if (window.appState) {
            return appState.getApiKey('gemini');
        }

        return localStorage.getItem('gemini_api_key');
    }

    estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        // Приблизна оцінка: 1 токен ≈ 4 символи для англійської, 3 для української
        return Math.ceil(text.length / 3.5);
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
            console.log('🛑 Gemini request cancelled');
        }
    }

    // ========================================
    // BATCH REQUESTS (масові запити)
    // ========================================

    /**
     * Надіслати кілька запитів по черзі
     */
    async sendBatch(messages, history = [], options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < messages.length; i++) {
            try {
                const response = await this.sendMessage(messages[i], history, options);
                results.push({ index: i, message: messages[i], response });

                // Оновити історію для наступного запиту
                if (options.updateHistory) {
                    history.push(
                        { role: 'user', parts: [{ text: messages[i] }] },
                        { role: 'model', parts: [{ text: response }] }
                    );
                }

                // Затримка між запитами
                if (i < messages.length - 1) {
                    await this.delay(options.batchDelay || 2000);
                }

            } catch (error) {
                errors.push({ index: i, message: messages[i], error: error.message });
            }
        }

        return { results, errors };
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
            queueLength: this.requestQueue.length,
            model: this.model,
            endpoint: this.endpoint
        };
    }

    // ========================================
    // НАЛАШТУВАННЯ
    // ========================================

    setModel(model) {
        this.model = model;
        this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        console.log(`✅ Gemini model changed to: ${model}`);
    }

    setSystemPrompt(prompt) {
        if (window.appState) {
            appState.setSetting('geminiSystemPrompt', prompt);
        } else {
            localStorage.setItem('gemini_system_prompt', prompt);
        }
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const geminiAPI = new GeminiAPIService();

// Експорт
window.geminiAPI = geminiAPI;
window.GeminiAPIService = GeminiAPIService;

console.log('✅ Gemini API Service loaded');
