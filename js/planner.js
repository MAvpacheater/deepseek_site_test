// 📅 Smart Planner - Refactored to use AppState & StorageManager

class PlannerManager {
    constructor() {
        this.reminders = [];
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadPlans();
        this.setupReminderChecks();
        console.log('✅ Planner Manager initialized');
    }

    // ========================================
    // ЗАВАНТАЖЕННЯ ПЛАНІВ
    // ========================================

    async loadPlans() {
        try {
            if (window.storageManager) {
                const plans = await storageManager.getPlans();
                
                // Синхронізувати з appState
                if (window.appState) {
                    plans.forEach(plan => {
                        appState.agent.plans.push(plan);
                    });
                }
            } else if (window.appState) {
                // Завантажити з appState
                const plans = appState.getPlans();
            }

            this.updatePlansBadge();
            this.displayPlans();

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
    // ЗБЕРЕЖЕННЯ ПЛАНІВ
    // ========================================

    async savePlans() {
        try {
            const plans = window.appState ? appState.getPlans() : [];

            if (window.storageManager) {
                // Зберегти кожен план окремо
                for (const plan of plans) {
                    if (plan.id) {
                        await storageManager.update(storageManager.stores.plans, plan);
                    }
                }
            }

            this.updatePlansBadge();

        } catch (error) {
            console.error('Failed to save plans:', error);
        }
    }

    // ========================================
    // ОНОВЛЕННЯ БЕЙДЖА
    // ========================================

    updatePlansBadge() {
        const badge = document.getElementById('plansBadge');
        if (!badge) return;

        const plans = window.appState ? appState.getPlans() : [];
        const activePlans = plans.filter(p => 
            p.status !== 'completed' && p.status !== 'cancelled'
        ).length;

        badge.textContent = activePlans;
        badge.style.display = activePlans > 0 ? 'inline-block' : 'none';
    }

    // ========================================
    // ВІДОБРАЖЕННЯ ПЛАНІВ
    // ========================================

    displayPlans() {
        const grid = document.getElementById('plansGrid');
        if (!grid) return;

        const plans = window.appState ? appState.getPlans() : [];

        if (plans.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>Немає планів</h3>
                    <p>Створи свій перший план або попроси AI згенерувати його</p>
                </div>
            `;
            return;
        }

        // Сортувати за дедлайном
        const sortedPlans = [...plans].sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        grid.innerHTML = sortedPlans.map(plan => this.createPlanCard(plan)).join('');
    }

    createPlanCard(plan) {
        const priorityColor = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#22c55e'
        }[plan.priority] || '#666';

        const statusIcon = {
            pending: '⏳',
            in_progress: '🚀',
            completed: '✅',
            cancelled: '❌'
        }[plan.status] || '⏳';

        const daysLeft = plan.deadline ? 
            Math.ceil((new Date(plan.deadline) - Date.now()) / (1000 * 60 * 60 * 24)) : null;

        const isOverdue = daysLeft !== null && daysLeft < 0;

        const progress = this.calculateProgress(plan);

        return `
            <div class="plan-card" style="border-left: 4px solid ${priorityColor};">
                <div class="plan-header">
                    <div class="plan-status">${statusIcon}</div>
                    <div class="plan-title">${this.escapeHTML(plan.title)}</div>
                    <button class="plan-menu-btn" onclick="plannerManager.togglePlanMenu(${plan.id})">⋮</button>
                </div>
                
                <div class="plan-description">${this.escapeHTML(plan.description)}</div>
                
                ${plan.deadline ? `
                    <div class="plan-deadline ${isOverdue ? 'overdue' : ''}">
                        📅 ${new Date(plan.deadline).toLocaleString('uk-UA')}
                        ${daysLeft !== null ? `
                            <span class="days-left">(${isOverdue ? 'прострочено на' : 'залишилось'} ${Math.abs(daysLeft)} дн.)</span>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${plan.subtasks && plan.subtasks.length > 0 ? `
                    <div class="plan-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            ${plan.subtasks.filter(st => st.completed).length}/${plan.subtasks.length} завдань
                        </div>
                    </div>
                ` : ''}
                
                <div class="plan-actions">
                    <button onclick="plannerManager.viewPlan(${plan.id})">👁️ Деталі</button>
                    <button onclick="plannerManager.updatePlanStatus(${plan.id})">🔄 Статус</button>
                    <button onclick="plannerManager.deletePlan(${plan.id})">🗑️</button>
                </div>
                
                <div class="plan-menu" id="plan-menu-${plan.id}" style="display: none;">
                    <button onclick="plannerManager.editPlan(${plan.id})">✏️ Редагувати</button>
                    <button onclick="plannerManager.duplicatePlan(${plan.id})">📋 Дублювати</button>
                    <button onclick="plannerManager.generateSubtasks(${plan.id})">🤖 AI підзавдання</button>
                    <button onclick="plannerManager.exportPlan(${plan.id})">📤 Експорт</button>
                </div>
            </div>
        `;
    }

    // ========================================
    // CRUD ОПЕРАЦІЇ
    // ========================================

    createPlan() {
        const modal = document.getElementById('planModal');
        if (modal) {
            modal.classList.add('active');
            
            // Очистити форму
            const titleInput = document.getElementById('planTitle');
            const descInput = document.getElementById('planDescription');
            const deadlineInput = document.getElementById('planDeadline');
            const priorityInput = document.getElementById('planPriority');

            if (titleInput) titleInput.value = '';
            if (descInput) descInput.value = '';
            if (deadlineInput) deadlineInput.value = '';
            if (priorityInput) priorityInput.value = 'medium';
        }
    }

    async savePlan() {
        const title = document.getElementById('planTitle')?.value.trim();
        const description = document.getElementById('planDescription')?.value.trim();
        const deadline = document.getElementById('planDeadline')?.value;
        const priority = document.getElementById('planPriority')?.value || 'medium';

        if (!title) {
            if (window.showToast) {
                showToast('⚠️ Введи назву плану!', 'warning');
            }
            return;
        }

        const plan = {
            id: Date.now(),
            title: title,
            description: description,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            priority: priority,
            status: 'pending',
            created: new Date().toISOString(),
            subtasks: [],
            aiGenerated: false
        };

        try {
            // Додати в appState
            if (window.appState) {
                appState.addPlan(plan);
            }

            // Зберегти в storageManager
            if (window.storageManager) {
                await storageManager.savePlan(plan);
            }

            this.displayPlans();
            this.closeModal('planModal');

            // Створити нагадування якщо є дедлайн
            if (deadline) {
                this.createReminderForPlan(plan);
            }

            if (window.showToast) {
                showToast('✅ План створено!', 'success');
            }

        } catch (error) {
            console.error('Failed to save plan:', error);
            if (window.showToast) {
                showToast('❌ Помилка збереження плану', 'error');
            }
        }
    }

    viewPlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        let details = `📋 ${plan.title}\n\n`;
        details += `📝 ${plan.description}\n\n`;
        details += `📊 Статус: ${this.getStatusText(plan.status)}\n`;
        details += `⚡ Пріоритет: ${this.getPriorityText(plan.priority)}\n`;

        if (plan.deadline) {
            const deadline = new Date(plan.deadline);
            details += `📅 Дедлайн: ${deadline.toLocaleString('uk-UA')}\n`;
        }

        if (plan.subtasks && plan.subtasks.length > 0) {
            details += `\n✅ Підзавдання:\n`;
            plan.subtasks.forEach((st, i) => {
                details += `${st.completed ? '✓' : '○'} ${i + 1}. ${st.title}\n`;
            });
        }

        alert(details);
    }

    async updatePlanStatus(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const newStatus = prompt(
            'Оновити статус:\n\n' +
            '1 - Очікує (⏳)\n' +
            '2 - В процесі (🚀)\n' +
            '3 - Завершено (✅)\n' +
            '4 - Скасовано (❌)',
            plan.status === 'pending' ? '1' : 
            plan.status === 'in_progress' ? '2' : 
            plan.status === 'completed' ? '3' : '4'
        );

        const statuses = {
            '1': 'pending',
            '2': 'in_progress',
            '3': 'completed',
            '4': 'cancelled'
        };

        if (statuses[newStatus]) {
            plan.status = statuses[newStatus];

            // Оновити в appState
            if (window.appState) {
                appState.updatePlan(planId, { status: plan.status });
            }

            // Зберегти
            await this.savePlans();
            this.displayPlans();

            // Автоматично запам'ятати завершення
            if (plan.status === 'completed' && typeof autoRemember === 'function') {
                autoRemember('plan_completed', { title: plan.title });
            }
        }
    }

    async deletePlan(planId) {
        if (!confirm('⚠️ Видалити цей план?')) return;

        try {
            // Видалити з appState
            if (window.appState) {
                appState.deletePlan(planId);
            }

            // Видалити з storageManager
            if (window.storageManager) {
                await storageManager.delete(storageManager.stores.plans, planId);
            }

            this.displayPlans();

            if (window.showToast) {
                showToast('✅ План видалено', 'success');
            }

        } catch (error) {
            console.error('Failed to delete plan:', error);
            if (window.showToast) {
                showToast('❌ Помилка видалення', 'error');
            }
        }
    }

    editPlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        document.getElementById('planTitle').value = plan.title;
        document.getElementById('planDescription').value = plan.description;
        document.getElementById('planDeadline').value = plan.deadline ? 
            new Date(plan.deadline).toISOString().slice(0, 16) : '';
        document.getElementById('planPriority').value = plan.priority;

        // Видалити план перед редагуванням
        if (window.appState) {
            appState.deletePlan(planId);
        }

        const modal = document.getElementById('planModal');
        if (modal) modal.classList.add('active');
    }

    async duplicatePlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const duplicate = {
            ...plan,
            id: Date.now(),
            title: plan.title + ' (копія)',
            created: new Date().toISOString(),
            status: 'pending'
        };

        try {
            if (window.appState) {
                appState.addPlan(duplicate);
            }

            if (window.storageManager) {
                await storageManager.savePlan(duplicate);
            }

            this.displayPlans();

            if (window.showToast) {
                showToast('✅ План продубльовано!', 'success');
            }

        } catch (error) {
            console.error('Failed to duplicate plan:', error);
        }
    }

    // ========================================
    // AI ГЕНЕРАЦІЯ ПІДЗАВДАНЬ
    // ========================================

    async generateSubtasks(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const apiKey = typeof getGroqApiKey === 'function' ? 
            getGroqApiKey() : 
            localStorage.getItem('groq_api_key');

        if (!apiKey) {
            if (window.showToast) {
                showToast('⚠️ Введи Groq API ключ у налаштуваннях!', 'warning');
            }
            if (typeof switchMode === 'function') {
                switchMode('settings');
            }
            return;
        }

        if (window.showToast) {
            showToast('🤖 AI генерує підзавдання...', 'info');
        }

        const prompt = `Розбий це завдання на конкретні підзавдання (3-7 штук):

Завдання: ${plan.title}
Опис: ${plan.description}

Формат відповіді - список підзавдань через новий рядок, без нумерації:`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Ти помічник для планування. Створюй чіткі, конкретні підзавдання.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            const data = await response.json();
            const subtasksText = data.choices[0].message.content;

            const subtasks = subtasksText
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[-•*\d.]+\s*/, '').trim())
                .filter(line => line.length > 0)
                .map(title => ({
                    id: Date.now() + Math.random(),
                    title: title,
                    completed: false
                }));

            plan.subtasks = subtasks;
            plan.aiGenerated = true;

            // Оновити в appState
            if (window.appState) {
                appState.updatePlan(planId, { subtasks, aiGenerated: true });
            }

            await this.savePlans();
            this.displayPlans();

            if (window.showToast) {
                showToast(`✅ AI створив ${subtasks.length} підзавдань!`, 'success');
            }

        } catch (error) {
            console.error('AI generation error:', error);
            if (window.showToast) {
                showToast('❌ Помилка генерації підзавдань', 'error');
            }
        }
    }

    // ========================================
    // ЕКСПОРТ
    // ========================================

    exportPlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        let markdown = `# ${plan.title}\n\n`;
        markdown += `**Опис:** ${plan.description}\n\n`;
        markdown += `**Статус:** ${this.getStatusText(plan.status)}\n`;
        markdown += `**Пріоритет:** ${this.getPriorityText(plan.priority)}\n`;

        if (plan.deadline) {
            markdown += `**Дедлайн:** ${new Date(plan.deadline).toLocaleString('uk-UA')}\n`;
        }

        if (plan.subtasks && plan.subtasks.length > 0) {
            markdown += `\n## Підзавдання:\n\n`;
            plan.subtasks.forEach((st, i) => {
                markdown += `- [${st.completed ? 'x' : ' '}] ${st.title}\n`;
            });
        }

        markdown += `\n---\n*Створено: ${new Date(plan.created).toLocaleString('uk-UA')}*`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.title}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================
    // НАГАДУВАННЯ
    // ========================================

    setupReminderChecks() {
        // Перевіряти прострочені плани кожні 10 хвилин
        setInterval(() => {
            this.checkOverduePlans();
        }, 10 * 60 * 1000);
    }

    checkOverduePlans() {
        const plans = window.appState ? appState.getPlans() : [];
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

    createReminderForPlan(plan) {
        if (!plan.deadline) return;

        const deadline = new Date(plan.deadline);
        const now = Date.now();
        const timeUntil = deadline.getTime() - now;

        // Нагадати за 1 день до дедлайну
        const reminderTime = deadline.getTime() - (24 * 60 * 60 * 1000);

        if (reminderTime > now) {
            setTimeout(() => {
                if (window.showToast) {
                    showToast(`🔔 Завтра дедлайн: ${plan.title}`, 'warning', 10000);
                }
            }, reminderTime - now);
        }

        // Нагадати в день дедлайну
        if (timeUntil > 0) {
            setTimeout(() => {
                if (window.showToast) {
                    showToast(`🔴 Сьогодні дедлайн: ${plan.title}`, 'error', 15000);
                }
            }, timeUntil);
        }
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    calculateProgress(plan) {
        if (!plan.subtasks || plan.subtasks.length === 0) return 0;
        const completed = plan.subtasks.filter(st => st.completed).length;
        return Math.round((completed / plan.subtasks.length) * 100);
    }

    togglePlanMenu(planId) {
        const menu = document.getElementById(`plan-menu-${planId}`);
        if (menu) {
            const isVisible = menu.style.display !== 'none';

            // Закрити всі інші меню
            document.querySelectorAll('.plan-menu').forEach(m => {
                m.style.display = 'none';
            });

            menu.style.display = isVisible ? 'none' : 'block';
        }
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

    escapeHTML(text) {
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let plannerManager = null;

document.addEventListener('DOMContentLoaded', () => {
    plannerManager = new PlannerManager();

    // Експортувати функції для сумісності
    window.createPlan = () => plannerManager.createPlan();
    window.savePlan = () => plannerManager.savePlan();
    window.viewPlan = (id) => plannerManager.viewPlan(id);
    window.updatePlanStatus = (id) => plannerManager.updatePlanStatus(id);
    window.deletePlan = (id) => plannerManager.deletePlan(id);
    window.editPlan = (id) => plannerManager.editPlan(id);
    window.duplicatePlan = (id) => plannerManager.duplicatePlan(id);
    window.generateSubtasks = (id) => plannerManager.generateSubtasks(id);
    window.exportPlan = (id) => plannerManager.exportPlan(id);
    window.displayPlans = () => plannerManager.displayPlans();
    window.togglePlanMenu = (id) => plannerManager.togglePlanMenu(id);

    console.log('✅ Planner module loaded');
});

// Експорт класу
window.PlannerManager = PlannerManager;
window.plannerManager = plannerManager;
