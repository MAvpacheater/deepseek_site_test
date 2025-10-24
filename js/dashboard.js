// 📊 Dashboard Manager - Головна панель з РЕАЛЬНИМИ ДАНИМИ

class DashboardManager {
    constructor() {
        this.refreshInterval = null;
        this.activityFilter = 'all';
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        console.log('✅ Dashboard Manager initialized');
    }

    // ========================================
    // РЕНДЕРИНГ DASHBOARD
    // ========================================

    async render() {
        const container = document.getElementById('dashboardContent');
        if (!container) return;

        container.innerHTML = '';

        // Отримати РЕАЛЬНІ дані
        const stats = await this.getStats();
        const activities = await this.getRecentActivities();

        const quickAccessSection = this.createQuickAccessSection(stats);
        container.appendChild(quickAccessSection);

        const statsSection = this.createStatsSection(stats);
        container.appendChild(statsSection);

        const activitySection = this.createActivitySection(activities);
        container.appendChild(activitySection);

        const quickActionsSection = this.createQuickActionsSection();
        container.appendChild(quickActionsSection);

        const systemInfoSection = this.createSystemInfoSection(stats);
        container.appendChild(systemInfoSection);
    }

    // ========================================
    // QUICK ACCESS
    // ========================================

    createQuickAccessSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '🚀 Швидкий доступ';

        const grid = document.createElement('div');
        grid.className = 'quick-access-grid';

        const geminiCard = this.createChatCard({
            id: 'gemini',
            icon: '✨',
            title: 'Gemini Chat',
            subtitle: 'Розумовий асистент',
            description: 'Gemini 2.0 Flash для загальних питань, планування та аналізу',
            requestsCount: stats.geminiRequests,
            messagesCount: stats.geminiMessages,
            lastActivity: this.getLastActivity('gemini', stats.geminiLastActivity),
            color: '#58a6ff'
        });

        const coderCard = this.createChatCard({
            id: 'deepseek',
            icon: '💻',
            title: 'DeepSeek Coder',
            subtitle: 'Генерація коду',
            description: 'Llama 3.3 70B для створення, аналізу та рефакторингу коду',
            requestsCount: stats.deepseekRequests,
            messagesCount: stats.deepseekMessages,
            lastActivity: this.getLastActivity('deepseek', stats.deepseekLastActivity),
            color: '#3fb950'
        });

        const imageCard = this.createChatCard({
            id: 'image',
            icon: '🖼️',
            title: 'Image Generator',
            subtitle: 'Генерація зображень',
            description: 'Pollinations.ai для створення унікальних зображень за описом',
            requestsCount: stats.imagesGenerated,
            messagesCount: stats.imagesGenerated,
            lastActivity: this.getLastActivity('image', stats.imageLastActivity),
            color: '#d29922'
        });

        grid.appendChild(geminiCard);
        grid.appendChild(coderCard);
        grid.appendChild(imageCard);

        section.appendChild(title);
        section.appendChild(grid);

        return section;
    }

    createChatCard(config) {
        const card = document.createElement('div');
        card.className = `chat-card ${config.id}`;
        card.onclick = () => {
            if (typeof switchMode === 'function') {
                switchMode(config.id);
            }
        };

        card.innerHTML = `
            <div class="chat-card-header">
                <div class="chat-card-icon">${config.icon}</div>
                <div class="chat-card-info">
                    <div class="chat-card-title">${config.title}</div>
                    <div class="chat-card-subtitle">${config.subtitle}</div>
                </div>
            </div>

            <div class="chat-card-stats">
                <div class="chat-stat">
                    <div class="chat-stat-value" style="color: ${config.color}">${config.requestsCount}</div>
                    <div class="chat-stat-label">Запитів</div>
                </div>
                <div class="chat-stat">
                    <div class="chat-stat-value" style="color: ${config.color}">${config.messagesCount}</div>
                    <div class="chat-stat-label">Повідомлень</div>
                </div>
            </div>

            <div class="chat-card-description">${config.description}</div>

            <div class="chat-card-action">
                <button class="chat-card-btn" style="--card-accent: ${config.color}">
                    <span>Відкрити</span>
                    <span>→</span>
                </button>
                <div class="chat-card-last-activity">${config.lastActivity}</div>
            </div>
        `;

        return card;
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    createStatsSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '📈 Статистика';

        const grid = document.createElement('div');
        grid.className = 'stats-overview';

        const statsData = [
            { icon: '✨', value: stats.geminiRequests, label: 'Gemini запитів', color: '#58a6ff', trend: this.calculateTrend('gemini', stats) },
            { icon: '💻', value: stats.deepseekRequests, label: 'DeepSeek запитів', color: '#3fb950', trend: this.calculateTrend('deepseek', stats) },
            { icon: '🖼️', value: stats.imagesGenerated, label: 'Згенеровано зображень', color: '#d29922', trend: this.calculateTrend('images', stats) },
            { icon: '📚', value: stats.savedProjects, label: 'Збережених проектів', color: '#a371f7', trend: null },
            { icon: '🔢', value: this.formatNumber(stats.totalTokens), label: 'Використано токенів', color: '#f85149', trend: null },
            { icon: '📅', value: this.calculateDaysUsed(stats.firstUse), label: 'Днів використання', color: '#8b949e', trend: null }
        ];

        statsData.forEach(stat => {
            const card = this.createStatCard(stat);
            grid.appendChild(card);
        });

        section.appendChild(title);
        section.appendChild(grid);
        return section;
    }

    createStatCard(stat) {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.setProperty('--stat-color', stat.color);

        const trendHTML = stat.trend ? `
            <div class="stat-card-trend ${stat.trend > 0 ? 'up' : 'down'}">
                ${stat.trend > 0 ? '↑' : '↓'} ${Math.abs(stat.trend)}%
            </div>` : '';

        card.innerHTML = `
            <div class="stat-card-header">
                <div class="stat-card-icon" style="background: ${stat.color}15">${stat.icon}</div>
                ${trendHTML}
            </div>
            <div class="stat-card-content">
                <div class="stat-card-value" style="color: ${stat.color}">${stat.value}</div>
                <div class="stat-card-label">${stat.label}</div>
            </div>
        `;
        return card;
    }

    // ========================================
    // АКТИВНІСТЬ
    // ========================================

    createActivitySection(activities) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '⏱️ Остання активність';

        const timeline = document.createElement('div');
        timeline.className = 'activity-timeline';

        const header = document.createElement('div');
        header.className = 'activity-timeline-header';
        header.innerHTML = `
            <h3 class="activity-timeline-title">Хронологія подій</h3>
            <div class="activity-timeline-filter">
                <button class="filter-btn active" onclick="dashboardManager.filterActivity('all')">Всі</button>
                <button class="filter-btn" onclick="dashboardManager.filterActivity('chat')">Чати</button>
                <button class="filter-btn" onclick="dashboardManager.filterActivity('code')">Код</button>
                <button class="filter-btn" onclick="dashboardManager.filterActivity('system')">Система</button>
            </div>
        `;

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'timeline-items';
        itemsContainer.id = 'timelineItems';

        if (activities.length === 0) {
            itemsContainer.innerHTML = `
                <div class="dashboard-empty-state">
                    <div class="dashboard-empty-state-icon">⏱️</div>
                    <h3>Немає активності</h3>
                    <p>Почніть роботу, і тут з'являться події вашої історії.</p>
                </div>
            `;
        } else {
            activities.forEach(act => {
                const item = document.createElement('div');
                item.className = `timeline-item ${act.type}`;
                item.style.setProperty('--timeline-color', act.color || '#58a6ff');
                item.innerHTML = `
                    <div class="timeline-icon">${act.icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">${act.title}</div>
                        <div class="timeline-description">${act.description}</div>
                        <div class="timeline-time">${act.time}</div>
                    </div>
                `;
                itemsContainer.appendChild(item);
            });
        }

        timeline.appendChild(header);
        timeline.appendChild(itemsContainer);
        section.appendChild(title);
        section.appendChild(timeline);
        return section;
    }

    filterActivity(type) {
        this.activityFilter = type;
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        const active = Array.from(buttons).find(b => b.textContent.toLowerCase().includes(type === 'all' ? 'всі' : type));
        if (active) active.classList.add('active');

        const items = document.querySelectorAll('.timeline-item');
        items.forEach(item => {
            item.style.display = (type === 'all' || item.classList.contains(type)) ? '' : 'none';
        });
    }

    // ========================================
    // ШВИДКІ ДІЇ
    // ========================================

    createQuickActionsSection() {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '⚡ Швидкі дії';

        const grid = document.createElement('div');
        grid.className = 'quick-actions-grid';

        const actions = [
            { icon: '💬', label: 'Новий чат', action: () => switchMode('gemini') },
            { icon: '💻', label: 'Створити код', action: () => switchMode('deepseek') },
            { icon: '🖼️', label: 'Згенерувати зображення', action: () => switchMode('image') },
            { icon: '📚', label: 'Мої проекти', action: () => switchMode('library') },
            { icon: '📅', label: 'Планувальник', action: () => switchMode('planner') },
            { icon: '⚙️', label: 'Налаштування', action: () => switchMode('settings') }
        ];

        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.innerHTML = `${a.icon} ${a.label}`;
            btn.onclick = a.action;
            grid.appendChild(btn);
        });

        section.appendChild(title);
        section.appendChild(grid);
        return section;
    }

    // ========================================
    // СИСТЕМНА ІНФОРМАЦІЯ
    // ========================================

    createSystemInfoSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '💻 Системна інформація';

        const info = document.createElement('div');
        info.className = 'system-info';

        const uptimeDays = this.calculateDaysUsed(stats.firstUse);
        const firstUseDate = stats.firstUse ? new Date(stats.firstUse).toLocaleDateString('uk-UA') : 'Сьогодні';
        
        info.innerHTML = `
            <div class="system-info-grid">
                <div class="info-item">
                    <div class="info-item-icon">🧭</div>
                    <div class="info-item-content">
                        <div class="info-item-label">Перше використання</div>
                        <div class="info-item-value">${firstUseDate}</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-item-icon">📅</div>
                    <div class="info-item-content">
                        <div class="info-item-label">Активність триває</div>
                        <div class="info-item-value">${uptimeDays} днів</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-item-icon">🧩</div>
                    <div class="info-item-content">
                        <div class="info-item-label">Версія системи</div>
                        <div class="info-item-value">v2.3.1</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-item-icon">🕓</div>
                    <div class="info-item-content">
                        <div class="info-item-label">Останнє оновлення</div>
                        <div class="info-item-value">${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            </div>
        `;

        section.appendChild(title);
        section.appendChild(info);
        return section;
    }

    // ========================================
    // ДОПОМІЖНІ МЕТОДИ - РЕАЛЬНІ ДАНІ
    // ========================================

    async getStats() {
        // Отримати статистику з appState
        const stats = window.appState ? appState.getStats() : {
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            totalTokens: 0,
            firstUse: Date.now()
        };

        // Додати додаткову інформацію
        if (window.appState) {
            const geminiHistory = appState.getGeminiHistory();
            const deepseekHistory = appState.getDeepSeekHistory();
            const imageGallery = appState.chat.image.gallery;

            stats.geminiMessages = geminiHistory.length;
            stats.deepseekMessages = deepseekHistory.length;
            
            // Останні активності
            stats.geminiLastActivity = this.getLastMessageTime(geminiHistory);
            stats.deepseekLastActivity = this.getLastMessageTime(deepseekHistory);
            stats.imageLastActivity = imageGallery.length > 0 ? imageGallery[0].timestamp : null;
        } else {
            stats.geminiMessages = 0;
            stats.deepseekMessages = 0;
            stats.geminiLastActivity = null;
            stats.deepseekLastActivity = null;
            stats.imageLastActivity = null;
        }

        // Отримати збережені проекти з storageManager
        if (window.storageManager) {
            try {
                const conversations = await storageManager.getConversations();
                const codeProjects = await storageManager.getCodeProjects();
                stats.savedProjects = conversations.length + codeProjects.length;
            } catch (error) {
                console.error('Failed to get saved projects:', error);
            }
        }

        return stats;
    }

    getLastMessageTime(history) {
        if (!history || history.length === 0) return null;
        
        // Шукати timestamp в останньому повідомленні
        const lastMessage = history[history.length - 1];
        return lastMessage.timestamp || lastMessage.created || Date.now();
    }

    async getRecentActivities() {
        const activities = [];

        try {
            // Активність з чатів
            if (window.appState) {
                const geminiHistory = appState.getGeminiHistory();
                const deepseekHistory = appState.getDeepSeekHistory();
                const imageGallery = appState.chat.image.gallery;

                // Gemini активність
                if (geminiHistory.length > 0) {
                    const lastTime = this.getLastMessageTime(geminiHistory);
                    activities.push({
                        type: 'chat',
                        icon: '✨',
                        color: '#58a6ff',
                        title: 'Gemini Chat',
                        description: `${geminiHistory.length} повідомлень`,
                        time: this.formatTimeAgo(lastTime),
                        timestamp: lastTime
                    });
                }

                // DeepSeek активність
                if (deepseekHistory.length > 0) {
                    const lastTime = this.getLastMessageTime(deepseekHistory);
                    const codeFiles = appState.getAllCodeFiles();
                    activities.push({
                        type: 'code',
                        icon: '💻',
                        color: '#3fb950',
                        title: 'DeepSeek Coder',
                        description: `${Object.keys(codeFiles).length} файлів створено`,
                        time: this.formatTimeAgo(lastTime),
                        timestamp: lastTime
                    });
                }

                // Image активність
                if (imageGallery.length > 0) {
                    const lastImage = imageGallery[0];
                    activities.push({
                        type: 'chat',
                        icon: '🖼️',
                        color: '#d29922',
                        title: 'Image Generator',
                        description: lastImage.prompt.substring(0, 50) + '...',
                        time: this.formatTimeAgo(lastImage.timestamp),
                        timestamp: lastImage.timestamp
                    });
                }

                // Плани
                const plans = appState.getPlans();
                const completedPlans = plans.filter(p => p.status === 'completed');
                if (completedPlans.length > 0) {
                    const lastPlan = completedPlans[completedPlans.length - 1];
                    activities.push({
                        type: 'system',
                        icon: '✅',
                        color: '#3fb950',
                        title: 'План завершено',
                        description: lastPlan.title,
                        time: this.formatTimeAgo(lastPlan.updatedAt || lastPlan.created),
                        timestamp: lastPlan.updatedAt || lastPlan.created
                    });
                }

                // Спогади
                const memories = appState.getMemories();
                if (memories.length > 0) {
                    const lastMemory = memories[0];
                    activities.push({
                        type: 'system',
                        icon: '🧠',
                        color: '#a371f7',
                        title: 'Новий спогад',
                        description: lastMemory.title,
                        time: this.formatTimeAgo(lastMemory.timestamp),
                        timestamp: lastMemory.timestamp
                    });
                }
            }

            // Збережені проекти
            if (window.storageManager) {
                const conversations = await storageManager.getConversations();
                if (conversations.length > 0) {
                    const lastSaved = conversations[conversations.length - 1];
                    activities.push({
                        type: 'system',
                        icon: '💾',
                        color: '#58a6ff',
                        title: 'Проект збережено',
                        description: lastSaved.title,
                        time: this.formatTimeAgo(lastSaved.createdAt),
                        timestamp: new Date(lastSaved.createdAt).getTime()
                    });
                }
            }

            // Сортувати за часом (новіші зверху)
            activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Повернути останні 10
            return activities.slice(0, 10);

        } catch (error) {
            console.error('Failed to get activities:', error);
            return [];
        }
    }

    getLastActivity(model, lastActivityTime) {
        if (!lastActivityTime) {
            return 'Немає активності';
        }
        return this.formatTimeAgo(lastActivityTime);
    }

    calculateTrend(type, stats) {
        // Розрахувати тренд на основі збережених даних
        const trendKey = `${type}_trend`;
        const previousValue = parseInt(localStorage.getItem(trendKey) || '0');
        
        let currentValue = 0;
        switch(type) {
            case 'gemini':
                currentValue = stats.geminiRequests;
                break;
            case 'deepseek':
                currentValue = stats.deepseekRequests;
                break;
            case 'images':
                currentValue = stats.imagesGenerated;
                break;
        }

        if (previousValue === 0) {
            localStorage.setItem(trendKey, currentValue.toString());
            return 0;
        }

        const trend = Math.round(((currentValue - previousValue) / previousValue) * 100);
        localStorage.setItem(trendKey, currentValue.toString());
        
        return trend;
    }

    calculateDaysUsed(firstUse) {
        if (!firstUse) return 1;
        const start = new Date(firstUse);
        const now = new Date();
        const diff = now - start;
        return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toLocaleString('uk-UA');
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'невідомо';

        const now = Date.now();
        const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
        const diff = now - time;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days < 7) return `${days} дн тому`;
        if (days < 30) return `${Math.floor(days / 7)} тиж тому`;
        
        return new Date(time).toLocaleDateString('uk-UA');
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const dashboardManager = new DashboardManager();

// Автоматичне оновлення кожні 30 секунд
setInterval(() => {
    const dashboardMode = document.getElementById('dashboardMode');
    if (dashboardMode && dashboardMode.classList.contains('active')) {
        dashboardManager.render();
    }
}, 30000);

// Рендерити при переключенні на dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (window.appState) {
        appState.on('mode:change', ({ newMode }) => {
            if (newMode === 'dashboard') {
                setTimeout(() => dashboardManager.render(), 100);
            }
        });
    }
    
    // Початковий рендер якщо dashboard активний
    const dashboardMode = document.getElementById('dashboardMode');
    if (dashboardMode && dashboardMode.classList.contains('active')) {
        dashboardManager.render();
    }
});

// Експорт
window.dashboardManager = dashboardManager;

console.log('✅ Dashboard Manager loaded with REAL DATA');
