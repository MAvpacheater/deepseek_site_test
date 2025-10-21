// 🛠️ AI Agent Tools - Інструменти для автономної роботи

const AgentTools = {
    // 📝 Інструмент аналізу тексту
    textAnalyzer: {
        name: 'Text Analyzer',
        description: 'Аналізує текст та витягує ключову інформацію',
        
        async execute(text) {
            const analysis = {
                length: text.length,
                words: text.split(/\s+/).length,
                sentences: text.split(/[.!?]+/).length,
                keywords: this.extractKeywords(text),
                sentiment: this.analyzeSentiment(text)
            };
            
            return analysis;
        },
        
        extractKeywords(text) {
            // Прості ключові слова (можна покращити через AI)
            const words = text.toLowerCase()
                .replace(/[^\w\s\u0400-\u04FF]/g, '')
                .split(/\s+/);
            
            const stopWords = ['і', 'в', 'на', 'з', 'до', 'це', 'як', 'що', 'та'];
            const filtered = words.filter(w => !stopWords.includes(w) && w.length > 3);
            
            const freq = {};
            filtered.forEach(word => {
                freq[word] = (freq[word] || 0) + 1;
            });
            
            return Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
        },
        
        analyzeSentiment(text) {
            const positive = ['добре', 'чудово', 'супер', 'класно', 'відмінно'];
            const negative = ['погано', 'жахливо', 'поганий', 'проблема'];
            
            let score = 0;
            const lowerText = text.toLowerCase();
            
            positive.forEach(word => {
                if (lowerText.includes(word)) score += 1;
            });
            
            negative.forEach(word => {
                if (lowerText.includes(word)) score -= 1;
            });
            
            return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
        }
    },

    // 🔍 Інструмент пошуку
    webSearch: {
        name: 'Web Search',
        description: 'Шукає інформацію в інтернеті (симуляція)',
        
        async execute(query) {
            // Симуляція пошуку (треба справжній API для реального пошуку)
            console.log('🔍 Пошук:', query);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return {
                query: query,
                results: [
                    { title: 'Результат 1', snippet: 'Знайдена інформація...' },
                    { title: 'Результат 2', snippet: 'Додаткові дані...' }
                ]
            };
        }
    },

    // 💾 Інструмент збереження даних
    dataStorage: {
        name: 'Data Storage',
        description: 'Зберігає та завантажує дані',
        
        async execute(action, key, value) {
            if (action === 'save') {
                localStorage.setItem(`agent_data_${key}`, JSON.stringify(value));
                return { success: true, message: 'Дані збережено' };
            } else if (action === 'load') {
                const data = localStorage.getItem(`agent_data_${key}`);
                return data ? JSON.parse(data) : null;
            } else if (action === 'delete') {
                localStorage.removeItem(`agent_data_${key}`);
                return { success: true, message: 'Дані видалено' };
            }
        }
    },

    // 📊 Інструмент аналізу коду
    codeAnalyzer: {
        name: 'Code Analyzer',
        description: 'Аналізує код на помилки та якість',
        
        async execute(code, language) {
            const analysis = {
                language: language,
                lines: code.split('\n').length,
                issues: [],
                suggestions: []
            };
            
            // Базовий аналіз
            if (language === 'javascript') {
                if (code.includes('var ')) {
                    analysis.issues.push('Використовується var замість let/const');
                }
                if (code.match(/console\.log/g)?.length > 3) {
                    analysis.suggestions.push('Забагато console.log - прибери для production');
                }
            }
            
            if (language === 'html' && !code.includes('<!DOCTYPE')) {
                analysis.issues.push('Відсутній DOCTYPE');
            }
            
            analysis.quality = analysis.issues.length === 0 ? 'good' : 'needs_improvement';
            
            return analysis;
        }
    },

    // 🎨 Інструмент генерації контенту
    contentGenerator: {
        name: 'Content Generator',
        description: 'Генерує різні типи контенту',
        
        async execute(type, params) {
            if (type === 'readme') {
                return this.generateReadme(params);
            } else if (type === 'gitignore') {
                return this.generateGitignore(params);
            } else if (type === 'package_json') {
                return this.generatePackageJson(params);
            }
        },
        
        generateReadme({ projectName, description }) {
            return `# ${projectName}

${description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## License

MIT
`;
        },
        
        generateGitignore(language) {
            const templates = {
                javascript: 'node_modules/\n.env\ndist/\nbuild/\n*.log',
                python: '__pycache__/\n*.py[cod]\nvenv/\n.env\n*.log',
                java: '*.class\ntarget/\n.idea/\n*.jar'
            };
            
            return templates[language] || 'node_modules/\n.env\n*.log';
        },
        
        generatePackageJson({ name, description, version = '1.0.0' }) {
            return JSON.stringify({
                name: name,
                version: version,
                description: description,
                main: 'index.js',
                scripts: {
                    start: 'node index.js',
                    test: 'echo "No tests yet"'
                },
                keywords: [],
                author: '',
                license: 'MIT'
            }, null, 2);
        }
    },

    // 📅 Інструмент планування
    taskPlanner: {
        name: 'Task Planner',
        description: 'Планує та розбиває завдання на підзавдання',
        
        async execute(task) {
            const steps = [];
            
            // Аналіз завдання
            if (task.toLowerCase().includes('створ')) {
                steps.push('Проаналізувати вимоги');
                steps.push('Створити структуру');
                steps.push('Написати код');
                steps.push('Протестувати');
            } else if (task.toLowerCase().includes('виправ')) {
                steps.push('Знайти проблему');
                steps.push('Проаналізувати причину');
                steps.push('Виправити код');
                steps.push('Перевірити виправлення');
            } else {
                steps.push('Розібратись з завданням');
                steps.push('Виконати основну роботу');
                steps.push('Перевірити результат');
            }
            
            return steps.map((step, index) => ({
                id: index + 1,
                description: step,
                status: 'pending',
                estimatedTime: '5-10 хв'
            }));
        }
    },

    // 🔔 Інструмент нагадувань
    reminderSystem: {
        name: 'Reminder System',
        description: 'Створює та відслідковує нагадування',
        
        reminders: [],
        
        async execute(action, params) {
            if (action === 'create') {
                return this.createReminder(params);
            } else if (action === 'list') {
                return this.listReminders();
            } else if (action === 'check') {
                return this.checkReminders();
            }
        },
        
        createReminder({ text, time, priority = 'medium' }) {
            const reminder = {
                id: Date.now(),
                text: text,
                time: new Date(time),
                priority: priority,
                active: true,
                created: new Date()
            };
            
            this.reminders.push(reminder);
            this.saveReminders();
            
            // Встановити таймер
            const now = Date.now();
            const reminderTime = new Date(time).getTime();
            
            if (reminderTime > now) {
                setTimeout(() => {
                    this.triggerReminder(reminder);
                }, reminderTime - now);
            }
            
            return reminder;
        },
        
        listReminders() {
            return this.reminders.filter(r => r.active);
        },
        
        checkReminders() {
            const now = Date.now();
            return this.reminders.filter(r => 
                r.active && new Date(r.time).getTime() <= now
            );
        },
        
        triggerReminder(reminder) {
            const priority = reminder.priority === 'high' ? '🔴' : 
                           reminder.priority === 'medium' ? '🟡' : '🟢';
            
            alert(`${priority} Нагадування!\n\n${reminder.text}`);
            
            reminder.active = false;
            this.saveReminders();
        },
        
        saveReminders() {
            localStorage.setItem('agent_reminders', JSON.stringify(this.reminders));
        },
        
        loadReminders() {
            const saved = localStorage.getItem('agent_reminders');
            if (saved) {
                this.reminders = JSON.parse(saved);
            }
        }
    },

    // 🧮 Інструмент обчислень
    calculator: {
        name: 'Calculator',
        description: 'Виконує математичні обчислення',
        
        async execute(expression) {
            try {
                // Безпечний eval (тільки для чисел та базових операцій)
                const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
                const result = Function(`'use strict'; return (${sanitized})`)();
                
                return {
                    expression: expression,
                    result: result,
                    success: true
                };
            } catch (error) {
                return {
                    expression: expression,
                    error: error.message,
                    success: false
                };
            }
        }
    }
};

// Ініціалізація інструментів
window.addEventListener('DOMContentLoaded', () => {
    AgentTools.reminderSystem.loadReminders();
    console.log('🛠️ Agent Tools завантажено');
});

// Експорт для використання
window.AgentTools = AgentTools;
