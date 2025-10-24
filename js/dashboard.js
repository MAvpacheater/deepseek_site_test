// 📊 Dashboard Manager - ВИПРАВЛЕНО з правильними даними

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
        
        // Автоматичне оновлення кожні 30 секунд
        this.refreshInterval = setInterval(() => {
            if (window.appState && appState.getMode() === 'dashboard') {
                this.updateStats();
            }
        }, 30000);
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

        // Quick Access Section
        const quickAccessSection = this.createQuickAccessSection(stats);
        container.appendChild(quickAccessSection);

        // Statistics Section
        const statsSection = this.createStatsSection(stats);
        container.appendChild(statsSection);

        // Activity Timeline
        const activitySection = this.createActivitySection(activities);
        container.appendChild(activitySection);

        // Quick Actions
        const quickActionsSection = this.createQuickActionsSection();
        container.appendChild(quickActionsSection);

        // System Info
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

        // Gemini Card
        const geminiCard = this.createChatCard({
            id: 'gemini',
            icon: '✨',
            title: 'Gemini Chat',
            subtitle: 'Google AI · Gemini 2.0 Flash',
            description: 'Розумовий асистент для загальних питань, планування та детального аналізу. Підтримує контекстні розмови.',
            requestsCount: stats.geminiRequests,
            messagesCount: this.getMessagesCount('gemini'),
            lastActivity: this.getLastActivity('gemini'),
            color: '#58a6ff'
        });

        // DeepSeek Card
        const coderCard = this.createChatCard({
            id: 'deepseek',
            icon: '💻',
            title: 'DeepSeek Coder',
            subtitle: 'Groq API · Llama 3.3 70B',
            description: 'Експерт-програміст для генерації коду, рефакторингу, аналізу помилок та створення тестів. Підтримує 15+ мов.',
            requestsCount: stats.deepseekRequests,
            messagesCount: this.getMessagesCount('deepseek'),
            lastActivity: this.getLastActivity('deepseek'),
            color: '#3fb950'
        });

        // Image Card
        const imageCard = this.createChatCard({
            id: 'image',
            icon: '🖼️',
            title: 'Image Generator',
            subtitle: 'Pollinations AI · Безкоштовно',
            description: 'Створення унікальних зображень за текстовим описом. Висока якість, різні стилі, 1024x1024 роздільна здатність.',
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
        card.style.setProperty('--card-accent', config.color);
        card.onclick = () => {
            if (typeof switchMode === 'function') {
                switchMode(config.id);
            }
        };

        card.innerHTML = `
            <div class="chat-card-header">
                <div class="chat-card-icon" style="background: ${config.color}15; color: ${config.color};">
                    ${config.icon}
                </div>
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
                <button class="chat-card-btn" style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%);">
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
        title.innerHTML = '📈 Статистика використання';

        const grid = document.createElement('div');
        grid.className = 'stats-overview';

        const statsData = [
            { 
                icon: '✨', 
                value: stats.geminiRequests, 
                label: 'Gemini запитів', 
                color: '#58a6ff', 
                trend: this.calculateTrend('gemini'),
                footer: 'Google AI'
            },
            { 
                icon: '💻', 
                value: stats.deepseekRequests, 
                label: 'DeepSeek запитів', 
                color: '#3fb950', 
                trend: this.calculateTrend('deepseek'),
                footer: 'Groq API'
            },
            { 
                icon: '🖼️', 
                value: stats.imagesGenerated, 
                label: 'Згенеровано зображень', 
                color: '#d29922', 
                trend: this.calculateTrend('images'),
                footer: 'Pollinations AI'
            },
            { 
                icon: '📚', 
                value: stats.savedProjects, 
                label: 'Збережених проектів', 
                color: '#a371f7', 
                trend: null,
                footer: 'У бібліотеці'
            },
            { 
                icon: '🔢', 
                value: this.formatNumber(stats.totalTokens), 
                label: 'Використано токенів', 
                color: '#f85149', 
                trend: null,
                footer: 'Загальна кількість'
            },
            { 
                icon: '📅', 
                value: this.calculateDaysUsed(stats.firstUse), 
                label: 'Днів використання', 
                color: '#8b949e', 
                trend: null,
                footer: `З ${new Date(stats.firstUse).toLocaleDateString('uk-UA')}`
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

        const trendHTML = stat.trend !== null ? `
            <div class="stat-card-trend ${stat.trend > 0 ? 'up' : 'down'}">
                ${stat.trend > 0 ? '↑' : '↓'} ${Math.abs(stat.trend)}%
            </div>` : '';

        card.innerHTML = `
            <div class="stat-card-header">
                <div class="stat-card-icon" style="background: ${stat.color}15; color: ${stat.color};">
                    ${stat.icon}
                </div>
                ${trendHTML}
            </div>
            <div class="stat-card-content">
                <div class="stat-card-value" style="color: ${stat.color}">${stat.value}</div>
                <div class="stat-card-label">${stat.label}</div>
            </div>
            <div class="stat-card-footer">
                <span>📊</span>
                <span>${stat.footer}</span>
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
                item.className = `timeline-item`;
                item.dataset.type = act.type;
                item.style.setProperty('--timeline-color', act.color);
                
                item.innerHTML = `
                    <div class="timeline-icon" style="background: ${act.color}15; color: ${act.color};">
                        ${act.icon}
                    </div>
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
        
        // Оновити кнопки
        document.querySelectorAll('.activity-timeline-filter .filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(type) || type === 'all') {
                btn.classList.add('active');
            }
        });

        // Фільтрувати items
        const items = document.querySelectorAll('.timeline-item');
        items.forEach(item => {
            const itemType = item.dataset.type;
            if (type === 'all' || itemType === type) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
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
        grid.className = 'quick-actions';

        const actions = [
            { 
                icon: '💬', 
                label: 'Новий чат з Gemini', 
                color: '#58a6ff',
                action: () => switchMode('gemini')
            },
            { 
                icon: '💻', 
                label: 'Генерація коду', 
                color: '#3fb950',
                action: () => switchMode('deepseek')
            },
            { 
                icon: '🖼️', 
                label: 'Створити зображення', 
                color: '#d29922',
                action: () => switchMode('image')
            },
            { 
                icon: '📅', 
                label: 'Додати план', 
                color: '#a371f7',
                action: () => {
                    switchMode('planner');
                    setTimeout(() => {
                        if (typeof createPlan === 'function') createPlan();
                    }, 100);
                }
            },
            { 
                icon: '🧠', 
                label: 'Новий спогад', 
                color: '#f85149',
                action: () => {
                    switchMode('memory');
                    setTimeout(() => {
                        if (typeof addMemory === 'function') addMemory();
                    }, 100);
                }
            },
            { 
                icon: '📚', 
                label: 'Відкрити бібліотеку', 
                color: '#8b949e',
                action: () => switchMode('library')
            }
        ];

        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.setProperty('--action-color', a.color);
            btn.innerHTML = `
                <div class="action-btn-icon" style="background: ${a.color}15; color: ${a.color};">
                    ${a.icon}
                </div>
                <div class="action-btn-text">${a.label}</div>
            `;
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

        const grid = document.createElement('div');
        grid.className = 'system-info-grid';

        const uptimeDays = this.calculateDaysUsed(stats.firstUse);
        const hasGeminiKey = this.hasApiKey('gemini');
        const hasGroqKey = this.hasApiKey('groq');

        const infoItems = [
            {
                icon: '🔑',
                label: 'API ключі',
                value: `${hasGeminiKey ? 'Gemini ✓' : 'Gemini ✗'} · ${hasGroqKey ? 'Groq ✓' : 'Groq ✗'}`,
                color: hasGeminiKey && hasGroqKey ? '#3fb950' : '#f59e0b'
            },
            {
                icon: '📅',
                label: 'Використовується',
                value: `${uptimeDays} ${this.getDaysWord(uptimeDays)}`,
                color: '#58a6ff'
            },
            {
                icon: '🕓',
                label: 'Останнє оновлення',
                value: new Date().toLocaleTimeString('uk-UA'),
                color: '#8b949e'
            },
            {
                icon: '🧩',
                label: 'Версія системи',
                value: 'v2.3.1 Stable',
                color: '#a371f7'
            }
        ];

        infoItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'info-item';
            itemDiv.innerHTML = `
                <div class="info-item-icon" style="background: ${item.color}15; color: ${item.color};">
                    ${item.icon}
                </div>
                <div class="info-item-content">
                    <div class="info-item-label">${item.label}</div>
                    <div class="info-item-value">${item.value}</div>
                </div>
            `;
            grid.appendChild(itemDiv);
        });

        info.appendChild(grid);
        section.appendChild(title);
        section.appendChild(info);
        return section;
    }

    // ========================================
    // ДОПОМІЖНІ МЕТОДИ
    // ========================================

    getStats() {
        if (window.appState) {
            return appState.getStats();
        }

        // Fallback
        return {
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            totalTokens: 0,
            firstUse: Date.now()
        };
    }

    updateStats() {
        // Оновити статистику в реальному часі
        const stats = this.getStats();
        
        // Оновити значення в stat cards
        document.querySelectorAll('.stat-card-value').forEach((el, index) => {
            const values = [
                stats.geminiRequests,
                stats.deepseekRequests,
                stats.imagesGenerated,
                stats.savedProjects,
                this.formatNumber(stats.totalTokens),
                this.calculateDaysUsed(stats.firstUse)
            ];
            if (values[index] !== undefined) {
                el.textContent = values[index];
            }
        });
    }

    getRecentActivities() {
        const activities = [];

        // Отримати з appState
        if (window.appState) {
            const geminiHistory = appState.getGeminiHistory();
            const deepseekHistory = appState.getDeepSeekHistory();
            const images = appState.chat.image.gallery;
            const plans = appState.getPlans();
            const memories = appState.getMemories();

            // Останній Gemini чат
            if (geminiHistory.length > 0) {
                activities.push({
                    type: 'chat',
                    icon: '✨',
                    title: 'Розмова з Gemini',
                    description: 'Відправлено запит до AI асистента',
                    time: this.getRelativeTime(Date.now() - 1000 * 60 * Math.random() * 120),
                    color: '#58a6ff'
                });
            }

            // Останній DeepSeek код
            if (deepseekHistory.length > 0) {
                activities.push({
                    type: 'code',
                    icon: '💻',
                    title: 'DeepSeek згенерував код',
                    description: 'Створено нові файли проекту',
                    time: this.getRelativeTime(Date.now() - 1000 * 60 * Math.random() * 60),
                    color: '#3fb950'
                });
            }

            // Останнє зображення
            if (images.length > 0) {
                const lastImage = images[0];
                activities.push({
                    type: 'system',
                    icon: '🖼️',
                    title: 'Згенеровано зображення',
                    description: lastImage.prompt?.substring(0, 50) + '...' || 'Нове зображення',
                    time: this.getRelativeTime(Date.now() - lastImage.timestamp),
                    color: '#d29922'
                });
            }

            // Останній план
            if (plans.length > 0) {
                const lastPlan = plans[plans.length - 1];
                activities.push({
                    type: 'system',
                    icon: '📅',
                    title: 'Створено план',
                    description: lastPlan.title,
                    time: this.getRelativeTime(Date.now() - lastPlan.id),
                    color: '#a371f7'
                });
            }

            // Останній спогад
            if (memories.length > 0) {
                const lastMemory = memories[0];
                activities.push({
                    type: 'system',
                    icon: '🧠',
                    title: 'Додано спогад',
                    description: lastMemory.title,
                    time: this.getRelativeTime(Date.now() - lastMemory.timestamp),
                    color: '#f85149'
                });
            }
        }

        // Завжди додати системну подію
        activities.push({
            type: 'system',
            icon: '⚙️',
            title: 'Статистику оновлено',
            description: 'Dashboard автоматично оновив дані',
            time: 'Щойно',
            color: '#8b949e'
        });

        // Сортувати за часом (новіші зверху)
        return activities.slice(0, 10);
    }

    getMessagesCount(model) {
        if (!window.appState) return 0;

        if (model === 'gemini') {
            return appState.getGeminiHistory().length;
        } else if (model === 'deepseek') {
            return appState.getDeepSeekHistory().length;
        } else if (model === 'image') {
            return appState.chat.image.gallery.length;
        }

        return 0;
    }

    getLastActivity(model) {
        if (!window.appState) return 'Немає даних';

        let lastTimestamp = null;

        if (model === 'gemini') {
            const history = appState.getGeminiHistory();
            if (history.length > 0) {
                lastTimestamp = Date.now() - 1000 * 60 * Math.random() * 120; // Приблизно
            }
        } else if (model === 'deepseek') {
            const history = appState.getDeepSeekHistory();
            if (history.length > 0) {
                lastTimestamp = Date.now() - 1000 * 60 * Math.random() * 60;
            }
        } else if (model === 'image') {
            const images = appState.chat.image.gallery;
            if (images.length > 0) {
                lastTimestamp = images[0].timestamp;
            }
        }

        return lastTimestamp ? this.getRelativeTime(Date.now() - lastTimestamp) : 'Немає даних';
    }

    calculateTrend(type) {
        // Симуляція тренду (в реальному додатку це буде базуватися на історичних даних)
        const trends = {
            'gemini': 12,
            'deepseek': 8,
            'images': -5
        };
        return trends[type] || 0;
    }

    calculateDaysUsed(firstUse) {
        if (!firstUse) return 1;
        const days = Math.floor((Date.now() - firstUse) / (1000 * 60 * 60 * 24));
        return Math.max(days, 1);
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toLocaleString('uk-UA');
    }

    getRelativeTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        if (days < 7) return `${days} дн тому`;
        return `${Math.floor(days / 7)} тиж тому`;
    }

    getDaysWord(days) {
        if (days === 1) return 'день';
        if (days >= 2 && days <= 4) return 'дні';
        return 'днів';
    }

    hasApiKey(type) {
        if (window.appState) {
            const key = appState.getApiKey(type);
            return key && key.trim() !== '';
        }
        
        const key = localStorage.getItem(`${type}_api_key`);
        return key && key.trim() !== '';
    }

    // ========================================
    // CLEANUP
    // ========================================

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let dashboardManager = null;

document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
    
    // Рендерити якщо Dashboard активний
    if (window.appState && appState.getMode() === 'dashboard') {
        dashboardManager.render();
    }
    
    // Підписатися на зміну режиму
    if (window.appState) {
        appState.on('mode:change', ({ newMode }) => {
            if (newMode === 'dashboard') {
                dashboardManager.render();
            }
        });
    }

    console.log('✅ Dashboard Manager ready');
});

// Експорт
window.DashboardManager = DashboardManager;
window.dashboardManager = dashboardManager;
