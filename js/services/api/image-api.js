// 🖼️ Image API Service - Сервіс для генерації зображень

class ImageAPIService {
    constructor() {
        this.endpoint = 'https://image.pollinations.ai/prompt/';
        this.isProcessing = false;
        this.abortController = null;
        this.defaultWidth = 1024;
        this.defaultHeight = 1024;
        this.cache = new Map();
        this.maxCacheSize = 50;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        console.log('✅ Image API Service initialized');
    }

    // ========================================
    // ОСНОВНА ГЕНЕРАЦІЯ
    // ========================================

    /**
     * Згенерувати зображення
     * @param {string} prompt - Опис зображення
     * @param {Object} options - Параметри генерації
     * @returns {Promise<Object>} - URL та метадані зображення
     */
    async generateImage(prompt, options = {}) {
        if (this.isProcessing && !options.force) {
            throw new Error('Already processing request');
        }

        // Валідація prompt
        if (!prompt || prompt.trim() === '') {
            throw new Error('Prompt is required');
        }

        if (window.sanitizer) {
            const validation = sanitizer.validateInput(prompt, {
                maxLength: 1000,
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
            // Перевірити cache
            const cached = this.getFromCache(prompt, options);
            if (cached && !options.nocache) {
                console.log('✅ Image loaded from cache');
                return cached;
            }

            // Побудувати URL
            const imageUrl = this.buildImageURL(prompt, options);

            // Завантажити зображення
            const result = await this.loadImage(imageUrl, prompt, options);

            // Зберегти в cache
            this.addToCache(prompt, options, result);

            // Логувати в EventBus
            if (window.eventBus) {
                eventBus.emit(EventBusEvents.IMAGE_READY, {
                    prompt,
                    url: result.url,
                    options
                });
            }

            return result;

        } catch (error) {
            // Логувати помилку
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'image_generation_error',
                    message: 'Failed to generate image',
                    error: error.message,
                    prompt,
                    severity: 'medium'
                });
            }

            throw error;

        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    /**
     * Побудувати URL для зображення
     */
    buildImageURL(prompt, options = {}) {
        const encodedPrompt = encodeURIComponent(prompt);
        
        const params = new URLSearchParams({
            width: options.width || this.defaultWidth,
            height: options.height || this.defaultHeight,
            nologo: options.nologo !== false,
            enhance: options.enhance !== false,
            seed: options.seed || Math.floor(Math.random() * 1000000)
        });

        // Додати модель якщо вказана
        if (options.model) {
            params.set('model', options.model);
        }

        return `${this.endpoint}${encodedPrompt}?${params.toString()}`;
    }

    /**
     * Завантажити зображення
     */
    async loadImage(url, prompt, options = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = options.timeout || 30000;

            // Таймаут
            const timeoutId = setTimeout(() => {
                img.src = '';
                reject(new Error('Image load timeout'));
            }, timeout);

            img.onload = () => {
                clearTimeout(timeoutId);
                
                resolve({
                    url: url,
                    prompt: prompt,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    timestamp: Date.now(),
                    options: options
                });
            };

            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('Failed to load image'));
            };

            // Почати завантаження
            img.src = url;
        });
    }

    // ========================================
    // BATCH GENERATION
    // ========================================

    /**
     * Згенерувати кілька зображень
     */
    async generateBatch(prompts, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < prompts.length; i++) {
            try {
                const result = await this.generateImage(prompts[i], {
                    ...options,
                    force: true
                });

                results.push({
                    index: i,
                    prompt: prompts[i],
                    result
                });

                // Затримка між генераціями
                if (i < prompts.length - 1) {
                    await this.delay(options.batchDelay || 2000);
                }

            } catch (error) {
                errors.push({
                    index: i,
                    prompt: prompts[i],
                    error: error.message
                });
            }
        }

        return { results, errors };
    }

    /**
     * Згенерувати варіації зображення
     */
    async generateVariations(prompt, count = 4, options = {}) {
        const prompts = Array(count).fill(prompt);
        
        // Різні seed для кожної варіації
        const variations = await this.generateBatch(prompts, {
            ...options,
            seed: undefined, // Випадковий seed для кожного
            batchDelay: 1000
        });

        return variations;
    }

    // ========================================
    // CACHE MANAGEMENT
    // ========================================

    getCacheKey(prompt, options = {}) {
        const key = {
            prompt,
            width: options.width || this.defaultWidth,
            height: options.height || this.defaultHeight,
            model: options.model || 'default'
        };

        return JSON.stringify(key);
    }

    getFromCache(prompt, options = {}) {
        const key = this.getCacheKey(prompt, options);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Перевірити чи не застарів cache (1 година)
        const maxAge = 3600000; // 1 hour
        if (Date.now() - cached.timestamp > maxAge) {
            this.cache.delete(key);
            return null;
        }

        return cached;
    }

    addToCache(prompt, options, result) {
        const key = this.getCacheKey(prompt, options);

        // Обмежити розмір cache
        if (this.cache.size >= this.maxCacheSize) {
            // Видалити найстаріший
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            ...result,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Image cache cleared');
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            keys: Array.from(this.cache.keys())
        };
    }

    // ========================================
    // IMAGE PROCESSING
    // ========================================

    /**
     * Завантажити зображення як Blob
     */
    async downloadAsBlob(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status}`);
            }

            const blob = await response.blob();
            return blob;

        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Завантажити зображення на диск
     */
    async downloadImage(url, filename) {
        try {
            const blob = await this.downloadAsBlob(url);
            
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || `image-${Date.now()}.png`;
            a.target = '_blank';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(blobUrl);

            return true;

        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    /**
     * Конвертувати зображення в Base64
     */
    async imageToBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                try {
                    const base64 = canvas.toDataURL('image/png');
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    }

    // ========================================
    // PROMPT ENHANCEMENT
    // ========================================

    /**
     * Покращити prompt за допомогою AI
     */
    async enhancePrompt(prompt) {
        if (!window.geminiAPI) {
            return prompt;
        }

        try {
            const enhanceRequest = `Покращ цей prompt для генерації зображення. Зроби його більш деталізованим, додай художній стиль, освітлення, композицію. Відповідай ТІЛЬКИ покращеним prompt без пояснень:

${prompt}`;

            const enhanced = await geminiAPI.sendMessage(enhanceRequest, [], {
                maxTokens: 200,
                temperature: 0.8
            });

            return enhanced.trim();

        } catch (error) {
            console.error('Prompt enhancement failed:', error);
            return prompt;
        }
    }

    /**
     * Згенерувати prompt з опису
     */
    async generatePromptFromDescription(description) {
        if (!window.geminiAPI) {
            return description;
        }

        try {
            const request = `Створи детальний prompt для генерації зображення на основі цього опису. Включи стиль, настрій, колірну палітру, композицію. Відповідай ТІЛЬКИ prompt:

${description}`;

            const prompt = await geminiAPI.sendMessage(request, [], {
                maxTokens: 300,
                temperature: 0.9
            });

            return prompt.trim();

        } catch (error) {
            console.error('Prompt generation failed:', error);
            return description;
        }
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Скасувати генерацію
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.isProcessing = false;
            console.log('🛑 Image generation cancelled');
        }
    }

    // ========================================
    // PRESET STYLES
    // ========================================

    /**
     * Застосувати preset стиль до prompt
     */
    applyStyle(prompt, style) {
        const styles = {
            realistic: ', photorealistic, highly detailed, 8k, professional photography',
            anime: ', anime style, manga, vibrant colors, cel shaded',
            painting: ', oil painting, impressionist style, artistic, brush strokes',
            sketch: ', pencil sketch, hand drawn, black and white, artistic',
            cyberpunk: ', cyberpunk style, neon lights, futuristic, dark atmosphere',
            fantasy: ', fantasy art, magical, ethereal, epic fantasy style',
            minimal: ', minimalist, simple, clean design, modern',
            vintage: ', vintage style, retro, old photo, film grain',
            '3d': ', 3D render, CGI, octane render, unreal engine',
            watercolor: ', watercolor painting, soft colors, artistic'
        };

        const styleText = styles[style] || '';
        return prompt + styleText;
    }

    /**
     * Отримати список доступних стилів
     */
    static get Styles() {
        return {
            REALISTIC: 'realistic',
            ANIME: 'anime',
            PAINTING: 'painting',
            SKETCH: 'sketch',
            CYBERPUNK: 'cyberpunk',
            FANTASY: 'fantasy',
            MINIMAL: 'minimal',
            VINTAGE: 'vintage',
            '3D': '3d',
            WATERCOLOR: 'watercolor'
        };
    }

    /**
     * Preset розміри
     */
    static get Sizes() {
        return {
            SQUARE_1024: { width: 1024, height: 1024 },
            SQUARE_512: { width: 512, height: 512 },
            LANDSCAPE_16_9: { width: 1920, height: 1080 },
            LANDSCAPE_4_3: { width: 1024, height: 768 },
            PORTRAIT_9_16: { width: 1080, height: 1920 },
            PORTRAIT_3_4: { width: 768, height: 1024 }
        };
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    getStats() {
        return {
            isProcessing: this.isProcessing,
            endpoint: this.endpoint,
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize
        };
    }

    // ========================================
    // НАЛАШТУВАННЯ
    // ========================================

    setDefaultSize(width, height) {
        this.defaultWidth = width;
        this.defaultHeight = height;
        console.log(`✅ Default size changed to: ${width}x${height}`);
    }

    setEndpoint(endpoint) {
        this.endpoint = endpoint;
        console.log(`✅ Endpoint changed to: ${endpoint}`);
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const imageAPI = new ImageAPIService();

// Експорт
window.imageAPI = imageAPI;
window.ImageAPIService = ImageAPIService;

console.log('✅ Image API Service loaded');
