// 🖼️ Image Generator - Refactored to use AppState

class ImageGenerator {
    constructor() {
        this.apiEndpoint = 'https://image.pollinations.ai/prompt/';
        this.isGenerating = false;
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        this.loadHistory();
        console.log('✅ Image Generator initialized');
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

            // Ctrl+Enter для відправки
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.generateImage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.generateImage());
        }

        // Підписатися на зміни в appState
        if (window.appState) {
            appState.on('image:add', () => this.renderGallery());
            appState.on('images:clear', () => this.clearGallery());
        }
    }

    // ========================================
    // ГЕНЕРАЦІЯ ЗОБРАЖЕННЯ
    // ========================================

    async generateImage() {
        if (this.isGenerating) {
            if (window.showToast) {
                showToast('⏳ Зачекай завершення попередньої генерації', 'warning');
            }
            return;
        }

        const input = document.getElementById('imageInput');
        if (!input) return;

        const prompt = input.value.trim();
        if (!prompt) {
            if (window.showToast) {
                showToast('⚠️ Опиши що хочеш згенерувати', 'warning');
            }
            return;
        }

        // Валідація введення
        if (window.sanitizer) {
            const validation = sanitizer.validateInput(prompt, {
                maxLength: 1000,
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

        this.isGenerating = true;
        this.setLoading(true);

        try {
            // Показати placeholder
            const placeholderId = this.addPlaceholder(prompt);

            // Згенерувати URL зображення
            const imageUrl = this.buildImageURL(prompt);

            // Завантажити зображення
            await this.loadImage(imageUrl, prompt, placeholderId);

            // Зберегти в AppState
            if (window.appState) {
                appState.addImage({
                    prompt: prompt,
                    url: imageUrl,
                    date: Date.now()
                });
            }

        } catch (error) {
            this.handleError(error, prompt);
        } finally {
            this.isGenerating = false;
            this.setLoading(false);
        }
    }

    buildImageURL(prompt) {
        const encodedPrompt = encodeURIComponent(prompt);
        const params = new URLSearchParams({
            width: 1024,
            height: 1024,
            nologo: true,
            enhance: true
        });

        return `${this.apiEndpoint}${encodedPrompt}?${params.toString()}`;
    }

    async loadImage(url, prompt, placeholderId) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.replacePlaceholder(placeholderId, url, prompt);
                resolve();
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Timeout
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('Image load timeout'));
                }
            }, 30000);

            img.src = url;
        });
    }

    // ========================================
    // UI УПРАВЛІННЯ
    // ========================================

    addPlaceholder(prompt) {
        const gallery = this.getGallery();
        if (!gallery) return null;

        // Видалити empty state якщо є
        const emptyState = gallery.querySelector('.empty-state');
        if (emptyState) {
            gallery.innerHTML = '';
            gallery.style.display = 'grid';
        }

        const placeholderId = `placeholder-${Date.now()}`;
        
        const placeholder = document.createElement('div');
        placeholder.className = 'image-item';
        placeholder.id = placeholderId;
        placeholder.innerHTML = `
            <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
            <div class="image-item-footer">
                <div class="image-item-prompt">${this.escapeHTML(prompt)}</div>
            </div>
        `;

        gallery.insertBefore(placeholder, gallery.firstChild);
        return placeholderId;
    }

    replacePlaceholder(placeholderId, imageUrl, prompt) {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) return;

        placeholder.innerHTML = `
            <img src="${imageUrl}" alt="${this.escapeHTML(prompt)}">
            <div class="image-item-footer">
                <div class="image-item-prompt">${this.escapeHTML(prompt)}</div>
                <div class="image-item-actions">
                    <button onclick="imageGenerator.downloadImage('${imageUrl}', '${this.escapeHTML(prompt)}')">💾 Завантажити</button>
                    <button onclick="imageGenerator.copyImageUrl('${imageUrl}')">🔗 URL</button>
                </div>
            </div>
        `;
    }

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
    // ГАЛЕРЕЯ
    // ========================================

    getGallery() {
        return document.getElementById('imageGallery');
    }

    renderGallery() {
        const gallery = this.getGallery();
        if (!gallery) return;

        const images = window.appState ? 
            appState.chat.image.gallery : 
            [];

        if (images.length === 0) {
            this.clearGallery();
            return;
        }

        gallery.innerHTML = '';
        gallery.style.display = 'grid';

        images.forEach(img => {
            const item = this.createImageItem(img);
            gallery.appendChild(item);
        });
    }

    createImageItem(imageData) {
        const item = document.createElement('div');
        item.className = 'image-item';

        const escapedPrompt = this.escapeHTML(imageData.prompt);
        const escapedUrl = this.escapeHTML(imageData.url);

        item.innerHTML = `
            <img src="${escapedUrl}" alt="${escapedPrompt}">
            <div class="image-item-footer">
                <div class="image-item-prompt">${escapedPrompt}</div>
                <div class="image-item-actions">
                    <button onclick="imageGenerator.downloadImage('${escapedUrl}', '${escapedPrompt}')">💾 Завантажити</button>
                    <button onclick="imageGenerator.copyImageUrl('${escapedUrl}')">🔗 URL</button>
                </div>
            </div>
        `;

        return item;
    }

    clearGallery() {
        const gallery = this.getGallery();
        if (!gallery) return;

        gallery.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎨</div>
                <h3>Генерація зображень</h3>
                <p>Опиши що хочеш згенерувати</p>
            </div>
        `;
    }

    // ========================================
    // ДІЇ З ЗОБРАЖЕННЯМИ
    // ========================================

    downloadImage(url, prompt) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.sanitizeFilename(prompt)}.png`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            if (window.showToast) {
                showToast('✅ Завантаження розпочато!', 'success', 2000);
            }
        } catch (error) {
            console.error('Download error:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження', 'error');
            }
        }
    }

    copyImageUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            if (window.showToast) {
                showToast('✅ URL скопійовано!', 'success', 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            if (window.showToast) {
                showToast('❌ Помилка копіювання', 'error');
            }
        });
    }

    // ========================================
    // HISTORY MANAGEMENT
    // ========================================

    loadHistory() {
        if (window.appState) {
            this.renderGallery();
        }
    }

    clearHistory() {
        if (!confirm('⚠️ Очистити галерею зображень?')) return;

        if (window.appState) {
            appState.clearImages();
        }

        this.clearGallery();

        if (window.showToast) {
            showToast('🗑️ Галерею очищено', 'success');
        }
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    escapeHTML(text) {
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeFilename(filename) {
        if (window.sanitizer) {
            return sanitizer.sanitizeFilename(filename);
        }
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 50);
    }

    handleError(error, prompt) {
        console.error('Image generation error:', error);

        let message = '❌ Помилка генерації: ';
        if (error.message.includes('timeout')) {
            message += 'Час очікування вичерпано';
        } else if (error.message.includes('load')) {
            message += 'Не вдалося завантажити зображення';
        } else {
            message += 'Щось пішло не так';
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
                severity: 'medium'
            });
        }
    }

    // ========================================
    // ADVANCED FEATURES
    // ========================================

    async generateMultiple(prompts) {
        if (!Array.isArray(prompts) || prompts.length === 0) return;

        const input = document.getElementById('imageInput');
        
        for (const prompt of prompts) {
            if (input) input.value = prompt;
            await this.generateImage();
            await this.delay(2000); // Затримка між генераціями
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async batchDownload() {
        const images = window.appState ? 
            appState.chat.image.gallery : 
            [];

        if (images.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає зображень для завантаження', 'warning');
            }
            return;
        }

        if (window.showToast) {
            showToast(`📥 Завантаження ${images.length} зображень...`, 'info');
        }

        for (const img of images) {
            this.downloadImage(img.url, img.prompt);
            await this.delay(500);
        }
    }

    getStats() {
        const images = window.appState ? 
            appState.chat.image.gallery : 
            [];

        return {
            total: images.length,
            totalSize: 0, // Не можемо знати без завантаження
            mostRecent: images[0]?.date || null,
            oldest: images[images.length - 1]?.date || null
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let imageGenerator = null;

document.addEventListener('DOMContentLoaded', () => {
    imageGenerator = new ImageGenerator();

    // Експортувати функції для сумісності
    window.generateImage = () => imageGenerator.generateImage();
    window.clearImageGallery = () => imageGenerator.clearHistory();
    window.downloadImage = (url, prompt) => imageGenerator.downloadImage(url, prompt);
    window.copyImageUrl = (url) => imageGenerator.copyImageUrl(url);
    window.batchDownloadImages = () => imageGenerator.batchDownload();

    console.log('✅ Image Generator module loaded');
});

// Експорт класу
window.ImageGenerator = ImageGenerator;
window.imageGenerator = imageGenerator;
