// 📊 Dashboard Stats - Статистика та аналітика (300 lines)

class DashboardStats {
    constructor() {
        this.updateInterval = null;
        this.charts = {};
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        console.log('✅ Dashboard Stats initialized');
    }

    // ========================================
    // ЗБІР СТАТИСТИКИ
    // ========================================

    async collectStats() {
        const stats = {
            // Основна статистика
            geminiRequests: 0,
            deepseekRequests: 0,
            imagesGenerated: 0,
            savedProjects: 0,
            totalTokens: 0,
            firstUse: null,

            // Розширена статистика
            geminiMessages: 0,
            deepseekMessages: 0,
            codeFiles: 0,
            memories: 0,
            plans: 0,
            activePlans: 0,
            completedPlans: 0,

            // Часові дані
            geminiLastActivity: null,
            deepseekLastActivity: null,
            imageLastActivity: null,

            // Сьогодні
            todayGemini: 0,
            todayDeepseek: 0,
            todayImages: 0,

            // Цього тижня
            weekGemini: 0,
            weekDeepseek: 0,
            weekImages: 0,

            // Цього місяця
            monthGemini: 0,
            monthDeepseek: 0,
            monthImages: 0
        };

        try {
            // Базова статистика з appState
            if (window.appState) {
                const baseStats = appState.getStats();
                Object.assign(stats, baseStats);

                // Повідомлення
                const geminiMessages = appState.getGeminiMessages?.() || [];
                const deepseekMessages = appState.getDeepSeekMessages?.() || [];
                
                stats.geminiMessages = geminiMessages.length;
                stats.deepseekMessages = deepseekMessages.length;

                // Остання активність
                stats.geminiLastActivity = this.getLastActivityTime(geminiMessages);
                stats.deepseekLastActivity = this.getLastActivityTime(deepseekMessages);

                // Файли коду
                const codeFiles = appState.getAllCodeFiles?.() || {};
                stats.codeFiles = Object.keys(codeFiles).length;

                // Зображення
                const imageGallery = appState.chat?.image?.gallery || [];
                stats.imageLastActivity = imageGallery.length > 0 ? 
                    imageGallery[0].timestamp : null;

                // Спогади
                const memories = appState.getMemories?.() || [];
                stats.memories = memories.length;

                // Плани
                const plans = appState.getPlans?.() || [];
                stats.plans = plans.length;
                stats.activePlans = plans.filter(p => 
                    p.status !== 'completed' && p.status !== 'cancelled'
                ).length;
                stats.completedPlans = plans.filter(p => 
                    p.status === 'completed'
                ).length;

                // Часові статистики
                const now = Date.now();
                const todayStart = new Date().setHours(0, 0, 0, 0);
                const weekStart = now - (7 * 24 * 60 * 60 * 1000);
                const monthStart = now - (30 * 24 * 60 * 60 * 1000);

                // Gemini за періоди
                stats.todayGemini = this.countInPeriod(geminiMessages, todayStart);
                stats.weekGemini = this.countInPeriod(geminiMessages, weekStart);
                stats.monthGemini = this.countInPeriod(geminiMessages, monthStart);

                // DeepSeek за періоди
                stats.todayDeepseek = this.countInPeriod(deepseekMessages, todayStart);
                stats.weekDeepseek = this.countInPeriod(deepseekMessages, weekStart);
                stats.monthDeepseek = this.countInPeriod(deepseekMessages, monthStart);

                // Images за періоди
                stats.todayImages = this.countInPeriod(imageGallery, todayStart);
                stats.weekImages = this.countInPeriod(imageGallery, weekStart);
                stats.monthImages = this.countInPeriod(imageGallery, monthStart);
            }

            // Збережені проекти з IndexedDB
            if (window.storageManager) {
                const conversations = await storageManager.getConversations();
                const codeProjects = await storageManager.getCodeProjects();
                stats.savedProjects = conversations.length + codeProjects.length;
            }

        } catch (error) {
            console.error('Failed to collect stats:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'stats_error',
                    message: 'Failed to collect dashboard stats',
                    error: error.message,
                    severity: 'low'
                });
            }
        }

        return stats;
    }

    // ========================================
    // ДОПОМІЖНІ ФУНКЦІЇ
    // ========================================

    getLastActivityTime(messages) {
        if (!messages || messages.length === 0) return null;
        
        const lastMessage = messages[messages.length - 1];
        return lastMessage.timestamp || lastMessage.created || null;
    }

    countInPeriod(items, startTime) {
        if (!items || items.length === 0) return 0;

        return items.filter(item => {
            const time = item.timestamp || item.created || item.date;
            if (!time) return false;
            
            const itemTime = typeof time === 'string' ? 
                new Date(time).getTime() : time;
            
            return itemTime >= startTime;
        }).length;
    }

    // ========================================
    // ТРЕНДИ ТА АНАЛІТИКА
    // ========================================

    async calculateTrends() {
        const stats = await this.collectStats();
        const trends = {};

        // Тренд Gemini (порівняння з попереднім значенням)
        const prevGemini = parseInt(localStorage.getItem('prev_gemini') || '0');
        if (prevGemini > 0) {
            trends.gemini = this.calculateTrendPercent(stats.geminiRequests, prevGemini);
        } else {
            trends.gemini = 0;
        }
        localStorage.setItem('prev_gemini', stats.geminiRequests.toString());

        // Тренд DeepSeek
        const prevDeepseek = parseInt(localStorage.getItem('prev_deepseek') || '0');
        if (prevDeepseek > 0) {
            trends.deepseek = this.calculateTrendPercent(stats.deepseekRequests, prevDeepseek);
        } else {
            trends.deepseek = 0;
        }
        localStorage.setItem('prev_deepseek', stats.deepseekRequests.toString());

        // Тренд Images
        const prevImages = parseInt(localStorage.getItem('prev_images') || '0');
        if (prevImages > 0) {
            trends.images = this.calculateTrendPercent(stats.imagesGenerated, prevImages);
        } else {
            trends.images = 0;
        }
        localStorage.setItem('prev_images', stats.imagesGenerated.toString());

        return trends;
    }

    calculateTrendPercent(current, previous) {
        if (previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    // ========================================
    // АНАЛІТИКА ПО ЧАСУ
    // ========================================

    async getTimeSeriesData(period = 'week') {
        const data = {
            labels: [],
            gemini: [],
            deepseek: [],
            images: []
        };

        const now = Date.now();
        const periodMap = {
            'day': { count: 24, interval: 60 * 60 * 1000, format: 'HH:00' },
            'week': { count: 7, interval: 24 * 60 * 60 * 1000, format: 'dd.MM' },
            'month': { count: 30, interval: 24 * 60 * 60 * 1000, format: 'dd.MM' }
        };

        const config = periodMap[period] || periodMap['week'];

        if (window.appState) {
            const geminiMessages = appState.getGeminiMessages?.() || [];
            const deepseekMessages = appState.getDeepSeekMessages?.() || [];
            const imageGallery = appState.chat?.image?.gallery || [];

            for (let i = config.count - 1; i >= 0; i--) {
                const periodStart = now - (i * config.interval);
                const periodEnd = periodStart + config.interval;

                // Label
                const date = new Date(periodStart);
                if (config.format === 'HH:00') {
                    data.labels.push(`${date.getHours()}:00`);
                } else {
                    data.labels.push(
                        `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
                    );
                }

                // Count messages in period
                data.gemini.push(this.countInRange(geminiMessages, periodStart, periodEnd));
                data.deepseek.push(this.countInRange(deepseekMessages, periodStart, periodEnd));
                data.images.push(this.countInRange(imageGallery, periodStart, periodEnd));
            }
        }

        return data;
    }

    countInRange(items, start, end) {
        if (!items || items.length === 0) return 0;

        return items.filter(item => {
            const time = item.timestamp || item.created || item.date;
            if (!time) return false;
            
            const itemTime = typeof time === 'string' ? 
                new Date(time).getTime() : time;
            
            return itemTime >= start && itemTime < end;
        }).length;
    }

    // ========================================
    // ПОПУЛЯРНІСТЬ ПО ГОДИНАХ
    // ========================================

    async getHourlyActivity() {
        const hourlyData = new Array(24).fill(0);

        if (window.appState) {
            const geminiMessages = appState.getGeminiMessages?.() || [];
            const deepseekMessages = appState.getDeepSeekMessages?.() || [];

            const allMessages = [...geminiMessages, ...deepseekMessages];

            allMessages.forEach(msg => {
                const time = msg.timestamp || msg.created || msg.date;
                if (!time) return;

                const date = new Date(typeof time === 'string' ? time : new Date(time));
                const hour = date.getHours();
                
                hourlyData[hour]++;
            });
        }

        return {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            data: hourlyData,
            peakHour: hourlyData.indexOf(Math.max(...hourlyData))
        };
    }

    // ========================================
    // TOP ВИКОРИСТОВУВАНІ ФУНКЦІЇ
    // ========================================

    async getTopFeatures() {
        const features = [
            { name: 'Gemini Chat', icon: '✨', count: 0, color: '#58a6ff' },
            { name: 'DeepSeek Coder', icon: '💻', count: 0, color: '#3fb950' },
            { name: 'Image Generator', icon: '🖼️', count: 0, color: '#d29922' },
            { name: 'Планувальник', icon: '📅', count: 0, color: '#a371f7' },
            { name: 'Пам\'ять', icon: '🧠', count: 0, color: '#f85149' }
        ];

        if (window.appState) {
            const stats = appState.getStats();
            features[0].count = stats.geminiRequests || 0;
            features[1].count = stats.deepseekRequests || 0;
            features[2].count = stats.imagesGenerated || 0;

            const plans = appState.getPlans?.() || [];
            features[3].count = plans.length;

            const memories = appState.getMemories?.() || [];
            features[4].count = memories.length;
        }

        return features.sort((a, b) => b.count - a.count);
    }

    // ========================================
    // PRODUCTIVITY SCORE
    // ========================================

    async calculateProductivityScore() {
        const stats = await this.collectStats();
        
        let score = 0;
        let maxScore = 0;

        // Активність (max 30 points)
        const totalActivity = stats.geminiRequests + stats.deepseekRequests + stats.imagesGenerated;
        score += Math.min(30, totalActivity / 10);
        maxScore += 30;

        // Плани (max 20 points)
        if (stats.plans > 0) {
            const completionRate = stats.completedPlans / stats.plans;
            score += completionRate * 20;
        }
        maxScore += 20;

        // Спогади (max 15 points)
        score += Math.min(15, stats.memories / 2);
        maxScore += 15;

        // Збережені проекти (max 20 points)
        score += Math.min(20, stats.savedProjects * 2);
        maxScore += 20;

        // Послідовність використання (max 15 points)
        const daysUsed = this.calculateDaysUsed(stats.firstUse);
        score += Math.min(15, daysUsed / 2);
        maxScore += 15;

        const percentage = Math.round((score / maxScore) * 100);

        return {
            score: Math.round(score),
            maxScore,
            percentage,
            level: this.getProductivityLevel(percentage)
        };
    }

    getProductivityLevel(percentage) {
        if (percentage >= 80) return '🏆 Експерт';
        if (percentage >= 60) return '⭐ Продуктивний';
        if (percentage >= 40) return '📈 Активний';
        if (percentage >= 20) return '🌱 Початківець';
        return '👋 Новачок';
    }

    calculateDaysUsed(firstUse) {
        if (!firstUse) return 1;
        const days = Math.floor((Date.now() - firstUse) / (1000 * 60 * 60 * 24));
        return days + 1;
    }

    // ========================================
    // ЕКСПОРТ СТАТИСТИКИ
    // ========================================

    async exportStats(format = 'json') {
        const stats = await this.collectStats();
        const trends = await this.calculateTrends();
        const productivity = await this.calculateProductivityScore();
        const topFeatures = await this.getTopFeatures();

        const report = {
            exportDate: new Date().toISOString(),
            stats,
            trends,
            productivity,
            topFeatures
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(report, null, 2)], { 
                type: 'application/json' 
            });
            this.downloadFile(blob, `stats-${Date.now()}.json`);
        } else if (format === 'csv') {
            const csv = this.convertToCSV(report);
            const blob = new Blob([csv], { type: 'text/csv' });
            this.downloadFile(blob, `stats-${Date.now()}.csv`);
        }
    }

    convertToCSV(report) {
        let csv = 'Metric,Value\n';
        Object.entries(report.stats).forEach(([key, value]) => {
            csv += `${key},${value}\n`;
        });
        return csv;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================
    // АВТОМАТИЧНЕ ОНОВЛЕННЯ
    // ========================================

    startAutoUpdate(interval = 30000) {
        this.stopAutoUpdate();
        
        this.updateInterval = setInterval(async () => {
            if (window.dashboardManager && typeof dashboardManager.render === 'function') {
                await dashboardManager.render();
            }
        }, interval);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const dashboardStats = new DashboardStats();

// Експорт
window.dashboardStats = dashboardStats;
window.DashboardStats = DashboardStats;

console.log('✅ Dashboard Stats loaded');
