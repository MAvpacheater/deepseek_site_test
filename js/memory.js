// 🧠 Agent Memory System - Система пам'яті агента

let memories = [];
let memoryCategories = ['загальне', 'важливе', 'завдання', 'навчання', 'персональне'];

// Завантаження пам'яті
function loadMemories() {
    const saved = localStorage.getItem('agent_memory');
    if (saved) {
        memories = JSON.parse(saved);
    }
    updateMemoryStats();
    displayMemories();
}

// Збереження пам'яті
function saveMemories() {
    localStorage.setItem('agent_memory', JSON.stringify(memories));
    updateMemoryStats();
}

// Оновлення статистики
function updateMemoryStats() {
    const totalSpan = document.getElementById('totalMemories');
    const importantSpan = document.getElementById('importantMemories');
    const memoryCountSpan = document.getElementById('memoryCount');
    
    if (totalSpan) {
        totalSpan.textContent = memories.length;
    }
    
    if (importantSpan) {
        importantSpan.textContent = memories.filter(m => m.important).length;
    }
    
    if (memoryCountSpan) {
        memoryCountSpan.textContent = memories.length;
    }
}

// Відобразити спогади
function displayMemories() {
    const list = document.getElementById('memoriesList');
    if (!list) return;
    
    if (memories.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧠</div>
                <h3>Пам'ять порожня</h3>
                <p>Агент запам'ятає важливу інформацію автоматично</p>
            </div>
        `;
        return;
    }
    
    // Сортувати за датою (новіші зверху)
    const sorted = [...memories].sort((a, b) => 
        new Date(b.created) - new Date(a.created)
    );
    
    list.innerHTML = sorted.map(memory => `
        <div class="memory-card ${memory.important ? 'important' : ''}" data-id="${memory.id}">
            <div class="memory-header">
                <div class="memory-icon">
                    ${memory.important ? '⭐' : getMemoryIcon(memory.category)}
                </div>
                <div class="memory-info">
                    <div class="memory-title">${escapeHtml(memory.title)}</div>
                    <div class="memory-meta">
                        <span class="memory-category">${memory.category}</span>
                        <span class="memory-date">${formatDate(memory.created)}</span>
                    </div>
                </div>
                <button class="memory-menu-btn" onclick="toggleMemoryMenu(${memory.id})">⋮</button>
            </div>
            
            <div class="memory-content">${escapeHtml(memory.content)}</div>
            
            ${memory.tags && memory.tags.length > 0 ? `
                <div class="memory-tags">
                    ${memory.tags.map(tag => `<span class="memory-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="memory-actions" id="memory-menu-${memory.id}" style="display: none;">
                <button onclick="editMemory(${memory.id})">✏️ Редагувати</button>
                <button onclick="toggleImportant(${memory.id})">
                    ${memory.important ? '☆ Зняти важливість' : '⭐ Важливо'}
                </button>
                <button onclick="deleteMemory(${memory.id})">🗑️ Видалити</button>
            </div>
        </div>
    `).join('');
}

// Додати спогад
function addMemory() {
    const modal = document.getElementById('memoryModal');
    modal.classList.add('active');
    
    // Очистити форму
    document.getElementById('memoryTitle').value = '';
    document.getElementById('memoryContent').value = '';
    document.getElementById('memoryImportant').checked = false;
}

// Зберегти спогад
function saveMemory() {
    const title = document.getElementById('memoryTitle').value.trim();
    const content = document.getElementById('memoryContent').value.trim();
    const important = document.getElementById('memoryImportant').checked;
    
    if (!title || !content) {
        alert('⚠️ Заповни всі поля!');
        return;
    }
    
    // Визначити категорію автоматично
    const category = detectCategory(title, content);
    
    // Витягти теги
    const tags = extractTags(content);
    
    const memory = {
        id: Date.now(),
        title: title,
        content: content,
        category: category,
        important: important,
        tags: tags,
        created: new Date().toISOString(),
        accessed: 0
    };
    
    memories.unshift(memory);
    saveMemories();
    displayMemories();
    closeModal('memoryModal');
    
    alert('✅ Спогад збережено!');
}

// Автоматичне визначення категорії
function detectCategory(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('важлив') || text.includes('критичн') || text.includes('терміново')) {
        return 'важливе';
    }
    if (text.includes('завдан') || text.includes('зроби') || text.includes('треба')) {
        return 'завдання';
    }
    if (text.includes('навчи') || text.includes('вивчи') || text.includes('запам\'ята')) {
        return 'навчання';
    }
    if (text.includes('особист') || text.includes('приват') || text.includes('мій')) {
        return 'персональне';
    }
    
    return 'загальне';
}

// Витягти теги з тексту
function extractTags(text) {
    // Шукати слова після #
    const hashTags = text.match(/#[\wа-яіїє]+/gi) || [];
    const tags = hashTags.map(tag => tag.substring(1).toLowerCase());
    
    // Додати ключові слова
    const keywords = ['проект', 'ідея', 'баг', 'фіча', 'todo'];
    keywords.forEach(word => {
        if (text.toLowerCase().includes(word) && !tags.includes(word)) {
            tags.push(word);
        }
    });
    
    return [...new Set(tags)]; // Унікальні теги
}

// Пошук в пам'яті
function searchMemories() {
    const query = document.getElementById('memorySearch').value.toLowerCase();
    
    const cards = document.querySelectorAll('.memory-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
}

// Переключити меню спогаду
function toggleMemoryMenu(memoryId) {
    const menu = document.getElementById(`memory-menu-${memoryId}`);
    if (menu) {
        const isVisible = menu.style.display !== 'none';
        
        // Закрити всі інші меню
        document.querySelectorAll('.memory-actions').forEach(m => {
            m.style.display = 'none';
        });
        
        menu.style.display = isVisible ? 'none' : 'flex';
    }
}

// Редагувати спогад
function editMemory(memoryId) {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;
    
    document.getElementById('memoryTitle').value = memory.title;
    document.getElementById('memoryContent').value = memory.content;
    document.getElementById('memoryImportant').checked = memory.important;
    
    // Видалити старий спогад після редагування
    memories = memories.filter(m => m.id !== memoryId);
    
    const modal = document.getElementById('memoryModal');
    modal.classList.add('active');
}

// Переключити важливість
function toggleImportant(memoryId) {
    const memory = memories.find(m => m.id === memoryId);
    if (memory) {
        memory.important = !memory.important;
        saveMemories();
        displayMemories();
    }
}

// Видалити спогад
function deleteMemory(memoryId) {
    if (!confirm('⚠️ Видалити цей спогад?')) return;
    
    memories = memories.filter(m => m.id !== memoryId);
    saveMemories();
    displayMemories();
}

// Очистити всю пам'ять
function clearMemories() {
    if (!confirm('⚠️ Видалити всі спогади? Цю дію не можна скасувати!')) return;
    
    memories = [];
    localStorage.removeItem('agent_memory');
    updateMemoryStats();
    displayMemories();
    
    alert('🗑️ Пам\'ять очищено!');
}

// Автоматичне запам'ятовування (викликається після дій користувача)
function autoRemember(type, data) {
    const autoMemoryEnabled = localStorage.getItem('agentMemory') !== 'false';
    if (!autoMemoryEnabled) return;
    
    let title, content, important = false;
    
    switch (type) {
        case 'project_saved':
            title = `Проект: ${data.title}`;
            content = `Збережено проект "${data.title}". ${data.mode === 'deepseek' ? 'Код' : 'Розмова'} з ${data.messages} повідомленнями.`;
            break;
            
        case 'plan_completed':
            title = `Виконано: ${data.title}`;
            content = `План "${data.title}" успішно завершено ${formatDate(new Date())}`;
            important = true;
            break;
            
        case 'code_generated':
            title = 'Згенеровано код';
            content = `Створено ${data.filesCount} файлів: ${data.files.join(', ')}`;
            break;
            
        case 'user_preference':
            title = 'Налаштування користувача';
            content = data.preference;
            important = true;
            break;
    }
    
    if (title && content) {
        const memory = {
            id: Date.now(),
            title: title,
            content: content,
            category: type.includes('plan') ? 'завдання' : 'загальне',
            important: important,
            tags: [type],
            created: new Date().toISOString(),
            accessed: 0,
            auto: true
        };
        
        memories.unshift(memory);
        
        // Обмежити автоматичні спогади (залишити тільки 50)
        const autoMemories = memories.filter(m => m.auto);
        if (autoMemories.length > 50) {
            const toRemove = autoMemories[autoMemories.length - 1];
            memories = memories.filter(m => m.id !== toRemove.id);
        }
        
        saveMemories();
    }
}

// Експорт пам'яті
function exportMemories() {
    if (memories.length === 0) {
        alert('⚠️ Немає спогадів для експорту!');
        return;
    }
    
    let markdown = '# 🧠 Пам\'ять AI Агента\n\n';
    markdown += `Експортовано: ${new Date().toLocaleString('uk-UA')}\n\n`;
    markdown += `Всього спогадів: ${memories.length}\n\n`;
    markdown += '---\n\n';
    
    memories.forEach(memory => {
        markdown += `## ${memory.important ? '⭐ ' : ''}${memory.title}\n\n`;
        markdown += `**Категорія:** ${memory.category}  \n`;
        markdown += `**Дата:** ${formatDate(memory.created)}  \n`;
        
        if (memory.tags && memory.tags.length > 0) {
            markdown += `**Теги:** ${memory.tags.join(', ')}  \n`;
        }
        
        markdown += `\n${memory.content}\n\n`;
        markdown += '---\n\n';
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-memory.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Пам\'ять експортовано!');
}

// Отримати іконку за категорією
function getMemoryIcon(category) {
    const icons = {
        'загальне': '💭',
        'важливе': '⭐',
        'завдання': '📋',
        'навчання': '📚',
        'персональне': '👤'
    };
    return icons[category] || '💭';
}

// Форматувати дату
function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'щойно';
    if (minutes < 60) return `${minutes} хв тому`;
    if (hours < 24) return `${hours} год тому`;
    if (days < 7) return `${days} дн тому`;
    
    return d.toLocaleDateString('uk-UA');
}

// Ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    loadMemories();
});

// Експорт функції для автоматичного запам'ятовування
window.autoRemember = autoRemember;
