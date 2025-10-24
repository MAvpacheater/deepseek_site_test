// 📊 Dashboard Manager - Головна панель

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

        // Отримати дані
        const stats = this.getStats();
        const activities = this.getRecentActivities();

        // Швидкий доступ до чатів
        const quickAccessSection = this.createQuickAccessSection(stats);
        container.appendChild(quickAccessSection);

        // Статистика
        const statsSection = this.createStatsSection(stats);
        container.appendChild(statsSection);

        // Активність
        const activitySection = this.createActivitySection(activities);
        container.appendChild(activitySection);

        // Швидкі дії
        const quickActionsSection = this.createQuickActionsSection();
        container.appendChild(quickActionsSection);

        // Системна інформація
        const systemInfoSection = this.createSystemInfoSection(stats);
        container.appendChild(systemInfoSection);
    }

    // ========================================
    // QUICK ACCESS - 3 CHAT CARDS
    // ========================================

    createQuickAccessSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '🚀 Швидкий доступ';

        const grid = document.createElement('div');
        grid.className = 'quick-access-grid';

        // Gemini Chat Card
        const geminiCard = this.createChatCard({
            id: 'gemini',
            icon: '✨',
            title: 'Gemini Chat',
            subtitle: 'Розумовий асистент',
            description: 'Gemini 2.0 Flash для загальних питань, планування та аналізу',
            requestsCount: stats.geminiRequests,
            messagesCount: this.getMessagesCount('gemini'),
            lastActivity: this.getLastActivity('gemini'),
            color: '#58a6ff'
        });

        // DeepSeek Coder Card
        const coderCard = this.createChatCard({
            id: 'deepseek',
            icon: '💻',
            title: 'DeepSeek Coder',
            subtitle: 'Генерація коду',
            description: 'Llama 3.3 70B для створення, аналізу та рефакторингу коду',
            requestsCount: stats.deepseekRequests,
            messagesCount: this.getMessagesCount('deepseek'),
            lastActivity: this.getLastActivity('deepseek'),
            color: '#3fb950'
        });

        // Image Generator Card
        const imageCard = this.createChatCard({
            id: 'image',
            icon: '🖼️',
            title: 'Image Generator',
            subtitle: 'Генерація зображень',
            description: 'Pollinations.ai для створення унікальних зображень за описом',
            requestsCount: stats.imagesGenerated,
            messagesCount: stats.imagesGenerated,
            lastActivity: this.getLastActivity('image'),
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

            <div class="chat-card-description">
                ${config.description}
            </div>

            <div class="chat-card-action">
                <button class="chat-card-btn" style="--card-accent: ${config.color}">
                    <span>Відкрити</span>
                    <span>→</span>
                </button>
                <div class="chat-card-last-activity">
                    ${config.lastActivity}
                </div>
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
            {
                icon: '✨',
                value: stats.geminiRequests,
                label: 'Gemini запитів',
                color: '#58a6ff',
                trend: this.calculateTrend('gemini')
            },
            {
                icon: '💻',
                value: stats.deepseekRequests,
                label: 'DeepSeek запитів',
                color: '#3fb950',
                trend: this.calculateTrend('deepseek')
            },
            {
                icon: '🖼️',
                value: stats.imagesGenerated,
                label: 'Згенеровано зображень',
                color: '#d29922',
                trend: this.calculateTrend('images')
            },
            {
                icon: '📚',
                value: stats.savedProjects,
                label: 'Збережених проектів',
                color: '#a371f7',
                trend: null
            },
            {
                icon: '🔢',
                value: this.formatNumber(stats.totalTokens),
                label: 'Використано токенів',
                color: '#f85149',
                trend: null
            },
            {
                icon: '📅',
                value: this.calculateDaysUsed(stats.firstUse),
                label: 'Днів використання',
                color: '#8b949e',
                trend: null
            }
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
            </div>
        ` : '';

        card.innerHTML = `
            <div class="stat-card-header">
                <div class="stat-card-icon" style="background: ${stat.color}15">
                    ${stat.icon}
                </div>
                ${trendHTML}
            </div>
            <div class="stat-card-content">
                <div class="stat-card-value" style="color: ${stat.color}">
                    ${stat.value}
                </div>
                <div class="stat-card-label">${stat.label}</div>
            </div>
            <div class="stat-card-footer">
                <span>📊</span>
                <span>Загальна статистика</span>
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
                    <p>Почні
