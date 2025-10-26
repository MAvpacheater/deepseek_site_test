// 📅 Planner Core - Main Logic (400 lines)

class PlannerCore {
    constructor() {
        this.currentView = 'grid'; // 'grid', 'list', 'timeline'
        this.filterStatus = 'all'; // 'all', 'pending', 'in_progress', 'completed'
        this.sortBy = 'deadline'; // 'deadline', 'priority', 'created'
        this.reminders = new Map();
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        this.loadPlans();
        this.setupReminderSystem();
        
        console.log('✅ Planner Core initialized');
    }

    setupEventListeners() {
        // Підписатися на події
        if (window.eventBus) {
            eventBus.on('plan:create', () => this.openCreateModal());
            eventBus.on('plan:update', ({ planId, updates }) => this.updatePlan(planId, updates));
            eventBus.on('plan:delete', ({ planId }) => this.deletePlan(planId));
        }

        // AppState події
        if (window.appState) {
            appState.on('plan:add', () => this.refreshPlans());
            appState.on('plan:update', () => this.refreshPlans());
            appState.on('plan:delete', () => this.refreshPlans());
        }
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ ПЛАНІВ
    // ========================================

    async loadPlans() {
        try {
            let plans = [];

            // Завантажити з IndexedDB
            if (window.storageManager) {
                plans = await storageManager.getPlans();
            }

            // Синхронізувати з AppState
            if (window.appState && plans.length > 0) {
                appState.agent.plans = plans;
            }

            // Fallback до AppState
            if (plans.length === 0 && window.appState) {
                plans = appState.getPlans();
            }

            this.updateBadge();
            this.refreshPlans();

            console.log(`📅 Loaded ${plans.length} plans`);

        } catch (error) {
            console.error('Failed to load plans:', error);
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'planner_error',
                    message: 'Failed to load plans',
                    error: error.message,
                    severity: 'medium'
                });
            }
        }
    }

    // ========================================
    // СТВОРЕННЯ ПЛАНУ
    // ========================================

    openCreateModal() {
        const modal = document.getElementById('planModal');
        if (!modal) return;

        // Очистити форму
        this.resetForm();
        modal.classList.add('active');
    }

    resetForm() {
        const fields = {
            planTitle: '',
            planDescription: '',
            planDeadline: '',
            planPriority: 'medium'
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    async createPlan() {
        const title = document.getElementById('planTitle')?.value.trim();
        const description = document.getElementById('planDescription')?.value.trim();
        const deadline = document.getElementById('planDeadline')?.value;
        const priority = document.getElementById('planPriority')?.value || 'medium';

        // Валідація
        const validation = this.validatePlanData({ title, description, deadline, priority });
        if (!validation.valid) {
            if (window.showToast) {
                showToast(`⚠️ ${validation.errors.join(', ')}`, 'warning');
            }
            return null;
        }

        const plan = {
            id: Date.now(),
            title: title,
            description: description,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            priority: priority,
            status: 'pending',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            subtasks: [],
            tags: this.extractTags(description),
            aiGenerated: false
        };

        try {
            // Додати в AppState
            if (window.appState) {
                appState.addPlan(plan);
            }

            // Зберегти в IndexedDB
            if (window.storageManager) {
                await storageManager.savePlan(plan);
            }

            // Створити нагадування
            if (deadline) {
                this.scheduleReminder(plan);
            }

            this.closeModal('planModal');
            this.refreshPlans();

            if (window.showToast) {
                showToast('✅ План створено!', 'success');
            }

            return plan;

        } catch (error) {
            console.error('Failed to create plan:', error);
            if (window.showToast) {
                showToast('❌ Помилка створення плану', 'error');
            }
            return null;
        }
    }

    // ========================================
    // ОНОВЛЕННЯ ПЛАНУ
    // ========================================

    async updatePlan(planId, updates) {
        try {
            const plans = this.getPlans();
            const plan = plans.find(p => p.id === planId);
            
            if (!plan) {
                throw new Error('Plan not found');
            }

            // Оновити дані
            Object.assign(plan, updates, {
                updated: new Date().toISOString()
            });

            // Оновити в AppState
            if (window.appState) {
                appState.updatePlan(planId, plan);
            }

            // Оновити в IndexedDB
            if (window.storageManager) {
                await storageManager.update(storageManager.stores.plans, plan);
            }

            // Оновити нагадування якщо змінився deadline
            if (updates.deadline) {
                this.scheduleReminder(plan);
            }

            this.refreshPlans();

            return plan;

        } catch (error) {
            console.error('Failed to update plan:', error);
            throw error;
        }
    }

    async updatePlanStatus(planId, newStatus) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(newStatus)) {
            throw new Error('Invalid status');
        }

        await this.updatePlan(planId, { status: newStatus });

        // Автоматично запам'ятати завершення
        if (newStatus === 'completed') {
            const plan = this.getPlans().find(p => p.id === planId);
            if (plan && window.appState) {
                appState.addMemory({
                    type: 'plan_completed',
                    title: `План завершено: ${plan.title}`,
                    content: plan.description,
                    category: 'завдання',
                    important: false,
                    timestamp: Date.now()
                });
            }
        }
    }

    // ========================================
    // ВИДАЛЕННЯ ПЛАНУ
    // ========================================

    async deletePlan(planId) {
        // Підтвердження
        const confirmed = await this.confirmDelete(planId);
        if (!confirmed) return false;

        try {
            // Видалити з AppState
            if (window.appState) {
                appState.deletePlan(planId);
            }

            // Видалити з IndexedDB
            if (window.storageManager) {
                await storageManager.delete(storageManager.stores.plans, planId);
            }

            // Видалити нагадування
            this.cancelReminder(planId);

            this.refreshPlans();

            if (window.showToast) {
                showToast('✅ План видалено', 'success');
            }

            return true;

        } catch (error) {
            console.error('Failed to delete plan:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
            return false;
        }
    }

    async confirmDelete(planId) {
        const plan = this.getPlans().find(p => p.id === planId);
        if (!plan) return false;

        if (window.modalManager) {
            return await modalManager.confirm(
                `Видалити план "${plan.title}"?\n\nЦю дію не можна скасувати!`,
                {
                    title: '⚠️ Підтвердження',
                    icon: '🗑️',
                    confirmText: 'Так, видалити',
                    cancelText: 'Скасувати',
                    danger: true
                }
            );
        }

        return confirm(`⚠️ Видалити план "${plan.title}"?`);
    }

    // ========================================
    // ДУБЛЮВАННЯ ПЛАНУ
    // ========================================

    async duplicatePlan(planId) {
        const plan = this.getPlans().find(p => p.id === planId);
        if (!plan) return null;

        const duplicate = {
            ...plan,
            id: Date.now(),
            title: `${plan.title} (копія)`,
            status: 'pending',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            subtasks: plan.subtasks.map(st => ({
                ...st,
                id: Date.now() + Math.random(),
                completed: false
            }))
        };

        try {
            if (window.appState) {
                appState.addPlan(duplicate);
            }

            if (window.storageManager) {
                await storageManager.savePlan(duplicate);
            }

            this.refreshPlans();

            if (window.showToast) {
                showToast('✅ План продубльовано!', 'success');
            }

            return duplicate;

        } catch (error) {
            console.error('Failed to duplicate plan:', error);
            return null;
        }
    }

    // ========================================
    // ЕКСПОРТ ПЛАНУ
    // ========================================

    exportPlan(planId, format = 'markdown') {
        const plan = this.getPlans().find(p => p.id === planId);
        if (!plan) return;

        let content = '';

        if (format === 'markdown') {
            content = this.generateMarkdown(plan);
        } else if (format === 'json') {
            content = JSON.stringify(plan, null, 2);
        }

        this.downloadFile(content, `${plan.title}.${format === 'markdown' ? 'md' : 'json'}`);
    }

    generateMarkdown(plan) {
        let md = `# ${plan.title}\n\n`;
        md += `**Опис:** ${plan.description}\n\n`;
        md += `**Статус:** ${this.getStatusText(plan.status)}\n`;
        md += `**Пріоритет:** ${this.getPriorityText(plan.priority)}\n`;

        if (plan.deadline) {
            md += `**Дедлайн:** ${new Date(plan.deadline).toLocaleString('uk-UA')}\n`;
        }

        if (plan.subtasks && plan.subtasks.length > 0) {
            md += `\n## Підзавдання:\n\n`;
            plan.subtasks.forEach((st, i) => {
                md += `- [${st.completed ? 'x' : ' '}] ${st.title}\n`;
            });
        }

        if (plan.tags && plan.tags.length > 0) {
            md += `\n**Теги:** ${plan.tags.map(t => `#${t}`).join(', ')}\n`;
        }

        md += `\n---\n*Створено: ${new Date(plan.created).toLocaleString('uk-UA')}*`;

        return md;
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
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
    // СИСТЕМА НАГАДУВАНЬ
    // ========================================

    setupReminderSystem() {
        // Перевіряти прострочені плани кожні 10 хвилин
        setInterval(() => {
            this.checkOverduePlans();
        }, 10 * 60 * 1000);

        // Перевірити одразу
        this.checkOverduePlans();
    }

    scheduleReminder(plan) {
        if (!plan.deadline) return;

        const deadline = new Date(plan.deadline);
        const now = Date.now();
        const timeUntil = deadline.getTime() - now;

        // Видалити старі нагадування
        this.cancelReminder(plan.id);

        // Нагадати за 1 день
        const oneDayBefore = deadline.getTime() - (24 * 60 * 60 * 1000);
        if (oneDayBefore > now) {
            const timeout = setTimeout(() => {
                this.showReminder(plan, 'tomorrow');
            }, oneDayBefore - now);
            
            this.reminders.set(`${plan.id}_1day`, timeout);
        }

        // Нагадати в день дедлайну
        if (timeUntil > 0) {
            const timeout = setTimeout(() => {
                this.showReminder(plan, 'today');
            }, timeUntil);
            
            this.reminders.set(`${plan.id}_today`, timeout);
        }
    }

    showReminder(plan, when) {
        const messages = {
            tomorrow: `🔔 Завтра дедлайн: ${plan.title}`,
            today: `🔴 Сьогодні дедлайн: ${plan.title}`
        };

        if (window.showToast) {
            showToast(messages[when], when === 'today' ? 'error' : 'warning', 15000);
        }

        // Спробувати показати нотифікацію браузера
        this.showBrowserNotification(plan, when);
    }

    showBrowserNotification(plan, when) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('AI Assistant Hub - Нагадування', {
                body: when === 'today' ? 
                    `Сьогодні дедлайн: ${plan.title}` : 
                    `Завтра дедлайн: ${plan.title}`,
                icon: '/favicon.ico'
            });
        }
    }

    cancelReminder(planId) {
        // Видалити всі нагадування для цього плану
        const keys = Array.from(this.reminders.keys()).filter(k => k.startsWith(`${planId}_`));
        
        keys.forEach(key => {
            clearTimeout(this.reminders.get(key));
            this.reminders.delete(key);
        });
    }

    checkOverduePlans() {
        const plans = this.getPlans();
        const now = Date.now();
        
        const overdue = plans.filter(p => 
            p.deadline && 
            new Date(p.deadline).getTime() < now && 
            p.status !== 'completed' && 
            p.status !== 'cancelled'
        );

        if (overdue.length > 0) {
            console.log(`⚠️ ${overdue.length} прострочених планів`);
        }

        return overdue;
    }

    // ========================================
    // ВАЛІДАЦІЯ
    // ========================================

    validatePlanData(data) {
        const errors = [];

        if (!data.title || data.title.trim() === '') {
            errors.push('Назва плану обов\'язкова');
        }

        if (data.title && data.title.length > 200) {
            errors.push('Назва занадто довга (макс 200 символів)');
        }

        if (data.deadline) {
            const deadline = new Date(data.deadline);
            if (deadline < Date.now()) {
                errors.push('Дедлайн не може бути в минулому');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    getPlans() {
        if (window.appState) {
            return appState.getPlans() || [];
        }
        return [];
    }

    refreshPlans() {
        this.updateBadge();
        
        // Сповістити UI про оновлення
        if (window.eventBus) {
            eventBus.emit('planner:refresh');
        }
    }

    updateBadge() {
        const badge = document.getElementById('plansBadge');
        if (!badge) return;

        const plans = this.getPlans();
        const active = plans.filter(p => 
            p.status !== 'completed' && p.status !== 'cancelled'
        ).length;

        badge.textContent = active;
        badge.style.display = active > 0 ? 'inline-block' : 'none';
    }

    extractTags(text) {
        if (!text) return [];
        const tags = (text.match(/#[\wа-яіїє]+/gi) || [])
            .map(t => t.substring(1).toLowerCase());
        return [...new Set(tags)];
    }

    getStatusText(status) {
        const texts = {
            pending: '⏳ Очікує',
            in_progress: '🚀 В процесі',
            completed: '✅ Завершено',
            cancelled: '❌ Скасовано'
        };
        return texts[status] || status;
    }

    getPriorityText(priority) {
        const texts = {
            high: '🔴 Високий',
            medium: '🟡 Середній',
            low: '🟢 Низький'
        };
        return texts[priority] || priority;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    getStats() {
        const plans = this.getPlans();
        
        return {
            total: plans.length,
            pending: plans.filter(p => p.status === 'pending').length,
            inProgress: plans.filter(p => p.status === 'in_progress').length,
            completed: plans.filter(p => p.status === 'completed').length,
            overdue: this.checkOverduePlans().length
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const plannerCore = new PlannerCore();

// Експорт
window.plannerCore = plannerCore;
window.PlannerCore = PlannerCore;

// Compatibility functions
window.createPlan = () => plannerCore.createPlan();
window.savePlan = () => plannerCore.createPlan();

console.log('✅ Planner Core loaded');
