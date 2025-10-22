// 🎯 Smart AI Commands - Розумні команди для роботи з кодом

const smartCommands = {
    // Аналіз проекту
    analyzeProject: {
        name: 'Аналіз проекту',
        icon: '🔍',
        prompt: () => {
            const files = Object.keys(window.codeFiles || {});
            return `Проаналізуй цей проект детально:

1. Архітектура та структура
2. Якість коду
3. Потенційні проблеми
4. Рекомендації щодо покращення

Файли в проекті: ${files.join(', ')}

Дай конкретні поради як покращити проект.`;
        }
    },

    // Рефакторинг
    refactorCode: {
        name: 'Рефакторинг коду',
        icon: '🔧',
        prompt: (filename) => {
            if (!filename) {
                const files = Object.keys(window.codeFiles || {});
                filename = files[0];
            }
            return `Зроби рефакторинг файлу ${filename}:

1. Покращ структуру та читабельність
2. Видали дублювання коду
3. Застосуй best practices
4. Оптимізуй продуктивність
5. Додай JSDoc коментарі

Поверни ТІЛЬКИ змінений код з маркером:
// FILE: ${filename}`;
        }
    },

    // Додати функцію
    addFeature: {
        name: 'Додати функцію',
        icon: '✨',
        prompt: () => {
            const feature = prompt('📝 Опиши яку функцію додати:');
            if (!feature) return null;
            
            return `Додай нову функцію: ${feature}

1. Створи новий код або оновити існуючі файли
2. Використовуй існуючу архітектуру проекту
3. Додай error handling
4. Напиши чистий, зрозумілий код
5. Додай коментарі

Для кожного файлу використовуй:
// FILE: назва_файлу.js`;
        }
    },

    // Виправити баг
    fixBug: {
        name: 'Виправити баг',
        icon: '🐛',
        prompt: () => {
            const bug = prompt('🐛 Опиши проблему:');
            if (!bug) return null;
            
            return `Виправ баг: ${bug}

1. Знайди причину проблеми
2. Запропонуй рішення
3. Поверни виправлений код
4. Поясни що було не так

Використовуй маркер:
// FILE: назва_файлу.js`;
        }
    },

    // Оптимізація
    optimizePerformance: {
        name: 'Оптимізація',
        icon: '⚡',
        prompt: (filename) => {
            if (!filename) {
                return `Оптимізуй продуктивність проекту:

1. Знайди bottlenecks
2. Покращ алгоритми
3. Оптимізуй запити та рендеринг
4. Зменши розмір бандлу

Поверни оптимізовані файли з маркерами:
// FILE: назва_файлу.js`;
            }
            
            return `Оптимізуй продуктивність файлу ${filename}:

1. Покращ алгоритми
2. Видали зайві операції
3. Використай мемоізацію де потрібно
4. Оптимізуй циклі

Поверни оптимізований код:
// FILE: ${filename}`;
        }
    },

    // Генерація тестів
    generateTests: {
        name: 'Генерувати тести',
        icon: '🧪',
        prompt: (filename) => {
            if (!filename) {
                const files = Object.keys(window.codeFiles || {})
                    .filter(f => f.endsWith('.js') || f.endsWith('.ts'));
                filename = files[0];
            }
            
            return `Створи unit тести для ${filename}:

1. Використовуй Jest
2. Покрий основні функції
3. Додай edge cases
4. Перевір error handling

Створи новий файл:
// FILE: ${filename.replace(/\.(js|ts)$/, '.test.$1')}`;
        }
    },

    // Документація
    addDocumentation: {
        name: 'Додати документацію',
        icon: '📚',
        prompt: (filename) => {
            if (!filename) {
                return `Створи повну документацію проекту:

1. README.md з описом
2. JSDoc коментарі у коді
3. Приклади використання
4. API документація

Створи файли з маркерами:
// FILE: назва_файлу.md`;
            }
            
            return `Додай детальну документацію до ${filename}:

1. JSDoc для всіх функцій
2. Опис параметрів та повернення
3. Приклади використання
4. Пояснення складних частин

Поверни файл з доданою документацією:
// FILE: ${filename}`;
        }
    },

    // Перевірка безпеки
    securityAudit: {
        name: 'Аудит безпеки',
        icon: '🛡️',
        prompt: () => {
            return `Перевір безпеку проекту:

1. XSS вразливості
2. SQL injection
3. Небезпечні функції (eval, innerHTML)
4. Витік даних
5. Незахищені API запити

Знайди всі проблеми та запропонуй виправлення.`;
        }
    },

    // Модернізація коду
    modernizeCode: {
        name: 'Модернізувати',
        icon: '🚀',
        prompt: (filename) => {
            return `Модернізуй код використовуючи сучасні практики:

1. ES6+ синтаксис (стрілочні функції, деструктуризація)
2. Async/await замість callbacks
3. Сучасні API
4. TypeScript типи (якщо потрібно)
5. Functional programming patterns

${filename ? `Файл: ${filename}` : 'Всі JavaScript файли'}

Поверни оновлений код з маркерами:
// FILE: назва_файлу.js`;
        }
    },

    // Додати типи TypeScript
    addTypeScript: {
        name: 'Додати TypeScript',
        icon: '📘',
        prompt: (filename) => {
            if (!filename) {
                return `Конвертуй JavaScript файли в TypeScript:

1. Додай типи для всіх змінних
2. Створи interfaces
3. Додай generics де потрібно
4. Строга типізація

Створи .ts файли з маркерами:
// FILE: назва_файлу.ts`;
            }
            
            const tsFilename = filename.replace('.js', '.ts');
            return `Конвертуй ${filename} в TypeScript:

1. Додай типи
2. Створи interfaces
3. Типізуй функції

Створи файл:
// FILE: ${tsFilename}`;
        }
    },

    // Покращити UI/UX
    improveUI: {
        name: 'Покращити UI',
        icon: '🎨',
        prompt: () => {
            return `Покращ UI/UX проекту:

1. Сучасний дизайн
2. Адаптивність
3. Анімації та переходи
4. Accessibility (a11y)
5. Dark mode

Оновь HTML та CSS файли з маркерами:
// FILE: назва_файлу.html
// FILE: назва_файлу.css`;
        }
    },

    // Додати API інтеграцію
    addAPI: {
        name: 'Додати API',
        icon: '🔌',
        prompt: () => {
            const apiType = prompt('🔌 Який API інтегрувати? (REST, GraphQL, WebSocket)');
            if (!apiType) return null;
            
            return `Додай ${apiType} інтеграцію:

1. Створи API client
2. Додай error handling
3. Реалізуй retry logic
4. Додай кешування
5. TypeScript типи для API

Створи файли з маркерами:
// FILE: api/client.js
// FILE: api/types.ts`;
        }
    }
};

// ========================================
// UI ДЛЯ КОМАНД
// ========================================

function showSmartCommands() {
    // Перевірка чи є завантажений проект
    const hasProject = window.codeFiles && Object.keys(window.codeFiles).length > 0;
    
    if (!hasProject) {
        alert('⚠️ Спочатку завантаж проект з GitHub або створи файли!');
        return;
    }
    
    // Створити модальне вікно
    let modal = document.getElementById('smart-commands-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smart-commands-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="
                background: var(--bg-card);
                border-radius: 16px;
                max-width: 800px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                border: 2px solid var(--accent-primary);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
                <div style="
                    padding: 20px 25px;
                    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 14px 14px 0 0;
                ">
                    <h3 style="margin: 0; font-size: 18px;">🎯 Розумні команди</h3>
                    <button onclick="closeSmartCommands()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 18px;
                    ">✕</button>
                </div>
                
                <div id="commands-grid" style="
                    padding: 20px;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                "></div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Заповнити командами
    const grid = document.getElementById('commands-grid');
    grid.innerHTML = '';
    
    Object.entries(smartCommands).forEach(([key, command]) => {
        const btn = document.createElement('button');
        btn.style.cssText = `
            background: var(--bg-secondary);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            color: var(--text-primary);
        `;
        
        btn.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">${command.icon}</div>
            <div style="font-size: 14px; font-weight: 600;">${command.name}</div>
        `;
        
        btn.onmouseover = function() {
            this.style.borderColor = 'var(--accent-primary)';
            this.style.transform = 'translateY(-2px)';
        };
        
        btn.onmouseout = function() {
            this.style.borderColor = 'var(--border-color)';
            this.style.transform = 'translateY(0)';
        };
        
        btn.onclick = () => executeSmartCommand(key);
        
        grid.appendChild(btn);
    });
    
    modal.style.display = 'flex';
}

function closeSmartCommands() {
    const modal = document.getElementById('smart-commands-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function executeSmartCommand(commandKey) {
    const command = smartCommands[commandKey];
    if (!command) return;
    
    closeSmartCommands();
    
    // Отримати активний файл якщо потрібно
    const activeFile = window.activeFile;
    
    // Генерувати prompt
    const prompt = command.prompt(activeFile);
    
    if (!prompt) return; // Користувач скасував
    
    // Вставити prompt в input
    const input = document.getElementById('deepseekInput');
    if (input) {
        input.value = prompt;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        input.focus();
        
        // Показати підказку
        showCommandHint(command.name);
    }
}

function showCommandHint(commandName) {
    const hint = document.createElement('div');
    hint.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    hint.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">✨</span>
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Команда готова!</div>
                <div style="font-size: 13px; opacity: 0.9;">${commandName}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(hint);
    
    setTimeout(() => {
        hint.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => hint.remove(), 300);
    }, 3000);
}

// ========================================
// ШВИДКІ ДІЇ
// ========================================

function quickAnalyze() {
    executeSmartCommand('analyzeProject');
}

function quickRefactor() {
    executeSmartCommand('refactorCode');
}

function quickAddFeature() {
    executeSmartCommand('addFeature');
}

function quickFixBug() {
    executeSmartCommand('fixBug');
}

// ========================================
// INITIALIZATION
// ========================================

function initializeSmartCommands() {
    // Додати кнопку в header
    const codeHeader = document.querySelector('#deepseekMode .code-header');
    if (codeHeader && !document.getElementById('smart-commands-btn')) {
        const actions = codeHeader.querySelector('.code-actions');
        if (actions) {
            const btn = document.createElement('button');
            btn.id = 'smart-commands-btn';
            btn.textContent = '🎯 Команди';
            btn.title = 'Розумні команди AI';
            btn.onclick = showSmartCommands;
            btn.style.cssText = `
                background: rgba(102, 126, 234, 0.2);
                color: white;
                border: 1px solid var(--accent-primary);
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
            `;
            actions.appendChild(btn);
        }
    }
    
    // Додати CSS для анімацій
    if (!document.getElementById('smart-commands-styles')) {
        const style = document.createElement('style');
        style.id = 'smart-commands-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Ініціалізація при завантаженні
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSmartCommands);
} else {
    initializeSmartCommands();
}

// Export
window.showSmartCommands = showSmartCommands;
window.closeSmartCommands = closeSmartCommands;
window.smartCommands = smartCommands;
