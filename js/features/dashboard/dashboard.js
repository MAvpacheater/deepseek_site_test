// 📊 Dashboard Manager - РОЗШИРЕНА ВЕРСІЯ з інтеграцією stats.js
// Це опціональне розширення існуючого dashboard.js

class DashboardManager {
    constructor() {
        this.refreshInterval = null;
        this.activityFilter = 'all';
        this.init();
    }

    init() {
        console.log('✅ Dashboard Manager initialized (Enhanced)');
    }

    async render() {
        const container = document.getElementById('dashboardContent');
        if (!container) return;

        container.innerHTML = '';

        const stats = await this.getStats();
        const activities = await this.getRecentActivities();

        const quickAccessSection = this.createQuickAccessSection(stats);
        container.appendChild(quickAccessSection);

        const statsSection = this.createStatsSection(stats);
        container.appendChild(statsSection);

        // ✨ НОВИЙ: Секція аналітики (якщо є stats.js)
        if (window.dashboardStats) {
            const analyticsSection = await this.createAnalyticsSection();
            container.appendChild(analyticsSection);
        }

        const activitySection = this.createActivitySection(activities);
        container.appendChild(activitySection);

        const quickActionsSection = this.createQuickActionsSection();
        container.appendChild(quickActionsSection);

        const systemInfoSection = this.createSystemInfoSection(stats);
        container.appendChild(systemInfoSection);
    }

    // ✨ НОВИЙ: Секція розширеної аналітики
    async createAnalyticsSection() {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = '📈 Аналітика та тренди';

        const grid = document.createElement('div');
        grid.className = 'analytics-grid';

        try {
            // Productivity Score
            const productivity = await dashboardStats.calculateProductivityScore();
            const productivityCard = this.createProductivityCard(productivity);
            grid.appendChild(productivityCard);

            // Trends
            const trends = await dashboardStats.calculateTrends();
            const trendsCard = this.createTrendsCard(trends);
            grid.appendChild(trendsCard);

            // Top Features
            const topFeatures = await dashboardStats.getTopFeatures();
            const featuresCard = this.createTopFeaturesCard(topFeatures);
            grid.appendChild(featuresCard);

            // Hourly Activity
            const hourlyActivity = await dashboardStats.getHourlyActivity();
            const hourlyCard = this.createHourlyActivityCard(hourlyActivity);
            grid.appendChild(hourlyCard);

        } catch (error) {
            console.error('Failed to load analytics:', error);
            grid.innerHTML = '<p style="color: #f85149;">⚠️ Помилка завантаження аналітики</p>';
        }

        section.appendChild(title);
        section.appendChild(grid);
        return section;
    }

    createProductivityCard(productivity) {
        const card = document.createElement('div');
        card.className = 'analytics-card productivity-card';
        
        const color = productivity.percentage >= 80 ? '#22c55e' :
                     productivity.percentage >= 60 ? '#3fb950' :
                     productivity.percentage >= 40 ? '#f59e0b' : '#f85149';

        card.innerHTML = `
            <div class="analytics-card-header">
                <h3>🏆 Productivity Score</h3>
            </div>
            <div class="analytics-card-content">
                <div class="productivity-circle" style="--progress: ${productivity.percentage}%; --color: ${color};">
                    <div class="productivity-value">${productivity.percentage}%</div>
                </div>
                <div class="productivity-level" style="color: ${color};">${productivity.level}</div>
                <div class="productivity-info">
                    ${productivity.score} / ${productivity.maxScore} балів
                </div>
            </div>
        `;

        return card;
    }

    createTrendsCard(trends) {
        const card = document.createElement('div');
        card.className = 'analytics-card trends-card';

        const renderTrend = (name, value, icon, color) => {
            const trendIcon = value > 0 ? '📈' : value < 0 ? '📉' : '➡️';
            const trendColor = value > 0 ? '#22c55e' : value < 0 ? '#f85149' : '#8b949e';
            
            return `
                <div class="trend-item">
                    <div class="trend-icon" style="background: ${color}20;">${icon}</div>
                    <div class="trend-info">
                        <div class="trend-name">${name}</div>
                        <div class="trend-value" style="color: ${trendColor};">
                            ${trendIcon} ${value > 0 ? '+' : ''}${value}%
                        </div>
                    </div>
                </div>
            `;
        };

        card.innerHTML = `
            <div class="analytics-card-header">
                <h3>📊 Тренди</h3>
                <span class="analytics-card-subtitle">Порівняно з попереднім</span>
            </div>
            <div class="analytics-card-content">
                ${renderTrend('Gemini', trends.gemini || 0, '✨', '#58a6ff')}
                ${renderTrend('DeepSeek', trends.deepseek || 0, '💻', '#3fb950')}
                ${renderTrend('Images', trends.images || 0, '🖼️', '#d29922')}
            </div>
        `;

        return card;
    }

    createTopFeaturesCard(features) {
        const card = document.createElement('div');
        card.className = 'analytics-card features-card';

        const featuresList = features.slice(0, 5).map((feature, index) => {
            const width = features[0].count > 0 ? 
                (feature.count / features[0].count) * 100 : 0;
            
            return `
                <div class="feature-item">
                    <div class="feature-info">
                        <span class="feature-icon">${feature.icon}</span>
                        <span class="feature-name">${feature.name}</span>
                    </div>
                    <div class="feature-bar">
                        <div class="feature-bar-fill" style="width: ${width}%; background: ${feature.color};"></div>
                    </div>
                    <div class="feature-count" style="color: ${feature.color};">${feature.count}</div>
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div class="analytics-card-header">
                <h3>⭐ Top функції</h3>
            </div>
            <div class="analytics-card-content">
                ${featuresList}
            </div>
        `;

        return card;
    }

    createHourlyActivityCard(hourlyData) {
        const card = document.createElement('div');
        card.className = 'analytics-card hourly-card';

        const maxActivity = Math.max(...hourlyData.data);
        const bars = hourlyData.data.map((count, hour) => {
            const height = maxActivity > 0 ? (count / maxActivity) * 100 : 0;
            const isPeak = hour === hourlyData.peakHour;
            
            return `
                <div class="hourly-bar ${isPeak ? 'peak' : ''}" 
                     style="height: ${height}%;" 
                     title="${hour}:00 - ${count} дій">
                    ${isPeak ? '<span class="peak-label">📍</span>' : ''}
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div class="analytics-card-header">
                <h3>⏰ Активність по годинах</h3>
                <span class="analytics-card-subtitle">Пік: ${hourlyData.peakHour}:00</span>
            </div>
            <div class="analytics-card-content">
                <div class="hourly-chart">
                    ${bars}
                </div>
                <div class="hourly-labels">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                </div>
            </div>
        `;

        return card;
    }

    // ========================================
    // ІСНУЮЧІ МЕТОДИ (залишаються як є)
    // ========================================

    createQuickAccessSection(stats) {
        // ... твій існуючий код ...
    }

    createStatsSection(stats) {
        // ... твій існуючий код з додатковими трендами ...
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
                trend: stats.trends?.gemini || null  // ✨ НОВИЙ
            },
            { 
                icon: '💻', 
                value: stats.deepseekRequests, 
                label: 'DeepSeek запитів', 
                color: '#3fb950', 
                trend: stats.trends?.deepseek || null  // ✨ НОВИЙ
            },
            { 
                icon: '🖼️', 
                value: stats.imagesGenerated, 
                label: 'Згенеровано зображень', 
                color: '#d29922', 
                trend: stats.trends?.images || null  // ✨ НОВИЙ
            },
            // ... решта статистики ...
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

        // ✨ НОВИЙ: Тренд indicator
        const trendHTML = stat.trend !== null && stat.trend !== undefined ? `
            <div class="stat-card-trend ${stat.trend > 0 ? 'up' : stat.trend < 0 ? 'down' : ''}">
                ${stat.trend > 0 ? '↑' : stat.trend < 0 ? '↓' : '→'} ${Math.abs(stat.trend)}%
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

    async getStats() {
        // ... твій існуючий код ...
        const stats = { /* ... */ };

        // ✨ НОВИЙ: Додати тренди якщо є stats.js
        if (window.dashboardStats) {
            try {
                stats.trends = await dashboardStats.calculateTrends();
            } catch (e) {
                console.warn('Failed to get trends:', e);
            }
        }

        return stats;
    }

    // ... решта існуючих методів залишаються як є ...
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const dashboardManager = new DashboardManager();

// ... решта коду як є ...

console.log('✅ Dashboard Manager loaded (Enhanced with Analytics)');
