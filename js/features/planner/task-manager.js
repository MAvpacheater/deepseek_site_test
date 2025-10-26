// 📋 Task Manager - Subtasks Management (300 lines)

class TaskManager {
    constructor() {
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        console.log('✅ Task Manager initialized');
    }

    setupEventListeners() {
        if (window.eventBus) {
            eventBus.on('task:add', ({ planId, task }) => {
                this.addTask(planId, task);
            });
            
            eventBus.on('task:toggle', ({ planId, taskId }) => {
                this.toggleTask(planId, taskId);
            });
            
            eventBus.on('task:delete', ({ planId, taskId }) => {
                this.deleteTask(planId, taskId);
            });
        }
    }

    // ========================================
    // ДОДАВАННЯ ПІДЗАВДАННЯ
    // ========================================

    async addTask(planId, taskTitle) {
        const plan = this.getPlan(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        const task = {
            id: Date.now() + Math.random(),
            title: taskTitle,
            completed: false,
            created: new Date().toISOString()
        };

        if (!plan.subtasks) {
            plan.subtasks = [];
        }

        plan.subtasks.push(task);

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        if (window.showToast) {
            showToast('✅ Підзавдання додано', 'success', 2000);
        }

        return task;
    }

    // ========================================
    // TOGGLE ПІДЗАВДАННЯ
    // ========================================

    async toggleTask(planId, taskId) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        const task = plan.subtasks.find(t => t.id === taskId);
        if (!task) return false;

        task.completed = !task.completed;

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        // Перевірити чи всі підзавдання виконані
        this.checkAllTasksCompleted(plan);

        return true;
    }

    // ========================================
    // ВИДАЛЕННЯ ПІДЗАВДАННЯ
    // ========================================

    async deleteTask(planId, taskId) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        plan.subtasks = plan.subtasks.filter(t => t.id !== taskId);

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        if (window.showToast) {
            showToast('✅ Підзавдання видалено', 'success', 2000);
        }

        return true;
    }

    // ========================================
    // РЕДАГУВАННЯ ПІДЗАВДАННЯ
    // ========================================

    async editTask(planId, taskId, newTitle) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        const task = plan.subtasks.find(t => t.id === taskId);
        if (!task) return false;

        task.title = newTitle;
        task.updated = new Date().toISOString();

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        return true;
    }

    // ========================================
    // ЗМІНА ПОРЯДКУ
    // ========================================

    async reorderTasks(planId, oldIndex, newIndex) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        const tasks = [...plan.subtasks];
        const [movedTask] = tasks.splice(oldIndex, 1);
        tasks.splice(newIndex, 0, movedTask);

        // Оновити план
        await this.updatePlan(planId, { subtasks: tasks });

        return true;
    }

    // ========================================
    // BULK OPERATIONS
    // ========================================

    async addMultipleTasks(planId, taskTitles) {
        const plan = this.getPlan(planId);
        if (!plan) return false;

        if (!plan.subtasks) {
            plan.subtasks = [];
        }

        const newTasks = taskTitles.map(title => ({
            id: Date.now() + Math.random(),
            title: title,
            completed: false,
            created: new Date().toISOString()
        }));

        plan.subtasks.push(...newTasks);

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        if (window.showToast) {
            showToast(`✅ Додано ${newTasks.length} підзавдань`, 'success');
        }

        return newTasks;
    }

    async toggleAllTasks(planId, completed) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        plan.subtasks.forEach(task => {
            task.completed = completed;
        });

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        return true;
    }

    async deleteCompletedTasks(planId) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return false;

        const beforeCount = plan.subtasks.length;
        plan.subtasks = plan.subtasks.filter(t => !t.completed);
        const deletedCount = beforeCount - plan.subtasks.length;

        if (deletedCount === 0) {
            if (window.showToast) {
                showToast('ℹ️ Немає виконаних підзавдань', 'info');
            }
            return false;
        }

        // Оновити план
        await this.updatePlan(planId, { subtasks: plan.subtasks });

        if (window.showToast) {
            showToast(`✅ Видалено ${deletedCount} підзавдань`, 'success');
        }

        return true;
    }

    // ========================================
    // АВТОМАТИЧНЕ ЗАВЕРШЕННЯ ПЛАНУ
    // ========================================

    checkAllTasksCompleted(plan) {
        if (!plan.subtasks || plan.subtasks.length === 0) return;

        const allCompleted = plan.subtasks.every(t => t.completed);

        if (allCompleted && plan.status !== 'completed') {
            // Запропонувати завершити план
            if (window.modalManager) {
                modalManager.confirm(
                    `Всі підзавдання виконані!\n\nПозначити план "${plan.title}" як завершений?`,
                    {
                        title: '✅ Завершити план?',
                        icon: '🎉',
                        confirmText: 'Так, завершити',
                        cancelText: 'Ні, не зараз'
                    }
                ).then(confirmed => {
                    if (confirmed && window.plannerCore) {
                        plannerCore.updatePlanStatus(plan.id, 'completed');
                    }
                });
            }
        }
    }

    // ========================================
    // ПРОГРЕС
    // ========================================

    calculateProgress(plan) {
        if (!plan.subtasks || plan.subtasks.length === 0) {
            return 0;
        }

        const completed = plan.subtasks.filter(t => t.completed).length;
        return Math.round((completed / plan.subtasks.length) * 100);
    }

    getTaskStats(plan) {
        if (!plan.subtasks) {
            return {
                total: 0,
                completed: 0,
                pending: 0,
                progress: 0
            };
        }

        const completed = plan.subtasks.filter(t => t.completed).length;
        const pending = plan.subtasks.length - completed;

        return {
            total: plan.subtasks.length,
            completed: completed,
            pending: pending,
            progress: this.calculateProgress(plan)
        };
    }

    // ========================================
    // ПОШУК
    // ========================================

    searchTasks(planId, query) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return [];

        const lowerQuery = query.toLowerCase();
        
        return plan.subtasks.filter(task => 
            task.title.toLowerCase().includes(lowerQuery)
        );
    }

    // ========================================
    // ФІЛЬТРАЦІЯ
    // ========================================

    filterTasks(plan, filter) {
        if (!plan.subtasks) return [];

        switch (filter) {
            case 'completed':
                return plan.subtasks.filter(t => t.completed);
            case 'pending':
                return plan.subtasks.filter(t => !t.completed);
            case 'all':
            default:
                return plan.subtasks;
        }
    }

    // ========================================
    // ЕКСПОРТ
    // ========================================

    exportTasks(planId, format = 'text') {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks) return '';

        if (format === 'markdown') {
            return plan.subtasks
                .map(t => `- [${t.completed ? 'x' : ' '}] ${t.title}`)
                .join('\n');
        }

        if (format === 'text') {
            return plan.subtasks
                .map((t, i) => `${i + 1}. ${t.completed ? '✓' : '○'} ${t.title}`)
                .join('\n');
        }

        if (format === 'json') {
            return JSON.stringify(plan.subtasks, null, 2);
        }

        return '';
    }

    // ========================================
    // UTILITY
    // ========================================

    getPlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        return plans.find(p => p.id === planId);
    }

    async updatePlan(planId, updates) {
        if (window.plannerCore) {
            return await plannerCore.updatePlan(planId, updates);
        }
        return false;
    }

    // ========================================
    // ВАЛІДАЦІЯ
    // ========================================

    validateTaskTitle(title) {
        const errors = [];

        if (!title || title.trim() === '') {
            errors.push('Назва підзавдання не може бути порожньою');
        }

        if (title.length > 200) {
            errors.push('Назва занадто довга (макс 200 символів)');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========================================
    // ГЕНЕРАЦІЯ MOCK ДАНИХ
    // ========================================

    generateMockTasks(planId, count = 5) {
        const mockTitles = [
            'Зібрати інформацію',
            'Створити план дій',
            'Підготувати матеріали',
            'Узгодити з командою',
            'Провести тестування',
            'Підготувати звіт',
            'Презентувати результати'
        ];

        const titles = [];
        for (let i = 0; i < count; i++) {
            titles.push(mockTitles[i % mockTitles.length]);
        }

        return this.addMultipleTasks(planId, titles);
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const taskManager = new TaskManager();

// Експорт
window.taskManager = taskManager;
window.TaskManager = TaskManager;

console.log('✅ Task Manager loaded');
