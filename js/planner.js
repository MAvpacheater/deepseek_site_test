// 📅 Smart Planner - Розумна система планування

let plans = [];
let reminders = [];

// Завантаження планів
function loadPlans() {
    const saved = localStorage.getItem('user_plans');
    if (saved) {
        plans = JSON.parse(saved);
    }
    updatePlansBadge();
}

// Збереження планів
function savePlans() {
    localStorage.setItem('user_plans', JSON.stringify(plans));
    updatePlansBadge();
}

// Оновлення бейджа з кількістю планів
function updatePlansBadge() {
    const badge = document.getElementById('plansBadge');
    if (badge) {
        const activePlans = plans.filter(p => p.status !== 'completed').length;
        badge.textContent = activePlans;
        badge.style.display = activePlans > 0 ? 'inline-block' : 'none';
    }
}

// Відобразити плани
function displayPlans() {
    const grid = document.getElementById('plansGrid');
    if (!grid) return;
    
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
    
    grid.innerHTML = sortedPlans.map(plan => {
        const priorityColor = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#22c55e'
        }[plan.priority];
        
        const statusIcon = {
            pending: '⏳',
            in_progress: '🚀',
            completed: '✅',
            cancelled: '❌'
        }[plan.status];
        
        const daysLeft = plan.deadline ? 
            Math.ceil((new Date(plan.deadline) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        
        const isOverdue = daysLeft !== null && daysLeft < 0;
        
        return `
            <div class="plan-card" style="border-left: 4px solid ${priorityColor};">
                <div class="plan-header">
                    <div class="plan-status">${statusIcon}</div>
                    <div class="plan-title">${escapeHtml(plan.title)}</div>
                    <button class="plan-menu-btn" onclick="togglePlanMenu(${plan.id})">⋮</button>
                </div>
                
                <div class="plan-description">${escapeHtml(plan.description)}</div>
                
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
                            <div class="progress-fill" style="width: ${calculateProgress(plan)}%"></div>
                        </div>
                        <div class="progress-text">
                            ${plan.subtasks.filter(st => st.completed).length}/${plan.subtasks.length} завдань
                        </div>
                    </div>
                ` : ''}
                
                <div class="plan-actions">
                    <button onclick="viewPlan(${plan.id})">👁️ Деталі</button>
                    <button onclick="updatePlanStatus(${plan.id})">🔄 Статус</button>
                    <button onclick="deletePlan(${plan.id})">🗑️</button>
                </div>
                
                <div class="plan-menu" id="plan-menu-${plan.id}" style="display: none;">
                    <button onclick="editPlan(${plan.id})">✏️ Редагувати</button>
                    <button onclick="duplicatePlan(${plan.id})">📋 Дублювати</button>
                    <button onclick="generateSubtasks(${plan.id})">🤖 AI підзавдання</button>
                    <button onclick="sharePlan(${plan.id})">📤 Експорт</button>
                </div>
            </div>
        `;
    }).join('');
}

// Створити план
function createPlan() {
    const modal = document.getElementById('planModal');
    modal.classList.add('active');
    
    // Очистити форму
    document.getElementById('planTitle').value = '';
    document.getElementById('planDescription').value = '';
    document.getElementById('planDeadline').value = '';
    document.getElementById('planPriority').value = 'medium';
}

// Зберегти план
function savePlan() {
    const title = document.getElementById('planTitle').value.trim();
    const description = document.getElementById('planDescription').value.trim();
    const deadline = document.getElementById('planDeadline').value;
    const priority = document.getElementById('planPriority').value;
    
    if (!title) {
        alert('⚠️ Введи назву плану!');
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
    
    plans.push(plan);
    savePlans();
    displayPlans();
    closeModal('planModal');
    
    // Створити нагадування якщо є дедлайн
    if (deadline && localStorage.getItem('agentReminders') !== 'false') {
        createReminderForPlan(plan);
    }
    
    alert('✅ План створено!');
}

// Обчислити прогрес
function calculateProgress(plan) {
    if (!plan.subtasks || plan.subtasks.length === 0) return 0;
    const completed = plan.subtasks.filter(st => st.completed).length;
    return Math.round((completed / plan.subtasks.length) * 100);
}

// Переключити меню плану
function togglePlanMenu(planId) {
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

// Переглянути план
function viewPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    let details = `📋 ${plan.title}\n\n`;
    details += `📝 ${plan.description}\n\n`;
    details += `📊 Статус: ${getStatusText(plan.status)}\n`;
    details += `⚡ Пріоритет: ${getPriorityText(plan.priority)}\n`;
    
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

// Оновити статус плану
function updatePlanStatus(planId) {
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
        
        if (plan.status === 'completed') {
            // Запам'ятати завершення
            if (window.agent) {
                agent.addMemory({
                    type: 'plan_completed',
                    title: plan.title,
                    date: new Date()
                });
            }
        }
        
        savePlans();
        displayPlans();
    }
}

// Видалити план
function deletePlan(planId) {
    if (!confirm('⚠️ Видалити цей план?')) return;
    
    plans = plans.filter(p => p.id !== planId);
    savePlans();
    displayPlans();
}

// Редагувати план
function editPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    document.getElementById('planTitle').value = plan.title;
    document.getElementById('planDescription').value = plan.description;
    document.getElementById('planDeadline').value = plan.deadline ? 
        new Date(plan.deadline).toISOString().slice(0, 16) : '';
    document.getElementById('planPriority').value = plan.priority;
    
    // Видалити старий план після редагування
    plans = plans.filter(p => p.id !== planId);
    
    const modal = document.getElementById('planModal');
    modal.classList.add('active');
}

// Дублювати план
function duplicatePlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    const duplicate = {
        ...plan,
        id: Date.now(),
        title: plan.title + ' (копія)',
        created: new Date().toISOString(),
        status: 'pending'
    };
    
    plans.push(duplicate);
    savePlans();
    displayPlans();
    alert('✅ План продубльовано!');
}

// Генерувати підзавдання через AI
async function generateSubtasks(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    const apiKey = typeof getGroqApiKey === 'function' ? getGroqApiKey() : localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        return;
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
        savePlans();
        displayPlans();
        
        alert(`✅ AI створив ${subtasks.length} підзавдань!`);
        
    } catch (error) {
        console.error('Помилка:', error);
        alert('❌ Помилка генерації підзавдань');
    }
}

// Експорт плану
function sharePlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    let markdown = `# ${plan.title}\n\n`;
    markdown += `**Опис:** ${plan.description}\n\n`;
    markdown += `**Статус:** ${getStatusText(plan.status)}\n`;
    markdown += `**Пріоритет:** ${getPriorityText(plan.priority)}\n`;
    
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

// Створити нагадування для плану
function createReminderForPlan(plan) {
    if (!plan.deadline) return;
    
    const deadline = new Date(plan.deadline);
    const now = Date.now();
    const timeUntil = deadline.getTime() - now;
    
    // Нагадати за 1 день до дедлайну
    const reminderTime = deadline.getTime() - (24 * 60 * 60 * 1000);
    
    if (reminderTime > now) {
        setTimeout(() => {
            alert(`🔔 Нагадування!\n\nЗавтра дедлайн: ${plan.title}`);
        }, reminderTime - now);
    }
    
    // Нагадати в день дедлайну
    if (timeUntil > 0) {
        setTimeout(() => {
            alert(`🔴 Сьогодні дедлайн: ${plan.title}`);
        }, timeUntil);
    }
}

// Перевірити прострочені плани
function checkOverduePlans() {
    const now = Date.now();
    const overdue = plans.filter(p => 
        p.deadline && 
        new Date(p.deadline).getTime() < now && 
        p.status !== 'completed' && 
        p.status !== 'cancelled'
    );
    
    return overdue;
}

// Текстові представлення
function getStatusText(status) {
    const texts = {
        pending: '⏳ Очікує',
        in_progress: '🚀 В процесі',
        completed: '✅ Завершено',
        cancelled: '❌ Скасовано'
    };
    return texts[status] || status;
}

function getPriorityText(priority) {
    const texts = {
        high: '🔴 Високий',
        medium: '🟡 Середній',
        low: '🟢 Низький'
    };
    return texts[priority] || priority;
}

// Закрити модальне вікно
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    loadPlans();
    
    // Перевіряти прострочені плани кожні 10 хвилин
    setInterval(() => {
        const overdue = checkOverduePlans();
        if (overdue.length > 0 && localStorage.getItem('agentReminders') !== 'false') {
            console.log(`⚠️ ${overdue.length} прострочених планів`);
        }
    }, 10 * 60 * 1000);
});
