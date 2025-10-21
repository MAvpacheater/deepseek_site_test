// Image Generation Logic
let imageHistory = [];

// Генерація зображень
async function generateImage() {
    const input = document.getElementById('imageInput');
    const prompt = input.value.trim();
    
    if (!prompt) return;
    
    input.value = '';
    
    const gallery = document.getElementById('imageGallery');
    
    // Видалити empty state якщо є
    const emptyState = gallery.querySelector('.empty-state');
    if (emptyState) {
        gallery.innerHTML = '';
        gallery.style.display = 'grid';
    }
    
    // Створити placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'image-item';
    placeholder.innerHTML = `
        <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);">
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
        <div class="image-item-footer">
            <div class="image-item-prompt">${escapeHtml(prompt)}</div>
        </div>
    `;
    
    gallery.insertBefore(placeholder, gallery.firstChild);
    
    try {
        // Використовуємо безкоштовний API Pollinations.ai
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        
        // Завантажити зображення
        const img = new Image();
        img.onload = function() {
            placeholder.innerHTML = `
                <img src="${imageUrl}" alt="${escapeHtml(prompt)}">
                <div class="image-item-footer">
                    <div class="image-item-prompt">${escapeHtml(prompt)}</div>
                    <div class="image-item-actions">
                        <button onclick="downloadImage('${imageUrl}', '${escapeHtml(prompt)}')">💾 Завантажити</button>
                        <button onclick="copyImageUrl('${imageUrl}')">🔗 Копіювати URL</button>
                    </div>
                </div>
            `;
            
            imageHistory.push({ prompt, url: imageUrl, date: Date.now() });
            stats.imagesGenerated++;
            saveStats();
        };
        
        img.onerror = function() {
            placeholder.innerHTML = `
                <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text-secondary);">
                    ❌ Помилка завантаження
                </div>
                <div class="image-item-footer">
                    <div class="image-item-prompt">${escapeHtml(prompt)}</div>
                </div>
            `;
        };
        
        img.src = imageUrl;
        
    } catch (error) {
        console.error('Помилка:', error);
        placeholder.innerHTML = `
            <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text-secondary);">
                ❌ Помилка генерації
            </div>
            <div class="image-item-footer">
                <div class="image-item-prompt">${escapeHtml(prompt)}</div>
            </div>
        `;
    }
}

// Завантажити зображення
function downloadImage(url, prompt) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.substring(0, 50)}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Копіювати URL зображення
function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Скопійовано!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}
