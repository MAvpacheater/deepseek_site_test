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

        const stats = this.getStats();
        const activities = this.getRecentActivities();

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
            messagesCount: this.getMessagesCount('gemini'),
            lastActivity: this.getLastActivity('gemini'),
            color: '#58a6ff'
        });

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
            { icon: '✨', value: stats.geminiRequests, label: 'Gemini запитів', color: '#58a6ff', trend: this.calculateTrend('gemini') },
            { icon: '💻', value: stats.deepseekRequests, label: 'DeepSeek запитів', color: '#3fb950', trend: this.calculateTrend('deepseek') },
            { icon: '🖼️', value: stats.imagesGenerated, label: 'Згенеровано зображень', color: '#d29922', trend: this.calculateTrend('images') },
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
            <div class="stat-card-footer">
                <span>📊</span><span>Загальна статистика</span>
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
                    <p>Почніть роботу, і тут з’являться події вашої історії.</p>
                </div>
            `;
        } else {
            activities.forEach(act => {
                const item = document.createElement('div');
                item.className = `timeline-item ${act.type}`;
                item.innerHTML = `
                    <div class="timeline-icon">${act.icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">${act.title}</div>
                        <div class="timeline-desc">${act.description}</div>
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
        const active = Array.from(buttons).find(b => b.textContent.toLowerCase().includes(type));
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
            { icon: '💬', label: 'Новий чат', action: () => alert('Створення нового чату...') },
            { icon: '🧠', label: 'AI-аналіз', action: () => alert('Запуск AI аналізу...') },
            { icon: '📂', label: 'Мої проекти', action: () => alert('Відкриваю проекти...') },
            { icon: '⚙️', label: 'Налаштування', action: () => alert('Перехід у налаштування...') }
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
        info.innerHTML = `
            <p>🧭 Перше використання: ${new Date(stats.firstUse).toLocaleDateString()}</p>
            <p>📅 Активність триває вже ${uptimeDays} днів</p>
            <p>🧩 Поточна версія системи: <strong>v2.3.1</strong></p>
            <p>🕓 Останнє оновлення: ${new Date().toLocaleString()}</p>
        `;

        section.appendChild(title);
        section.appendChild(info);
        return section;
    }

    // ========================================
    // ДОПОМІЖНІ МЕТОДИ
    // ========================================

    getStats() {
        return {
            geminiRequests: 124,
            deepseekRequests: 78,
            imagesGenerated: 42,
            savedProjects: 12,
            totalTokens: 487213,
            firstUse: '2024-11-12T10:00:00Z'
        };
    }

    getRecentActivities() {
        return [
            { type: 'chat', icon: '💬', title: 'Новий чат з Gemini', description: 'Користувач створив нову сесію', time: '2 хв тому' },
            { type: 'code', icon: '💻', title: 'DeepSeek створив код', description: 'Сгенеровано функцію калькулятора', time: '10 хв тому' },
            { type: 'system', icon: '⚙️', title: 'Оновлено статистику', description: 'Панель оновила дані', time: '30 хв тому' }
        ];
    }

    getMessagesCount(model) {
        return Math.floor(Math.random() * 300) + 20;
    }

    getLastActivity(model) {
        const minutesAgo = Math.floor(Math.random() * 120);
        return `${minutesAgo} хв тому`;
    }

    calculateTrend(type) {
        const val = Math.floor(Math.random() * 20 - 10);
        return val;
    }

    calculateDaysUsed(firstUse) {
        const start = new Date(firstUse);
        const now = new Date();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    formatNumber(num) {
        return num.toLocaleString('uk-UA');
    }
}

// Ініціалізація
const dashboardManager = new DashboardManager();
document.addEventListener('DOMContentLoaded', () => dashboardManager.render());
