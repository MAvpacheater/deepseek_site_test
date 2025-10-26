// 🖼️ Image Generator - Core Logic (350 lines)

class ImageGeneratorCore {
    constructor() {
        this.apiEndpoint = 'https://image.pollinations.ai/prompt/';
        this.isGenerating = false;
        this.abortController = null;
        this.defaultParams = {
            width: 1024,
            height: 1024,
            nologo: true,
            enhance: true,
            model: 'flux'
        };
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        console.log('✅ Image Generator Core initialized');
    }

    setupEventListeners() {
        const input = document.getElementById('imageInput');
        const sendBtn = document.getElementById('imageSendBtn');

        if (input) {
            // Auto-resize
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            });

            // Enter для відправки (без Shift)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.generate();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.generate());
        }

        // Підписатися на події
        if (window.eventBus) {
            eventBus.on('image:generate', ({ prompt, params }) => {
                this.generate(prompt, params);
            });
        }
    }

    // ========================================
    // ГЕНЕРАЦІЯ ЗОБРАЖЕННЯ
    // ========================================

    async generate(promptText = null, customParams = {}) {
        if (this.isGenerating) {
            if (window.showToast) {
                showToast('⏳ Зачекай завершення попередньої генерації', 'warning');
            }
            return null;
        }

        const input = document.getElementById('imageInput');
        const prompt = promptText || (input ? input.value.trim() : '');

        if (!prompt) {
            if (window.showToast) {
                showToast('⚠️ Опиши що хочеш згенерувати', 'warning');
            }
            return null;
        }

        // Валідація
        const validation = this.validatePrompt(prompt);
        if (!validation.valid) {
            if (window.showToast) {
                showToast(`⚠️ ${validation.errors.join(', ')}`, 'error');
            }
            return null;
        }

        // Очистити input
        if (input && !promptText) {
            input.value = '';
            input.style.height = 'auto';
        }

        this.isGenerating = true;
        this.setLoading(true);

        try {
            // Створити placeholder в галереї
            const placeholderId = this.createPlaceholder(prompt);

            // Згенерувати URL
            const params = { ...this.defaultParams, ...customParams };
            const imageUrl = this.buildImageURL(prompt, params);

            // Завантажити зображення
            const result = await this.loadImage(imageUrl, prompt);

            // Оновити placeholder
            this.updatePlaceholder(placeholderId, result);

            // Зберегти в AppState
            if (window.appState) {
                appState.addImage({
                    prompt: prompt,
                    url: imageUrl,
                    params: params,
                    date: Date.now()
                });
            }

            // Сповістити про успіх
            if (window.eventBus) {
                eventBus.emit('image:ready', { 
                    url: imageUrl, 
                    prompt: prompt 
                });
            }

            return result;

        } catch (error) {
            this.handleError(error, prompt);
            return null;
        } finally {
            this.isGenerating = false;
            this.setLoading(false);
        }
    }

    // ========================================
    // URL GENERATION
    // ========================================

    buildImageURL(prompt, params = {}) {
        const encodedPrompt = encodeURIComponent(prompt);
        const queryParams = new URLSearchParams({
            ...this.defaultParams,
            ...params
        });

        return `${this.apiEndpoint}${encodedPrompt}?${queryParams.toString()}`;
    }

    async loadImage(url, prompt) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const startTime = Date.now();

            img.onerror = (error) => {
                console.error('❌ Image load failed:', error);
                reject(new Error('Failed to load image'));
            };

            // Timeout 30 секунд
            const timeout = setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('Image load timeout (30s)'));
                }
            }, 30000);

            img.onload = () => {
                clearTimeout(timeout);
                const loadTime = Date.now() - startTime;
                console.log(`✅ Image loaded in ${loadTime}ms`);
                
                resolve({
                    url: url,
                    prompt: prompt,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    loadTime: loadTime
                });
            };

            // Почати завантаження
            img.src = url;
        });
    }

    // ========================================
    // PLACEHOLDER MANAGEMENT
    // ========================================

    createPlaceholder(prompt) {
        const placeholderId = `img-placeholder-${Date.now()}`;

        // Сповістити галерею про створення placeholder
        if (window.eventBus) {
            eventBus.emit('gallery:add-placeholder', {
                id: placeholderId,
                prompt: prompt
            });
        }

        return placeholderId;
    }

    updatePlaceholder(placeholderId, result) {
        // Сповістити галерею про оновлення
        if (window.eventBus) {
            eventBus.emit('gallery:update-placeholder', {
                id: placeholderId,
                result: result
            });
        }
    }

    // ========================================
    // BATCH GENERATION
    // ========================================

    async generateBatch(prompts, params = {}) {
        if (!Array.isArray(prompts) || prompts.length === 0) {
            throw new Error('Prompts must be non-empty array');
        }

        if (window.showToast) {
            showToast(`🎨 Генерація ${prompts.length} зображень...`, 'info');
        }

        const results = [];
        const delay = params.delay || 2000; // Затримка між запитами

        for (let i = 0; i < prompts.length; i++) {
            try {
                const result = await this.generate(prompts[i], params);
                results.push(result);

                // Затримка між генераціями
                if (i < prompts.length - 1) {
                    await this.delay(delay);
                }
            } catch (error) {
                console.error(`Failed to generate image ${i + 1}:`, error);
                results.push({ error: error.message, prompt: prompts[i] });
            }
        }

        if (window.showToast) {
            const successful = results.filter(r => !r.error).length;
            showToast(`✅ Згенеровано ${successful}/${prompts.length} зображень`, 'success');
        }

        return results;
    }

    // ========================================
    // VARIATIONS
    // ========================================

    async generateVariations(basePrompt, count = 3) {
        const variations = this.createPromptVariations(basePrompt, count);
        return await this.generateBatch(variations);
    }

    createPromptVariations(basePrompt, count) {
        const styles = [
            'photorealistic',
            'digital art',
            'oil painting',
            'watercolor',
            'sketch',
            '3D render',
            'anime style',
            'cyberpunk'
        ];

        const variations = [];
        for (let i = 0; i < count; i++) {
            const style = styles[i % styles.length];
            variations.push(`${basePrompt}, ${style}`);
        }

        return variations;
    }

    // ========================================
    // ВАЛІДАЦІЯ
    // ========================================

    validatePrompt(prompt) {
        const errors = [];

        if (!prompt || prompt.trim() === '') {
            errors.push('Prompt не може бути порожнім');
        }

        if (prompt.length > 1000) {
            errors.push('Prompt занадто довгий (макс 1000 символів)');
        }

        // Перевірка на заборонені слова (приклад)
        const forbidden = ['nsfw', 'gore', 'violence'];
        const lowerPrompt = prompt.toLowerCase();
        
        for (const word of forbidden) {
            if (lowerPrompt.includes(word)) {
                errors.push(`Заборонене слово: ${word}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========================================
    // UI MANAGEMENT
    // ========================================

    setLoading(isLoading) {
        const sendBtn = document.getElementById('imageSendBtn');
        const input = document.getElementById('imageInput');

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
                sendBtn.textContent = 'Генерувати';
            }
        }

        if (input) {
            input.disabled = isLoading;
        }
    }

    // ========================================
    // ERROR HANDLING
    // ========================================

    handleError(error, prompt) {
        console.error('Image generation error:', error);

        let message = '❌ Помилка генерації: ';
        let severity = 'medium';

        if (error.message.includes('timeout')) {
            message += 'Час очікування вичерпано (30с)';
        } else if (error.message.includes('load')) {
            message += 'Не вдалося завантажити зображення';
            severity = 'high';
        } else {
            message += error.message || 'Щось пішло не так';
        }

        if (window.showToast) {
            showToast(message, 'error', 7000);
        }

        // Логувати помилку
        if (window.errorHandler) {
            errorHandler.logError({
                type: 'image_generation_error',
                message: 'Failed to generate image',
                error: error.message,
                prompt: prompt,
                severity: severity
            });
        }
    }

    // ========================================
    // UTILITY
    // ========================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.isGenerating = false;
        this.setLoading(false);

        if (window.showToast) {
            showToast('🛑 Генерацію скасовано', 'info');
        }
    }

    getStats() {
        const images = window.appState ? 
            appState.chat.image.gallery : 
            [];

        return {
            total: images.length,
            isGenerating: this.isGenerating,
            lastGenerated: images.length > 0 ? images[0].date : null
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const imageGeneratorCore = new ImageGeneratorCore();

// Експорт
window.imageGeneratorCore = imageGeneratorCore;
window.ImageGeneratorCore = ImageGeneratorCore;

console.log('✅ Image Generator Core loaded');
