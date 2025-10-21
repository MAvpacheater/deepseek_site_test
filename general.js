// Глобальні змінні
let codeFiles = {};
let codeHistory = {};
let activeFile = null;
let currentMode = 'gemini';

let geminiHistory = [];
let deepseekHistory = [];
let imageHistory = [];
let savedConversations = [];

let stats = {
    geminiRequests: 0,
    deepseekRequests: 0,
    imagesGenerated: 0,
    savedProjects: 0,
    totalTokens: 0,
    firstUse: null
};

let currentSaveMode = null;

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadStats();
    loadSavedConversations();
    initializeInputs();
    initializeShortcuts();
    loadTheme();
    updateStats();
});

// Завантаження статистики
function loadStats() {
    const saved = localStorage.getItem('user_stats');
    if (saved) {
        stats = JSON.parse(saved);
    }
    if (!stats.firstUse) {
        stats.firstUse = Date.now();
        saveStats();
    }
}

// Збереження статистики
function saveStats() {
    localStorage.setItem('user_stats', JSON.stringify(stats));
    updateStats();
}

// Оновлення відображення статистики
function updateStats() {
    document.getElementById('statGemini').textContent = stats.geminiRequests || 0;
    document.getElementById('statDeepseek').textContent = stats.deepseekRequests || 0;
    document.getElementById('statImages').textContent = stats.imagesGenerated || 0;
    document.getElementById('statSaved').textContent = savedConversations.length;
    document.getElementById('statTokens').textContent = (stats.totalTokens || 0).toLocaleString();
    
    if (stats.firstUse) {
        const days = Math.floor((Date.now() - stats.firstUse) / (1000 * 60 * 60 * 24));
        document.getElementById('statDays').textContent = days + 1;
    }
}

// Скидання статистики
function resetStats() {
    if (!confirm('⚠️ Скинути всю статистику?')) return;
    
    stats = {
        geminiRequests: 0,
        deepseekRequests: 0,
        imagesGenerated: 0,
        savedProjects: 0,
        totalTokens: 0,
        firstUse: Date.now()
    };
    saveStats();
    alert('✅ Статистику скинуто!');
}

// Завантаження збережених розмов
function loadSavedConversations() {
    const saved = localStorage.getItem('saved_conversations');
    if (saved) {
        savedConversations = JSON.parse(saved);
    }
}

// Збереження розмов
function saveSavedConversations() {
    localStorage.setItem('saved_conversations', JSON.stringify(savedConversations));
    updateStats();
}

// Відкрити модальне вікно збереження
function saveConversation(mode) {
    currentSaveMode = mode;
    document.getElementById('saveModal').classList.add('active');
    document.getElementById('saveTitle').focus();
}

// Закрити модальне вікно збереження
function closeSaveModal() {
    document.getElementById('saveModal').classList.remove('active');
    document.getElementById('saveTitle').value = '';
    document.getElementById('saveTags').value = '';
}

// Підтвердити збереження
function confirmSave() {
    const title = document.getElementById('saveTitle').value.trim();
    const tagsInput = document.getElementById('saveTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
    
    if (!title) {
        alert('⚠️ Введи назву проекту!');
        return;
    }
    
    let history, preview;
    
    if (currentSaveMode === 'gemini') {
        history = [...geminiHistory];
        preview = geminiHistory[geminiHistory.length - 1]?.parts?.[0]?.text || 'Немає попереднього перегляду';
    } else if (currentSaveMode === 'deepseek') {
        history = [...deepseekHistory];
        preview = deepseekHistory[deepseekHistory.length - 1]?.content || 'Немає попереднього перегляду';
    }
    
    const conversation = {
        id: Date.now(),
        title: title,
        mode: currentSaveMode,
        tags: tags,
        history: history,
        codeFiles: currentSaveMode === 'deepseek' ? {...codeFiles} : null,
        preview: preview.substring(0, 200),
        date: new Date().toLocaleDateString('uk-UA'),
        favorite: false
    };
    
    savedConversations.unshift(conversation);
    saveSavedConversations();
    closeSaveModal();
    
    alert('✅ Розмову збережено!');
}

// Відобразити бібліотеку
function displayLibrary() {
    const content = document.getElementById('libraryContent');
    
    if (savedConversations.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3>Бібліотека порожня</h3>
                <p>Збережені розмови та проекти з'являться тут</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = savedConversations.map(conv => `
        <div class="library-item" data-id="${conv.id}" data-mode="${conv.mode}">
            <div class="library-item-header">
                <div>
                    <div class="library-item-title">${escapeHtml(conv.title)}</div>
                    <div class="library-item-meta">${conv.mode === 'gemini' ? '✨' : '💻'} ${conv.date}</div>
                </div>
                <button class="library-item-favorite" onclick="toggleFavorite(${conv.id})">${conv.favorite ? '⭐' : '☆'}</button>
            </div>
            <div class="library-item-preview">${escapeHtml(conv.preview)}</div>
            <div class="library-item-tags">
                ${conv.tags.map(tag => `<span class="library-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="library-item-actions">
                <button onclick="loadConversation(${conv.id})">📂 Відкрити</button>
                <button onclick="exportConversation(${conv.id})">📤 Експорт</button>
                <button onclick="deleteConversation(${conv.id})">🗑️ Видалити</button>
            </div>
        </div>
    `).join('');
}

// Перемикання улюблених
function toggleFavorite(id) {
    const conv = savedConversations.find(c => c.id === id);
    if (conv) {
        conv.favorite = !conv.favorite;
        saveSavedConversations();
        displayLibrary();
    }
}

// Завантажити розмову
function loadConversation(id) {
    const conv = savedConversations.find(c => c.id === id);
    if (!conv) return;
    
    if (conv.mode === 'gemini') {
        geminiHistory = [...conv.history];
        switchMode('gemini');
        displayHistory('geminiMessages', geminiHistory, 'gemini');
    } else if (conv.mode === 'deepseek') {
        deepseekHistory = [...conv.history];
        if (conv.codeFiles) {
            codeFiles = {...conv.codeFiles};
            displayCodeFiles();
        }
        switchMode('deepseek');
        displayHistory('deepseekMessages', deepseekHistory, 'deepseek');
    }
    
    alert('✅ Розмову завантажено!');
}

// Відобразити історію
function displayHistory(containerId, history, mode) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    history.forEach(msg => {
        const role = msg.role === 'user' || msg.role === 'user' ? 'user' : 'assistant';
        const content = msg.content || msg.parts?.[0]?.text || '';
        if (content) {
            addMessage(content, role, containerId);
        }
    });
}

// Експорт розмови
function exportConversation(id) {
    const conv = savedConversations.find(c => c.id === id);
    if (!conv) return;
    
    const markdown = generateMarkdown(conv);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Генерація Markdown
function generateMarkdown(conv) {
    let md = `# ${conv.title}\n\n`;
    md += `**Дата:** ${conv.date}\n`;
    md += `**Режим:** ${conv.mode === 'gemini' ? 'Gemini Chat' : 'DeepSeek Coder'}\n`;
    md += `**Теги:** ${conv.tags.join(', ')}\n\n`;
    md += `---\n\n`;
    
    conv.history.forEach(msg => {
        const role = msg.role === 'user' ? '👤 Користувач' : '🤖 AI';
        const content = msg.content || msg.parts?.[0]?.text || '';
        md += `## ${role}\n\n${content}\n\n`;
    });
    
    return md;
}

// Видалити розмову
function deleteConversation(id) {
    if (!confirm('⚠️ Видалити цю розмову?')) return;
    
    savedConversations = savedConversations.filter(c => c.id !== id);
    saveSavedConversations();
    displayLibrary();
    alert('✅ Розмову видалено!');
}

// Фільтри бібліотеки
function filterByType(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const items = document.querySelectorAll('.library-item');
    
    items.forEach(item => {
        const mode = item.dataset.mode;
        const id = parseInt(item.dataset.id);
        const conv = savedConversations.find(c => c.id === id);
        
        let show = true;
        
        if (type === 'gemini' && mode !== 'gemini') show = false;
        if (type === 'deepseek' && mode !== 'deepseek') show = false;
        if (type === 'image' && mode !== 'image') show = false;
        if (type === 'favorites' && !conv?.favorite) show = false;
        
        item.style.display = show ? 'block' : 'none';
    });
}

// Пошук в бібліотеці
function filterLibrary() {
    const query = document.getElementById('librarySearch').value.toLowerCase();
    const items = document.querySelectorAll('.library-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
    });
}

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

// Завантаження теми
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}

// Перемикання теми
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        icon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        icon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Перемикання sidebar (мобільна версія)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Ініціалізація гарячих клавіш
function initializeShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+K - Пошук
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
        
        // Ctrl+S - Зберегти
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (currentMode === 'gemini' || currentMode === 'deepseek') {
                saveConversation(currentMode);
            }
        }
        
        // Ctrl+Enter - Відправити повідомлення
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (currentMode === 'gemini') {
                sendGeminiMessage();
            } else if (currentMode === 'deepseek') {
                sendDeepseekMessage();
            } else if (currentMode === 'image') {
                generateImage();
            }
        }
        
        // Escape - Закрити модальні вікна
        if (e.key === 'Escape') {
            closeSearch();
            closeDiffViewer();
            closePreview();
            closeSaveModal();
        }
    });
}

// Пошук в історії
function openSearch() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    modal.classList.add('active');
    input.focus();
    
    input.oninput = function() {
        searchMessages(this.value);
    };
}

function closeSearch() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function searchMessages(query) {
    const results = document.getElementById('searchResults');
    if (!query.trim()) {
        results.innerHTML = '';
        return;
    }
    
    const history = currentMode === 'gemini' ? geminiHistory : deepseekHistory;
    const matches = [];
    
    history.forEach((msg, index) => {
        const content = msg.content || msg.parts?.[0]?.text || '';
        if (content.toLowerCase().includes(query.toLowerCase())) {
            matches.push({ index, content, role: msg.role });
        }
    });
    
    if (matches.length === 0) {
        results.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Нічого не знайдено</div>';
        return;
    }
    
    results.innerHTML = matches.map(match => {
        const preview = match.content.substring(0, 150) + '...';
        return `
            <div class="search-result-item" onclick="scrollToMessage(${match.index})">
                <div class="search-result-text">${escapeHtml(preview)}</div>
                <div class="search-result-meta">${match.role === 'user' ? '👤 Ви' : '🤖 AI'} • Повідомлення #${match.index + 1}</div>
            </div>
        `;
    }).join('');
}

function scrollToMessage(index) {
    closeSearch();
    const messagesDiv = document.getElementById(currentMode === 'gemini' ? 'geminiMessages' : 'deepseekMessages');
    const messages = messagesDiv.querySelectorAll('.message');
    if (messages[index]) {
        messages[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        messages[index].style.animation = 'highlight 2s ease';
    }
}

// Очищення чату
function clearChat(mode) {
    if (!confirm('⚠️ Очистити історію цього чату?')) return;
    
    if (mode === 'gemini') {
        geminiHistory = [];
        document.getElementById('geminiMessages').innerHTML = '';
    } else if (mode === 'deepseek') {
        deepseekHistory = [];
        document.getElementById('deepseekMessages').innerHTML = '';
        codeFiles = {};
        codeHistory = {};
        document.getElementById('fileTabs').innerHTML = '';
        document.getElementById('codeContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>Немає файлів</h3>
                <p>Код з'явиться тут після відповіді AI</p>
            </div>
        `;
    } else if (mode === 'image') {
        imageHistory = [];
        document.getElementById('imageGallery').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎨</div>
                <h3>Генерація зображень</h3>
                <p>Опиши що хочеш згенерувати (використовує DALL-E 3 через Pollinations.ai)</p>
            </div>
        `;
    }
    
    alert('✅ Чат очищено!');
}

// Preview HTML
function togglePreview() {
    const panel = document.getElementById('previewPanel');
    const isActive = panel.classList.contains('active');
    
    if (isActive) {
        closePreview();
    } else {
        const htmlFile = Object.keys(codeFiles).find(name => name.endsWith('.html'));
        if (!htmlFile) {
            alert('⚠️ HTML файл не знайдено!');
            return;
        }
        
        const frame = document.getElementById('previewFrame');
        let htmlContent = codeFiles[htmlFile].code;
        
        const cssFile = Object.keys(codeFiles).find(name => name.endsWith('.css'));
        const jsFile = Object.keys(codeFiles).find(name => name.endsWith('.js'));
        
        if (cssFile) {
            const cssContent = codeFiles[cssFile].code;
            htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        
        if (jsFile) {
            const jsContent = codeFiles[jsFile].code;
            htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script></body>`);
        }
        
        frame.srcdoc = htmlContent;
        panel.classList.add('active');
    }
}

function closePreview() {
    const panel = document.getElementById('previewPanel');
    panel.classList.remove('active');
}

// Завантаження всіх файлів як ZIP
async function downloadAllAsZip() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає файлів для завантаження!');
        return;
    }
    
    const zip = new JSZip();
    
    Object.keys(codeFiles).forEach(filename => {
        zip.file(filename, codeFiles[filename].code);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Diff Viewer
function showDiffViewer() {
    if (Object.keys(codeHistory).length < 1) {
        alert('⚠️ Потрібно мінімум 2 версії файлу для порівняння!');
        return;
    }
    
    const modal = document.getElementById('diffModal');
    const select1 = document.getElementById('diffFile1');
    const select2 = document.getElementById('diffFile2');
    
    select1.innerHTML = '<option value="">Виберіть версію 1</option>';
    select2.innerHTML = '<option value="">Виберіть версію 2</option>';
    
    Object.keys(codeHistory).forEach((filename) => {
        const versions = codeHistory[filename];
        if (versions.length < 2) return;
        
        versions.forEach((version, vIndex) => {
            const option = `<option value="${filename}-${vIndex}">${filename} (v${vIndex + 1})</option>`;
            select1.innerHTML += option;
            select2.innerHTML += option;
        });
    });
    
    modal.classList.add('active');
}

function closeDiffViewer() {
    const modal = document.getElementById('diffModal');
    modal.classList.remove('active');
}

function compareDiff() {
    const file1 = document.getElementById('diffFile1').value;
    const file2 = document.getElementById('diffFile2').value;
    
    if (!file1 || !file2) {
        alert('⚠️ Виберіть обидві версії!');
        return;
    }
    
    const [filename1, version1] = file1.split('-');
    const [filename2, version2] = file2.split('-');
    
    const code1 = codeHistory[filename1][version1].split('\n');
    const code2 = codeHistory[filename2][version2].split('\n');
    
    const result = document.getElementById('diffResult');
    result.innerHTML = '';
    
    const maxLines = Math.max(code1.length, code2.length);
    
    for (let i = 0; i < maxLines; i++) {
        const line1 = code1[i] || '';
        const line2 = code2[i] || '';
        
        let className = 'unchanged';
        let content = escapeHtml(line2 || line1);
        
        if (line1 !== line2) {
            if (!line1) {
                className = 'added';
                content = '+ ' + escapeHtml(line2);
            } else if (!line2) {
                className = 'removed';
                content = '- ' + escapeHtml(line1);
            } else {
                className = 'added';
                result.innerHTML += `<div class="diff-line removed">- ${escapeHtml(line1)}</div>`;
                content = '+ ' + escapeHtml(line2);
            }
        }
        
        result.innerHTML += `<div class="diff-line ${className}">${content}</div>`;
    }
}

// Завантаження налаштувань
function loadSettings() {
    const geminiKey = localStorage.getItem('gemini_api_key') || '';
    const groqKey = localStorage.getItem('groq_api_key') || '';
    const geminiPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асістент. Відповідай чітко, стисло та по суті. Говори українською мовою.';
    const deepseekPrompt = localStorage.getItem('deepseek_system_prompt') || 'Ти експерт-програміст. Пиши чистий, оптимізований код з коментарями. Створюй окремі файли для HTML, CSS, JS. Говори українською мовою.';

    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const groqApiKeyInput = document.getElementById('groqApiKey');
    const geminiSystemPromptInput = document.getElementById('geminiSystemPrompt');
    const deepseekSystemPromptInput = document.getElementById('deepseekSystemPrompt');

    if (geminiApiKeyInput) geminiApiKeyInput.value = geminiKey;
    if (groqApiKeyInput) groqApiKeyInput.value = groqKey;
    if (geminiSystemPromptInput) geminiSystemPromptInput.value = geminiPrompt;
    if (deepseekSystemPromptInput) deepseekSystemPromptInput.value = deepseekPrompt;
}

// Збереження налаштувань
function saveSettings() {
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const groqKey = document.getElementById('groqApiKey').value.trim();
    const geminiPrompt = document.getElementById('geminiSystemPrompt').value.trim();
    const deepseekPrompt = document.getElementById('deepseekSystemPrompt').value.trim();

    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('groq_api_key', groqKey);
    localStorage.setItem('gemini_system_prompt', geminiPrompt);
    localStorage.setItem('deepseek_system_prompt', deepseekPrompt);

    alert('✅ Налаштування збережено!');
}

// Очищення всіх даних
function clearAllData() {
    if (confirm('⚠️ Видалити всі дані (історію, налаштування, ключі)? Цю дію не можна скасувати!')) {
        localStorage.clear();
        geminiHistory = [];
        deepseekHistory = [];
        imageHistory = [];
        savedConversations = [];
        codeFiles = {};
        codeHistory = {};
        stats = {
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            totalTokens: 0,
            firstUse: Date.now()
        };
        
        document.getElementById('geminiMessages').innerHTML = '';
        document.getElementById('deepseekMessages').innerHTML = '';
        document.getElementById('imageGallery').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎨</div><h3>Генерація зображень</h3><p>Опиши що хочеш згенерувати</p></div>';
        document.getElementById('fileTabs').innerHTML = '';
        document.getElementById('codeContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h3>Немає файлів</h3><p>Код з\'явиться тут після відповіді AI</p></div>';
        
        loadSettings();
        updateStats();
        displayLibrary();
        alert('🗑️ Всі дані видалено!');
    }
}

// Перемикання режимів
function switchMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const clickedButton = event?.target?.closest('.menu-btn');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const modeElement = document.getElementById(`${mode}Mode`);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    // Якщо переходимо в бібліотеку - відобразити її
    if (mode === 'library') {
        displayLibrary();
    }
}

// Ініціалізація полів вводу
function initializeInputs() {
    const inputs = ['geminiInput', 'deepseekInput', 'imageInput'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                if (inputId === 'geminiInput') {
                    sendGeminiMessage();
                } else if (inputId === 'deepseekInput') {
                    sendDeepseekMessage();
                } else if (inputId === 'imageInput') {
                    generateImage();
                }
            }
        });
    });
}

// Додавання повідомлення в чат
function addMessage(text, sender, messagesId) {
    const messagesDiv = document.getElementById(messagesId);
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text || '(Код у правій панелі)';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Підрахунок токенів (приблизний)
function estimateTokens(text) {
    // Приблизно 1 токен = 4 символи для англійської, ~2 для української
    return Math.ceil(text.length / 3);
}

// Gemini Message
async function sendGeminiMessage() {
    const input = document.getElementById('geminiInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Gemini API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'geminiMessages');
    geminiHistory.push({ role: 'user', parts: [{ text: message }] });

    if (geminiHistory.length > 20) {
        geminiHistory = geminiHistory.slice(-20);
    }

    const sendBtn = document.getElementById('geminiSendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    }

    try {
        const systemPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асістент.';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: geminiHistory,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Помилка API');
        }

        const aiMessage = data.candidates[0].content.parts[0].text;
        
        geminiHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
        addMessage(aiMessage, 'assistant', 'geminiMessages');
        
        // Оновити статистику
        stats.geminiRequests++;
        stats.totalTokens += estimateTokens(message + aiMessage);
        saveStats();

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'geminiMessages');
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Надіслати';
        }
    }
}

// DeepSeek Message
async function sendDeepseekMessage() {
    const input = document.getElementById('deepseekInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;

    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'deepseekMessages');
    
    const systemPrompt = localStorage.getItem('deepseek_system_prompt') || 'Ти експерт-програміст.';
    
    deepseekHistory.push({ role: 'user', content: message });

    if (deepseekHistory.length > 40) {
        deepseekHistory = deepseekHistory.slice(-40);
    }

    const sendBtn = document.getElementById('deepseekSendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    }

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...deepseekHistory
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Помилка API: ${response.status}`);
        }

        const aiMessage = data.choices[0].message.content;
        
        deepseekHistory.push({ role: 'assistant', content: aiMessage });
        
        const textOnly = removeCodeBlocks(aiMessage);
        addMessage(textOnly, 'assistant', 'deepseekMessages');
        
        extractAndDisplayCode(aiMessage);
        
        // Оновити статистику
        stats.deepseekRequests++;
        stats.totalTokens += estimateTokens(message + aiMessage);
        saveStats();

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'deepseekMessages');
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Надіслати';
        }
    }
}

// Видалення блоків коду з тексту
function removeCodeBlocks(text) {
    return text.replace(/```[\s\S]*?```/g, '').trim();
}

// Витягування та відображення коду
function extractAndDisplayCode(text) {
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let fileIndex = Object.keys(codeFiles).length;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const lang = match[1] || 'txt';
        const code = match[2].trim();
        
        let filename = detectFilename(code, lang);
        
        if (!filename) {
            fileIndex++;
            filename = `file_${fileIndex}.${getExtension(lang)}`;
        }
        
        // Зберегти версію для diff
        if (!codeHistory[filename]) {
            codeHistory[filename] = [];
        }
        codeHistory[filename].push(code);
        
        codeFiles[filename] = {
            language: lang,
            code: code
        };
    }
    
    if (Object.keys(codeFiles).length > 0) {
        displayCodeFiles();
    }
}

// Визначення імені файлу з коду
function detectFilename(code, lang) {
    const lines = code.split('\n');
    for (let line of lines.slice(0, 5)) {
        if (line.includes('<!DOCTYPE') || line.includes('<html')) return 'index.html';
        if (line.includes('def ') && lang === 'python') return 'main.py';
        if (line.includes('function ') || line.includes('const ') || line.includes('let ')) return 'script.js';
        if (line.includes('body {') || line.includes('* {')) return 'styles.css';
    }
    return null;
}

// Отримання розширення файлу за мовою
function getExtension(lang) {
    const extensions = {
        'javascript': 'js',
        'python': 'py',
        'html': 'html',
        'css': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
        'typescript': 'ts',
        'json': 'json'
    };
    return extensions[lang.toLowerCase()] || 'txt';
}

// Відображення файлів з кодом
function displayCodeFiles() {
    const tabsDiv = document.getElementById('fileTabs');
    const contentDiv = document.getElementById('codeContent');
    
    if (!tabsDiv || !contentDiv) return;
    
    tabsDiv.innerHTML = '';
    contentDiv.innerHTML = '';
    
    const filenames = Object.keys(codeFiles);
    
    filenames.forEach((filename, index) => {
        const tab = document.createElement('div');
        tab.className = 'file-tab' + (index === 0 ? ' active' : '');
        tab.textContent = filename;
        tab.onclick = () => switchFile(filename);
        tabsDiv.appendChild(tab);
        
        const fileDiv = document.createElement('div');
        fileDiv.className = 'code-file' + (index === 0 ? ' active' : '');
        fileDiv.dataset.filename = filename;
        
        const file = codeFiles[filename];
        
        // Підсвічування синтаксису з Prism.js
        const languageClass = `language-${file.language}`;
        const highlightedCode = Prism.highlight(file.code, Prism.languages[file.language] || Prism.languages.plaintext, file.language);
        
        fileDiv.innerHTML = `
            <div class="code-block">
                <div class="code-block-header">
                    <div class="code-block-info">
                        <span class="code-block-lang">${file.language}</span>
                        <span class="code-block-name">${filename}</span>
                    </div>
                    <div>
                        <button onclick="copyCode('${filename}')">📋 Копіювати</button>
                        <button onclick="downloadFile('${filename}')">💾 Завантажити</button>
                    </div>
                </div>
                <pre><code class="${languageClass}" id="code-${filename}">${highlightedCode}</code></pre>
            </div>
        `;
        
        contentDiv.appendChild(fileDiv);
    });
    
    activeFile = filenames[0];
}

// Перемикання між файлами
function switchFile(filename) {
    document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === filename) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.code-file').forEach(file => {
        file.classList.remove('active');
        if (file.dataset.filename === filename) {
            file.classList.add('active');
        }
    });
    
    activeFile = filename;
}

// Копіювання коду в буфер обміну
function copyCode(filename) {
    const code = codeFiles[filename].code;
    navigator.clipboard.writeText(code).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Скопійовано!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Завантаження файлу
function downloadFile(filename) {
    if (!codeFiles[filename]) return;
    
    const code = codeFiles[filename].code;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Екранування HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Анімація виділення
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0%, 100% { background: transparent; }
        50% { background: rgba(102, 126, 234, 0.3); }
    }
`;
document.head.appendChild(style);
