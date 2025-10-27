// 📊 Dashboard Manager - ПОВНА ВЕРСІЯ (FIXED)

class DashboardManager {
    constructor() {
        this.refreshInterval = null;
        this.activityFilter = 'all';
        this.init();
    }

    init() {
        console.log('✅ Dashboard Manager initialized');
    }

    // ========================================
    // RENDER
    // ========================================

    async render() {
        const container = document.getElementById('dashboardContent');
        if (!container) {
            console.warn('❌ Dashboard container not found');
            return;
        }

        try {
            // Показати loading
            container.innerHTML = `
                <div style="padding: 60px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>
                    <p style="font-size: 18px; color: var(--text-secondary);">Завантаження Dashboard...</p>
                </div>
            `;

            // Отримати дані
            const stats = await this.getStats();
            const activities = await this.getRecentActivities();

            // Очистити контейнер
            container.innerHTML = '';

            // Створити секції
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

            console.log('✅ Dashboard rendered successfully');

        } catch (error) {
            console.error('❌ Dashboard render error:', error);
            container.innerHTML = `
                <div style="padding: 60px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
                    <h2 style="color: var(--error); margin-bottom: 12px;">Помилка завантаження</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">${error.message}</p>
                    <button onclick="dashboardManager.render()" class="btn-primary">🔄 Спробувати знову</button>
                </div>
            `;
        }
    }

    // ========================================
    // QUICK ACCESS SECTION
    // ========================================

    createQuickAccessSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '🚀 Швидкий доступ';

        const grid = document.createElement('div');
        grid.className = 'quick-access-grid';

        const chatCards = [
            {
                icon: '✨',
                title: 'Gemini Chat',
                subtitle: 'AI асистент',
                requests: stats.geminiRequests || 0,
                description: 'Спілкування з передовою AI моделлю від Google',
                action: () => window.switchMode('gemini')
            },
            {
                icon: '💻',
                title: 'DeepSeek Coder',
                subtitle: 'Генерація коду',
                requests: stats.deepseekRequests || 0,
                description: 'Створення та аналіз коду з AI допомогою',
                action: () => window.switchMode('deepseek')
            },
            {
                icon: '🖼️',
                title: 'Image Generator',
                subtitle: 'Створення зображень',
                requests: stats.imagesGenerated || 0,
                description: 'AI генерація унікальних зображень',
                action: () => window.switchMode('image')
            }
        ];

        chatCards.forEach(card => {
            const cardEl = this.createChatCard(card);
            grid.appendChild(cardEl);
        });

        section.appendChild(title);
        section.appendChild(grid);
        return section;
    }

    createChatCard(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'chat-card';
        cardEl.onclick = card.action;

        cardEl.innerHTML = `
            <div class="chat-card-header">
                <div class="chat-card-icon">${card.icon}</div>
                <div class="chat-card-info">
                    <h3 class="chat-card-title">${card.title}</h3>
                    <p class="chat-card-subtitle">${card.subtitle}</p>
                </div>
            </div>
            <div class="chat-card-stats">
                <div class="chat-stat">
                    <div class="chat-stat-value">${card.requests}</div>
                    <div class="chat-stat-label">запитів</div>
                </div>
            </div>
            <p class="chat-card-description">${card.description}</p>
            <div class="chat-card-action">
                <button class="chat-card-btn">Відкрити →</button>
                <span class="chat-card-last-activity">Доступний</span>
            </div>
        `;

        return cardEl;
    }

    // ========================================
    // STATS SECTION
    // ========================================

    createStatsSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '📈 Статистика використання';

        const grid = document.createElement('div');
        grid.className = 'stats-overview';

        const statsData = [
            { 
                icon: '✨', 
                value: stats.geminiRequests || 0, 
                label: 'Gemini запитів', 
                color: '#58a6ff',
                footer: 'Всього'
            },
            { 
                icon: '💻', 
                value: stats.deepseekRequests || 0, 
                label: 'DeepSeek запитів', 
                color: '#3fb950',
                footer: 'Всього'
            },
            { 
                icon: '🖼️', 
                value: stats.imagesGenerated || 0, 
                label: 'Згенеровано зображень', 
                color: '#d29922',
                footer: 'Всього'
            },
            { 
                icon: '💾', 
                value: stats.savedProjects || 0, 
                label: 'Збережених проектів', 
                color: '#a371f7',
                footer: 'В базі даних'
            },
            { 
                icon: '🧠', 
                value: stats.memories || 0, 
                label: 'Спогадів агента', 
                color: '#f85149',
                footer: 'Записів'
            },
            { 
                icon: '📅', 
                value: stats.plans || 0, 
                label: 'Активних планів', 
                color: '#f59e0b',
                footer: 'Завдань'
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

        card.innerHTML = `
            <div class="stat-card-header">
                <div class="stat-card-icon" style="background: ${stat.color}20; color: ${stat.color};">
                    ${stat.icon}
                </div>
            </div>
            <div class="stat-card-content">
                <div class="stat-card-value" style="color: ${stat.color};">${stat.value}</div>
                <div class="stat-card-label">${stat.label}</div>
            </div>
            ${stat.footer ? `<div class="stat-card-footer">${stat.footer}</div>` : ''}
        `;

        return card;
    }

    // ========================================
    // ACTIVITY SECTION
    // ========================================

    createActivitySection(activities) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '📋 Остання активність';

        const timeline = document.createElement('div');
        timeline.className = 'activity-timeline';

        if (activities.length === 0) {
            timeline.innerHTML = `
                <div class="dashboard-empty-state">
                    <div class="dashboard-empty-state-icon">📝</div>
                    <h3>Поки що немає активності</h3>
                    <p>Почніть працювати з AI асистентами</p>
                </div>
            `;
        } else {
            const header = document.createElement('div');
            header.className = 'activity-timeline-header';
            header.innerHTML = `
                <div class="activity-timeline-title">Останні дії</div>
            `;
            timeline.appendChild(header);

            const items = document.createElement('div');
            items.className = 'timeline-items';

            activities.slice(0, 10).forEach(activity => {
                const item = this.createTimelineItem(activity);
                items.appendChild(item);
            });

            timeline.appendChild(items);
        }

        section.appendChild(title);
        section.appendChild(timeline);
        return section;
    }

    createTimelineItem(activity) {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        item.innerHTML = `
            <div class="timeline-icon">${activity.icon}</div>
            <div class="timeline-content">
                <div class="timeline-title">${activity.title}</div>
                <div class="timeline-description">${activity.description}</div>
                <div class="timeline-time">${this.formatTimeAgo(activity.timestamp)}</div>
            </div>
        `;

        return item;
    }

    // ========================================
    // QUICK ACTIONS
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
            { icon: '✨', text: 'Новий чат', action: () => window.switchMode('gemini') },
            { icon: '💻', text: 'Код', action: () => window.switchMode('deepseek') },
            { icon: '🖼️', text: 'Зображення', action: () => window.switchMode('image') },
            { icon: '📅', text: 'Планувальник', action: () => window.switchMode('planner') },
            { icon: '🧠', text: 'Пам\'ять', action: () => window.switchMode('memory') },
            { icon: '📚', text: 'Бібліотека', action: () => window.switchMode('library') }
        ];

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 8px;">${action.icon}</div>
                <div>${action.text}</div>
            `;
            btn.onclick = action.action;
            grid.appendChild(btn);
        });

        section.appendChild(title);
        section.appendChild(grid);
        return section;
    }

    // ========================================
    // SYSTEM INFO
    // ========================================

    createSystemInfoSection(stats) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '💻 Інформація про систему';

        const infoCard = document.createElement('div');
        infoCard.className = 'system-info';

        const grid = document.createElement('div');
        grid.className = 'system-info-grid';

        const infoItems = [
            { 
                icon: '🌐', 
                label: 'Браузер', 
                value: this.getBrowserInfo(),
                color: '#58a6ff'
            },
            { 
                icon: '📱', 
                label: 'Платформа', 
                value: navigator.platform || 'Unknown',
                color: '#3fb950'
            },
            { 
                icon: '🕐', 
                label: 'Перший запуск', 
                value: this.formatDate(stats.firstUse),
                color: '#d29922'
            },
            { 
                icon: '⚡', 
                label: 'Статус', 
                value: 'Активний',
                color: '#22c55e'
            }
        ];

        infoItems.forEach(info => {
            const item = document.createElement('div');
            item.className = 'info-item';
            item.innerHTML = `
                <div class="info-item-icon" style="background: ${info.color}20; color: ${info.color};">
                    ${info.icon}
                </div>
                <div class="info-item-content">
                    <div class="info-item-label">${info.label}</div>
                    <div class="info-item-value">${info.value}</div>
                </div>
            `;
            grid.appendChild(item);
        });

        infoCard.appendChild(grid);
        section.appendChild(title);
        section.appendChild(infoCard);
        return section;
    }

    // ========================================
    // DATA METHODS
    // ========================================

    async getStats() {
        const stats = {
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            memories: 0,
            plans: 0,
            activePlans: 0,
            firstUse: Date.now()
        };

        try {
            // Отримати з appState
            if (window.appState) {
                const baseStats = appState.getStats();
                Object.assign(stats, baseStats);

                // Memories
                const memories = appState.getMemories?.() || [];
                stats.memories = memories.length;

                // Plans
                const plans = appState.getPlans?.() || [];
                stats.plans = plans.length;
                stats.activePlans = plans.filter(p => 
                    p.status !== 'completed' && p.status !== 'cancelled'
                ).length;
            }

            // Saved projects з IndexedDB
            if (window.indexedDBService) {
                try {
                    const conversations = await indexedDBService.getAll('conversations');
                    const codeProjects = await indexedDBService.getAll('codeFiles');
                    stats.savedProjects = (conversations?.length || 0) + (codeProjects?.length || 0);
                } catch (error) {
                    console.warn('Failed to get saved projects:', error);
                }
            }

        } catch (error) {
            console.error('Failed to collect stats:', error);
        }

        return stats;
    }

    async getRecentActivities() {
        const activities = [];

        try {
            // Gemini messages
            if (window.appState) {
                const geminiMessages = appState.getGeminiMessages?.() || [];
                if (geminiMessages.length > 0) {
                    const lastMsg = geminiMessages[geminiMessages.length - 1];
                    activities.push({
                        icon: '✨',
                        title: 'Gemini Chat',
                        description: 'Новий запит до AI асистента',
                        timestamp: lastMsg.timestamp || Date.now()
                    });
                }

                // DeepSeek messages
                const deepseekMessages = appState.getDeepSeekMessages?.() || [];
                if (deepseekMessages.length > 0) {
                    const lastMsg = deepseekMessages[deepseekMessages.length - 1];
                    activities.push({
                        icon: '💻',
                        title: 'DeepSeek Coder',
                        description: 'Генерація коду',
                        timestamp: lastMsg.timestamp || Date.now()
                    });
                }

                // Images
                const images = appState.getImages?.() || [];
                if (images.length > 0) {
                    activities.push({
                        icon: '🖼️',
                        title: 'Image Generator',
                        description: 'Згенеровано нове зображення',
                        timestamp: images[0].timestamp || Date.now()
                    });
                }
            }

            // Сортувати за часом
            activities.sort((a, b) => b.timestamp - a.timestamp);

        } catch (error) {
            console.error('Failed to get activities:', error);
        }

        return activities;
    }

    // ========================================
    // HELPERS
    // ========================================

    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        if (ua.indexOf('Chrome') > -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        if (ua.indexOf('Edge') > -1) return 'Edge';
        return 'Unknown';
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Невідомо';
        const date = new Date(timestamp);
        return date.toLocaleDateString('uk-UA');
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'невідомо';
        
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days === 1) return 'вчора';
        return `${days} днів тому`;
    }

    // ========================================
    // REFRESH
    // ========================================

    startAutoRefresh(interval = 30000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.render();
        }, interval);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const dashboardManager = new DashboardManager();

// Експорт
window.dashboardManager = dashboardManager;
window.DashboardManager = DashboardManager;

console.log('✅ Dashboard Manager loaded (Complete Fixed)');
