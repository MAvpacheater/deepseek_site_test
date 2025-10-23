// GitHub Repository Import & Enhancement Module

let githubToken = null;
let currentRepo = null;

// 🐙 Імпорт репозиторія з GitHub
async function importFromGitHub() {
    const repoUrl = prompt(
        '🐙 Введіть URL GitHub репозиторія:\n\n' +
        'Формат: https://github.com/username/repo\n' +
        'або: username/repo',
        ''
    );
    
    if (!repoUrl) return;
    
    // Парсинг URL
    let owner, repo;
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
        owner = match[1];
        repo = match[2].replace('.git', '');
    } else {
        const parts = repoUrl.split('/');
        if (parts.length === 2) {
            owner = parts[0];
            repo = parts[1];
        } else {
            alert('❌ Невірний формат URL!');
            return;
        }
    }
    
    showLoadingOverlay('Завантаження репозиторія...');
    
    try {
        // Отримати структуру репозиторія
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        const headers = githubToken ? { 'Authorization': `token ${githubToken}` } : {};
        
        let response = await fetch(treeUrl, { headers });
        
        // Якщо main не знайдена, спробувати master
        if (!response.ok) {
            const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            response = await fetch(masterUrl, { headers });
        }
        
        if (!response.ok) {
            throw new Error('Не вдалося завантажити репозиторій. Можливо він приватний?');
        }
        
        const data = await response.json();
        const files = data.tree.filter(item => item.type === 'blob');
        
        // Фільтрувати тільки потрібні файли
        const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'];
        const codeFiles = files.filter(file => 
            allowedExtensions.some(ext => file.path.endsWith(ext)) &&
            !file.path.includes('node_modules') &&
            !file.path.includes('.git') &&
            !file.path.includes('dist') &&
            !file.path.includes('build')
        );
        
        if (codeFiles.length === 0) {
            throw new Error('У репозиторії не знайдено файлів з кодом!');
        }
        
        // Обмежити кількість файлів
        const filesToLoad = codeFiles.slice(0, 20);
        
        if (codeFiles.length > 20) {
            if (!confirm(`⚠️ Знайдено ${codeFiles.length} файлів.\n\nЗавантажити перші 20?`)) {
                hideLoadingOverlay();
                return;
            }
        }
        
        // Завантажити вміст файлів
        updateLoadingOverlay(`Завантаження ${filesToLoad.length} файлів...`);
        
        for (let i = 0; i < filesToLoad.length; i++) {
            const file = filesToLoad[i];
            updateLoadingOverlay(`Завантаження ${i + 1}/${filesToLoad.length}: ${file.path}`);
            
            const contentUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}`;
            let contentResponse = await fetch(contentUrl);
            
            if (!contentResponse.ok) {
                const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${file.path}`;
                contentResponse = await fetch(masterUrl);
            }
            
            if (contentResponse.ok) {
                const content = await contentResponse.text();
                const ext = file.path.split('.').pop();
                const language = getLanguageFromExtension(ext);
                
                window.codeFiles[file.path] = {
                    language: language,
                    code: content
                };
            }
        }
        
        currentRepo = { owner, repo, files: filesToLoad.length };
        
        hideLoadingOverlay();
        
        // Перемкнутись на DeepSeek режим
        switchMode('deepseek');
        displayCodeFiles();
        
        // Додати повідомлення про успішний імпорт
        addGitHubImportMessage(owner, repo, filesToLoad.length);
        
        alert(`✅ Репозиторій успішно завантажено!\n\n📁 Завантажено ${filesToLoad.length} файлів\n\nТепер можеш аналізувати, редагувати та покращувати код!`);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Помилка:', error);
        alert('❌ Помилка імпорту: ' + error.message);
    }
}

// Додати повідомлення про імпорт
function addGitHubImportMessage(owner, repo, filesCount) {
    const messagesDiv = document.getElementById('deepseekMessages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.style.background = 'linear-gradient(135deg, #2ea043 0%, #238636 100%)';
    messageDiv.style.padding = '20px';
    messageDiv.style.borderRadius = '12px';
    messageDiv.style.color = 'white';
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 48px;">🐙</div>
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                    Репозиторій імпортовано з GitHub
                </div>
                <div style="opacity: 0.9; font-size: 14px; margin-bottom: 8px;">
                    📦 ${owner}/${repo}
                </div>
                <div style="opacity: 0.9; font-size: 14px;">
                    📁 Завантажено ${filesCount} файлів
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 13px; font-weight: 500; margin-bottom: 8px;">💡 Що можна зробити:</div>
                    <div style="font-size: 12px; opacity: 0.9; line-height: 1.6;">
                        • Проаналізувати код на помилки 🔍<br>
                        • Рефакторинг та оптимізація 🎯<br>
                        • Додати тести 🧪<br>
                        • Покращити документацію 📚<br>
                        • Перевірити безпеку 🛡️
                    </div>
                </div>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Визначити мову програмування за розширенням
function getLanguageFromExtension(ext) {
    const languages = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'scss': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby'
    };
    return languages[ext] || 'plaintext';
}

// 🔧 Швидкі дії для імпортованого коду
async function analyzeImportedCode() {
    if (!currentRepo) {
        alert('⚠️ Спочатку імпортуй репозиторій!');
        return;
    }
    
    const action = prompt(
        '🔍 Виберіть дію для аналізу:\n\n' +
        '1 - Загальний аналіз якості коду\n' +
        '2 - Знайти потенційні баги\n' +
        '3 - Аналіз безпеки\n' +
        '4 - Перевірка продуктивності\n' +
        '5 - Аналіз архітектури\n' +
        '6 - Code review',
        '1'
    );
    
    const prompts = {
        '1': 'Проаналізуй якість цього коду. Оціни читабельність, підтримуваність, дотримання best practices. Дай загальну оцінку та рекомендації.',
        '2': 'Знайди всі потенційні баги, помилки логіки, edge cases які не обробляються. Поясни кожну знайдену проблему.',
        '3': 'Проаналізуй код на предмет вразливостей безпеки: XSS, SQL injection, небезпечні функції, витоки даних.',
        '4': 'Знайди bottlenecks та неоптимальні фрагменти коду. Запропонуй оптимізації для покращення продуктивності.',
        '5': 'Проаналізуй архітектуру проекту: структуру файлів, залежності, separation of concerns, SOLID принципи.',
        '6': 'Зроби детальний code review як досвідчений розробник. Вкажи на проблеми, запропонуй покращення.'
    };
    
    const promptText = prompts[action] || prompts['1'];
    
    // Підготувати контекст з файлами
    let codeContext = `📁 Репозиторій: ${currentRepo.owner}/${currentRepo.repo}\n\n`;
    
    Object.keys(window.codeFiles).forEach(filename => {
        const file = window.codeFiles[filename];
        codeContext += `\n--- ${filename} ---\n${file.code}\n`;
    });
    
    // Обмежити розмір контексту
    if (codeContext.length > 15000) {
        codeContext = codeContext.substring(0, 15000) + '\n\n... (код скорочено)';
    }
    
    const fullPrompt = `${promptText}\n\n${codeContext}`;
    
    // Відправити в DeepSeek
    document.getElementById('deepseekInput').value = fullPrompt;
    await sendDeepseekMessage();
}

// 🎯 Покращити конкретний файл
async function enhanceFile() {
    if (Object.keys(window.codeFiles).length === 0) {
        alert('⚠️ Немає файлів для покращення!');
        return;
    }
    
    const files = Object.keys(window.codeFiles);
    let fileList = '🎯 Виберіть файл для покращення:\n\n';
    files.forEach((file, i) => {
        fileList += `${i + 1}. ${file}\n`;
    });
    
    const choice = prompt(fileList, '1');
    if (!choice) return;
    
    const index = parseInt(choice) - 1;
    if (index < 0 || index >= files.length) {
        alert('❌ Невірний вибір!');
        return;
    }
    
    const filename = files[index];
    const file = window.codeFiles[filename];
    
    const action = prompt(
        `📝 Що зробити з ${filename}?\n\n` +
        '1 - Рефакторинг (покращити структуру)\n' +
        '2 - Додати коментарі та документацію\n' +
        '3 - Оптимізувати продуктивність\n' +
        '4 - Модернізувати синтаксис (ES6+)\n' +
        '5 - Додати обробку помилок\n' +
        '6 - Покращити безпеку',
        '1'
    );
    
    const prompts = {
        '1': `Зроби рефакторинг цього файлу. Покращ структуру, видали дублювання, зроби код більш читабельним:\n\n${file.code}`,
        '2': `Додай детальні коментарі та JSDoc документацію до цього коду:\n\n${file.code}`,
        '3': `Оптимізуй цей код для кращої продуктивності. Знайди та виправ bottlenecks:\n\n${file.code}`,
        '4': `Модернізуй цей код використовуючи сучасний ES6+ синтаксис (стрілочні функції, деструктуризація, async/await):\n\n${file.code}`,
        '5': `Додай proper обробку помилок, валідацію вхідних даних та try-catch блоки:\n\n${file.code}`,
        '6': `Покращ безпеку цього коду. Виправ вразливості, додай санітизацію даних:\n\n${file.code}`
    };
    
    const promptText = prompts[action] || prompts['1'];
    
    document.getElementById('deepseekInput').value = promptText;
    await sendDeepseekMessage();
}

// 📊 Порівняти з іншим репозиторієм
async function compareRepositories() {
    if (!currentRepo) {
        alert('⚠️ Спочатку імпортуй перший репозиторій!');
        return;
    }
    
    const repo2Url = prompt(
        '📊 Введіть URL другого репозиторія для порівняння:\n\n' +
        '(Буде порівняно архітектуру, підходи, якість коду)',
        ''
    );
    
    if (!repo2Url) return;
    
    alert('🚧 Функція порівняння репозиторіїв у розробці!\n\nНаразі ти можеш:\n1. Імпортувати другий репозиторій\n2. Попросити DeepSeek порівняти їх');
}

// 💾 Експортувати покращений код назад
async function exportToGitHub() {
    if (Object.keys(window.codeFiles).length === 0) {
        alert('⚠️ Немає коду для експорту!');
        return;
    }
    
    const action = confirm(
        '💾 Експорт покращеного коду\n\n' +
        'ОК - Завантажити ZIP\n' +
        'Скасувати - Показати інструкції для GitHub'
    );
    
    if (action) {
        // Завантажити ZIP
        await downloadAllAsZip();
    } else {
        // Показати інструкції
        const instructions = `
🐙 Як оновити GitHub репозиторій:

1️⃣ Завантаж покращені файли (кнопка 📦 ZIP)

2️⃣ Розпакуй архів локально

3️⃣ У терміналі виконай:
   cd path/to/your/repo
   git add .
   git commit -m "🤖 AI-enhanced code improvements"
   git push origin main

4️⃣ Або створи Pull Request:
   git checkout -b ai-improvements
   git push origin ai-improvements
   # Потім створи PR на GitHub

💡 Порада: Перевір зміни перед комітом!
        `;
        
        alert(instructions);
    }
}

// Показати завантажувальний overlay
function showLoadingOverlay(message) {
    let overlay = document.getElementById('github-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'github-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">🐙</div>
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 10px;" id="loading-title">Завантаження...</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.7);" id="loading-subtitle"></div>
            <div style="margin-top: 30px;">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    document.getElementById('loading-title').textContent = message;
    overlay.style.display = 'flex';
}

function updateLoadingOverlay(message) {
    const subtitle = document.getElementById('loading-subtitle');
    if (subtitle) {
        subtitle.textContent = message;
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('github-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Налаштування GitHub токену (опціонально)
function setupGitHubToken() {
    const currentToken = githubToken || localStorage.getItem('github_token') || '';
    
    const token = prompt(
        '🔑 GitHub Personal Access Token (опціонально)\n\n' +
        'Дозволяє:\n' +
        '• Доступ до приватних репозиторіїв\n' +
        '• Більше API запитів\n\n' +
        'Отримати токен: Settings → Developer settings → Personal access tokens\n\n' +
        'Залиш порожнім для публічних репозиторіїв',
        currentToken
    );
    
    if (token !== null) {
        githubToken = token;
        if (token) {
            localStorage.setItem('github_token', token);
            alert('✅ GitHub токен збережено!');
        } else {
            localStorage.removeItem('github_token');
            alert('ℹ️ Токен видалено. Доступні тільки публічні репозиторії.');
        }
    }
}

// Ініціалізація GitHub Import UI
function initializeGitHubImport() {
    const codeHeader = document.querySelector('.code-header');
    if (!codeHeader) return;
    
    // Видалити якщо вже існує
    const existing = document.getElementById('github-import-buttons');
    if (existing) existing.remove();
    
    const githubDiv = document.createElement('div');
    githubDiv.id = 'github-import-buttons';
    githubDiv.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
    `;
    
    const buttonStyle = `
        background: rgba(46, 160, 67, 0.2);
        color: white;
        border: 1px solid #2ea043;
        padding: 8px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
    
    githubDiv.innerHTML = `
        <button onclick="importFromGitHub()" title="Імпортувати репозиторій з GitHub" style="${buttonStyle}">
            🐙 Імпорт з GitHub
        </button>
        <button onclick="analyzeImportedCode()" title="Аналізувати код" style="${buttonStyle}">
            🔍 Аналізувати
        </button>
        <button onclick="enhanceFile()" title="Покращити файл" style="${buttonStyle}">
            ✨ Покращити
        </button>
        <button onclick="exportToGitHub()" title="Експортувати назад" style="${buttonStyle}">
            📤 Експорт
        </button>
        <button onclick="setupGitHubToken()" title="Налаштувати GitHub токен" style="${buttonStyle}">
            🔑 Токен
        </button>
    `;
    
    // Додати hover ефект
    githubDiv.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseover', function() {
            this.style.background = 'rgba(46, 160, 67, 0.3)';
            this.style.transform = 'translateY(-1px)';
        });
        btn.addEventListener('mouseout', function() {
            this.style.background = 'rgba(46, 160, 67, 0.2)';
            this.style.transform = 'translateY(0)';
        });
    });
    
    codeHeader.appendChild(githubDiv);
    
    // Завантажити токен якщо є
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        githubToken = savedToken;
    }
}

// Автоматична ініціалізація при завантаженні
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGitHubImport);
} else {
    initializeGitHubImport();
}
