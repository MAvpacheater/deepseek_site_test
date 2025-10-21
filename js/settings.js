// Settings & Statistics Logic
let stats = {
    geminiRequests: 0,
    deepseekRequests: 0,
    imagesGenerated: 0,
    savedProjects: 0,
    totalTokens: 0,
    firstUse: null
};

let savedConversations = [];
let currentSaveMode = null;

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
