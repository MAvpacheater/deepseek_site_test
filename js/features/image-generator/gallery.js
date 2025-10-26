// 🖼️ Image Gallery - UI Management (250 lines)

class ImageGallery {
    constructor() {
        this.galleryElement = null;
        this.view = 'grid'; // 'grid' або 'list'
        this.sortBy = 'date'; // 'date', 'prompt'
        this.filterTags = [];
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.galleryElement = document.getElementById('imageGallery');
        this.setupEventListeners();
        this.render();
        
        console.log('✅ Image Gallery initialized');
    }

    setupEventListeners() {
        // Підписатися на події
        if (window.eventBus) {
            // Додавання placeholder
            eventBus.on('gallery:add-placeholder', ({ id, prompt }) => {
                this.addPlaceholder(id, prompt);
            });

            // Оновлення placeholder
            eventBus.on('gallery:update-placeholder', ({ id, result }) => {
                this.updatePlaceholder(id, result);
            });

            // Нове зображення готове
            eventBus.on('image:ready', () => {
                this.render();
            });

            // Очищення галереї
            eventBus.on('images:clear', () => {
                this.clear();
            });
        }

        // AppState події
        if (window.appState) {
            appState.on('image:add', () => {
                this.render();
            });
        }
    }

    // ========================================
    // РЕНДЕРИНГ
    // ========================================

    render() {
        if (!this.galleryElement) return;

        const images = this.getImages();

        if (images.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Сортування
        const sorted = this.sortImages(images);

        // Рендер
        this.galleryElement.innerHTML = '';
        this.galleryElement.className = `image-gallery ${this.view}-view`;

        sorted.forEach(img => {
            const item = this.createImageItem(img);
            this.galleryElement.appendChild(item);
        });
    }

    renderEmptyState() {
        if (!this.galleryElement) return;

        this.galleryElement.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎨</div>
                <h3>Генерація зображень</h3>
                <p>Опиши що хочеш згенерувати та натисни Enter</p>
            </div>
        `;
    }

    // ========================================
    // СТВОРЕННЯ ЕЛЕМЕНТІВ
    // ========================================

    createImageItem(imageData) {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.imageId = imageData.date || Date.now();

        const escapedPrompt = this.escapeHTML(imageData.prompt);
        const escapedUrl = imageData.url;

        item.innerHTML = `
            <div class="image-item-container">
                <img src="${escapedUrl}" 
                     alt="${escapedPrompt}" 
                     loading="lazy"
                     onclick="imageGallery.openFullscreen('${escapedUrl}', '${escapedPrompt}')">
                
                <div class="image-item-overlay">
                    <button class="image-btn" onclick="imageGallery.downloadImage('${escapedUrl}', '${escapedPrompt}')" title="Завантажити">
                        💾
                    </button>
                    <button class="image-btn" onclick="imageGallery.copyUrl('${escapedUrl}')" title="Копіювати URL">
                        🔗
                    </button>
                    <button class="image-btn" onclick="imageGallery.regenerate('${escapedPrompt}')" title="Регенерувати">
                        🔄
                    </button>
                    <button class="image-btn" onclick="imageGallery.deleteImage(${imageData.date})" title="Видалити">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="image-item-footer">
                <div class="image-item-prompt">${escapedPrompt}</div>
                <div class="image-item-meta">
                    ${this.formatDate(imageData.date)}
                </div>
            </div>
        `;

        return item;
    }

    // ========================================
    // PLACEHOLDER MANAGEMENT
    // ========================================

    addPlaceholder(id, prompt) {
        if (!this.galleryElement) return;

        // Видалити empty state якщо є
        const emptyState = this.galleryElement.querySelector('.empty-state');
        if (emptyState) {
            this.galleryElement.innerHTML = '';
            this.galleryElement.className = `image-gallery ${this.view}-view`;
        }

        const placeholder = document.createElement('div');
        placeholder.className = 'image-item placeholder';
        placeholder.id = id;

        const escapedPrompt = this.escapeHTML(prompt);

        placeholder.innerHTML = `
            <div class="image-item-container">
                <div class="image-placeholder-loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Генерація...</div>
                </div>
            </div>
            <div class="image-item-footer">
                <div class="image-item-prompt">${escapedPrompt}</div>
            </div>
        `;

        // Додати на початок
        this.galleryElement.insertBefore(placeholder, this.galleryElement.firstChild);
    }

    updatePlaceholder(id, result) {
        const placeholder = document.getElementById(id);
        if (!placeholder) return;

        const escapedPrompt = this.escapeHTML(result.prompt);
        const escapedUrl = result.url;

        placeholder.className = 'image-item';
        placeholder.innerHTML = `
            <div class="image-item-container">
                <img src="${escapedUrl}" 
                     alt="${escapedPrompt}" 
                     loading="lazy"
                     onclick="imageGallery.openFullscreen('${escapedUrl}', '${escapedPrompt}')">
                
                <div class="image-item-overlay">
                    <button class="image-btn" onclick="imageGallery.downloadImage('${escapedUrl}', '${escapedPrompt}')" title="Завантажити">
                        💾
                    </button>
                    <button class="image-btn" onclick="imageGallery.copyUrl('${escapedUrl}')" title="Копіювати URL">
                        🔗
                    </button>
                    <button class="image-btn" onclick="imageGallery.regenerate('${escapedPrompt}')" title="Регенерувати">
                        🔄
                    </button>
                    <button class="image-btn" onclick="imageGallery.deleteImage(${Date.now()})" title="Видалити">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="image-item-footer">
                <div class="image-item-prompt">${escapedPrompt}</div>
                <div class="image-item-meta">
                    Щойно • ${result.width}x${result.height}
                </div>
            </div>
        `;
    }

    // ========================================
    // ACTIONS
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
                showToast('💾 Завантаження розпочато!', 'success', 2000);
            }
        } catch (error) {
            console.error('Download error:', error);
            if (window.showToast) {
                showToast('❌ Помилка завантаження', 'error');
            }
        }
    }

    copyUrl(url) {
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

    regenerate(prompt) {
        if (window.imageGeneratorCore) {
            imageGeneratorCore.generate(prompt);
        }
    }

    deleteImage(timestamp) {
        if (!confirm('🗑️ Видалити це зображення?')) return;

        const images = this.getImages();
        const filtered = images.filter(img => img.date !== timestamp);

        // Оновити в appState
        if (window.appState) {
            appState.chat.image.gallery = filtered;
        }

        this.render();

        if (window.showToast) {
            showToast('✅ Зображення видалено', 'success');
        }
    }

    openFullscreen(url, prompt) {
        // Створити fullscreen overlay
        const overlay = document.createElement('div');
        overlay.className = 'image-fullscreen-overlay';
        overlay.innerHTML = `
            <div class="image-fullscreen-content">
                <button class="image-fullscreen-close" onclick="this.parentElement.parentElement.remove()">✕</button>
                <img src="${url}" alt="${this.escapeHTML(prompt)}">
                <div class="image-fullscreen-prompt">${this.escapeHTML(prompt)}</div>
            </div>
        `;

        // Закрити на клік по overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);
    }

    // ========================================
    // VIEW MANAGEMENT
    // ========================================

    setView(view) {
        if (view !== 'grid' && view !== 'list') return;
        
        this.view = view;
        this.render();
    }

    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.render();
    }

    // ========================================
    // DATA MANAGEMENT
    // ========================================

    getImages() {
        if (window.appState) {
            return appState.chat.image.gallery || [];
        }
        return [];
    }

    sortImages(images) {
        const sorted = [...images];

        if (this.sortBy === 'date') {
            sorted.sort((a, b) => (b.date || 0) - (a.date || 0));
        } else if (this.sortBy === 'prompt') {
            sorted.sort((a, b) => 
                (a.prompt || '').localeCompare(b.prompt || '')
            );
        }

        return sorted;
    }

    clear() {
        this.renderEmptyState();
    }

    // ========================================
    // BATCH ACTIONS
    // ========================================

    async downloadAll() {
        const images = this.getImages();
        
        if (images.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає зображень для завантаження', 'warning');
            }
            return;
        }

        if (window.showToast) {
            showToast(`📥 Завантаження ${images.length} зображень...`, 'info');
        }

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            this.downloadImage(img.url, img.prompt);
            
            // Затримка між завантаженнями
            if (i < images.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    clearAll() {
        if (!confirm('⚠️ Видалити всі зображення з галереї?')) return;

        if (window.appState) {
            appState.clearImages();
        }

        this.clear();

        if (window.showToast) {
            showToast('🗑️ Галерею очищено', 'success');
        }
    }

    // ========================================
    // UTILITY
    // ========================================

    formatDate(timestamp) {
        if (!timestamp) return 'Невідомо';

        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days < 7) return `${days} дн тому`;

        return date.toLocaleDateString('uk-UA');
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 50);
    }

    getStats() {
        const images = this.getImages();
        
        return {
            total: images.length,
            view: this.view,
            sortBy: this.sortBy
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const imageGallery = new ImageGallery();

// Експорт
window.imageGallery = imageGallery;
window.ImageGallery = ImageGallery;

// Compatibility functions
window.clearImageGallery = () => imageGallery.clearAll();
window.downloadAllImages = () => imageGallery.downloadAll();

console.log('✅ Image Gallery loaded');
