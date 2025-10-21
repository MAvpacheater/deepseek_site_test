// 🤖 AI Agent Core - Ядро автономного агента

class AIAgent {
    constructor() {
        this.isActive = false;
        this.currentTask = null;
        this.taskQueue = [];
        this.memory = [];
        this.tools = [];
        this.autonomousMode = false;
    }

    // Активувати агента
    activate() {
        this.isActive = true;
        this.updateStatus();
        console.log('🤖 Агент активовано');
    }

    // Деактивувати агента
    deactivate() {
        this.isActive = false;
        this.currentTask = null;
        this.updateStatus();
        console.log('🤖 Агент деактивовано');
    }

    // Оновити статус агента в UI
    updateStatus() {
        const statusDiv = document.getElementById('agentStatus');
        if (!statusDiv) return;

        const activeTasksSpan = document.getElementById('activeTasks');
        const memoryCountSpan = document.getElementById('memoryCount');

        if (activeTasksSpan) {
            activeTasksSpan.textContent = this.taskQueue.length;
        }

        if (memoryCountSpan) {
            memoryCountSpan.textContent = this.memory.length;
        }

        // Анімація пульсу
        const pulse = statusDiv.querySelector('.pulse');
        if (pulse) {
            pulse.style.animation = this.isActive ? 
                'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none';
        }
    }

    // Додати завдання в чергу
    addTask(task) {
        const taskObj = {
            id: Date.now(),
            description: task,
            status: 'pending',
            createdAt: new Date(),
            steps: []
        };

        this.taskQueue.push(taskObj);
        this.updateStatus();
        
        if (this.autonomousMode) {
            this.executeNextTask();
        }

        return taskObj;
    }

    // Виконати наступне завдання
    async executeNextTask() {
        if (this.taskQueue.length === 0) return;

        const task = this.taskQueue[0];
        this.currentTask = task;
        task.status = 'in_progress';

        console.log('🤖 Виконую завдання:', task.description);

        try {
            // Розбити завдання на кроки
            const steps = await this.planTask(task.description);
            task.steps = steps;

            // Виконати кожен крок
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                console.log(`  📌 Крок ${i + 1}/${steps.length}:`, step.action);
                
                await this.executeStep(step);
                step.completed = true;
            }

            task.status = 'completed';
            this.taskQueue.shift();
            
            // Запам'ятати успішне виконання
            this.addMemory({
                type: 'task_completed',
                task: task.description,
                date: new Date()
            });

            console.log('✅ Завдання виконано:', task.description);

        } catch (error) {
            console.error('❌ Помилка виконання:', error);
            task.status = 'failed';
            task.error = error.message;
        }

        this.currentTask = null;
        this.updateStatus();

        // Продовжити з наступним завданням
        if (this.autonomousMode && this.taskQueue.length > 0) {
            setTimeout(() => this.executeNextTask(), 1000);
        }
    }

    // Розбити завдання на кроки (планування)
    async planTask(taskDescription) {
        // Базове планування (можна покращити через API)
        const steps = [];

        if (taskDescription.toLowerCase().includes('створ') || 
            taskDescription.toLowerCase().includes('зроб')) {
            steps.push({ action: 'analyze_requirements', tool: 'analyzer' });
            steps.push({ action: 'generate_code', tool: 'deepseek' });
            steps.push({ action: 'test_code', tool: 'analyzer' });
        } else if (taskDescription.toLowerCase().includes('знайд') || 
                   taskDescription.toLowerCase().includes('пошук')) {
            steps.push({ action: 'search', tool: 'search' });
            steps.push({ action: 'analyze_results', tool: 'gemini' });
        } else {
            steps.push({ action: 'process', tool: 'gemini' });
        }

        return steps;
    }

    // Виконати один крок
    async executeStep(step) {
        // Симуляція виконання (інтеграція з реальними інструментами)
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    }

    // Додати спогад
    addMemory(memory) {
        const memoryObj = {
            id: Date.now(),
            ...memory,
            timestamp: new Date()
        };

        this.memory.unshift(memoryObj);
        
        // Обмежити до 100 спогадів
        if (this.memory.length > 100) {
            this.memory = this.memory.slice(0, 100);
        }

        this.saveMemoryToStorage();
        this.updateStatus();

        return memoryObj;
    }

    // Пошук в пам'яті
    searchMemory(query) {
        const lowerQuery = query.toLowerCase();
        return this.memory.filter(mem => {
            const content = JSON.stringify(mem).toLowerCase();
            return content.includes(lowerQuery);
        });
    }

    // Зберегти пам'ять
    saveMemoryToStorage() {
        localStorage.setItem('agent_memory', JSON.stringify(this.memory));
    }

    // Завантажити пам'ять
    loadMemoryFromStorage() {
        const saved = localStorage.getItem('agent_memory');
        if (saved) {
            this.memory = JSON.parse(saved);
        }
        this.updateStatus();
    }

    // Очистити пам'ять
    clearMemory() {
        this.memory = [];
        localStorage.removeItem('agent_memory');
        this.updateStatus();
    }
}

// Глобальний екземпляр агента
const agent = new AIAgent();

// Ініціалізація агента
window.addEventListener('DOMContentLoaded', () => {
    agent.loadMemoryFromStorage();
    agent.activate();
});

// Функції для UI
function enableAgentMode() {
    const currentValue = agent.autonomousMode;
    agent.autonomousMode = !currentValue;
    
    const btn = event.target;
    if (agent.autonomousMode) {
        btn.style.background = 'rgba(34, 197, 94, 0.3)';
        btn.textContent = '🤖 Агент (Увімкнено)';
        alert('✅ Автономний режим увімкнено!\n\nАгент тепер сам виконуватиме завдання.');
    } else {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
        btn.textContent = '🤖 Агент';
        alert('ℹ️ Автономний режим вимкнено.');
    }
}

function addAgentTask() {
    const task = prompt('🤖 Яке завдання дати агенту?');
    if (!task) return;

    agent.addTask(task);
    alert(`✅ Завдання додано в чергу!\n\nВсього завдань: ${agent.taskQueue.length}`);
}
