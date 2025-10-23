// 🐙 GitHub Integration - Імпорт репозиторіїв з GitHub

let githubToken = localStorage.getItem('github_token') || null;
let currentRepoInfo = null;

// Налаштування GitHub токену
function setupGitHubToken() {
    const currentToken = githubToken || '';
    
    const token = prompt(
        '🔑 GitHub Personal Access Token (опціонально)\n\n' +
        'Для доступу до приватних репозиторіїв\n\n' +
        'Отримати: GitHub → Settings → Developer settings → Personal access tokens\n\n' +
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
            alert('ℹ️ Токен видалено');
        }
    }
}

// Імпорт репозиторія з GitHub
async function importFromGitHub() {
    const repoUrl = prompt(
        '🐙 Введіть URL GitHub репозиторія:\n\n' +
        'Приклади:\n' +
        '• https://github.com/username/repo\n' +
        '• username/repo',
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
        if (parts.length >= 2) {
            owner = parts[0];
            repo = parts[1];
        } else {
            alert('❌ Невірний формат URL!');
            return;
        }
    }
    
    showLoadingOverlay(`📥 Завантаження ${owner}/${repo}...`);
    
    try {
        const headers = githubToken ? { 
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        } : {};
        
        // Спробувати main, потім master
        let treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        let response = await fetch(treeUrl, { headers });
        
        if (!response.ok) {
            treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            response = await fetch(treeUrl, { headers });
        }
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Rate limit exceeded. Додай GitHub токен у налаштуваннях.');
            }
            throw new Error('Репозиторій не знайдено або він приватний.');
        }
        
        const data = await response.json();
        const allFiles = data.tree.filter(item => item.type === 'blob');
        
        // Фільтрувати файли з кодом
        const allowedExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss',
            '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb',
            '.json', '.xml', '.sql', '.md', '.vue', '.svelte'
        ];
        
        const codeFilesFiltered = allFiles.filter(file => {
            const hasExt = allowedExtensions.some(ext => file.path.endsWith(ext));
            const notIgnored = !file.path.includes('node_modules') &&
                             !file.path.includes('.git') &&
                             !file.path.includes('dist') &&
                             !file.path.includes('build') &&
                             !file.path.includes('.next') &&
                             !file.path.includes('package-lock.json');
            return hasExt && notIgnored;
        });
        
        if (codeFilesFiltered.length === 0) {
            throw new Error('У репозиторії не знайдено файлів з кодом!');
        }
        
        // Обмежити до 50 файлів
        const MAX_FILES = 50;
        const filesToLoad = codeFilesFiltered.slice(0, MAX_FILES);
        
        if (codeFilesFiltered.length > MAX_FILES) {
            const proceed = confirm(
                `⚠️ Знайдено ${codeFilesFiltered.length} файлів.\n\n` +
                `Завантажити перші ${MAX_FILES}?\n\nТа/Ні`
            );
            if (!proceed) {
                hideLoadingOverlay();
                return;
            }
        }
        
        // Очистити попередні файли
        if (typeof window.codeFiles !== 'undefined') {
            window.codeFiles = {};
        } else {
            window.codeFiles = {};
        }
        
        // Завантажити файли
        for (let i = 0; i < filesToLoad.length; i++) {
            const file = filesToLoad[i];
            updateLoadingOverlay(`${i + 1}/${filesToLoad.length}: ${file.path}`);
            
            const branch = 'main';
            let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            let fileResponse = await fetch(rawUrl);
            
            if (!fileResponse.ok) {
                rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${file.path}`;
                fileResponse = await fetch(rawUrl);
            }
            
            if (fileResponse.ok) {
                const content = await fileResponse.text();
                const ext = file.path.split('.').pop();
                const language = getLanguageFromExtension(ext);
                
                window.codeFiles[file.path] = {
                    language: language,
                    code: content,
                    size: content.length,
                    modified: false
                };
            }
            
            // Затримка для запобігання rate limit
            await new Promise(r => setTimeout(r, 50));
        }
        
        currentRepoInfo = {
            owner: owner,
            repo: repo,
            branch: 'main',
            filesCount: filesToLoad.length,
            url: `https://github.com/${owner}/${repo}`
        };
        
        // Зберегти у projectContext для deepseek.js
        if (typeof window.projectContext !== 'undefined') {
            window.projectContext = currentRepoInfo;
        }
        
        hideLoadingOverlay();
        
        // Перейти на DeepSeek
        if (typeof displayCodeFiles === 'function') {
            displayCodeFiles();
        }
        switchMode('deepseek');
        
        // Показати повідомлення про успіх
        addGitHubSuccessMessage(owner, repo, filesToLoad.length);
        
        alert(`✅ GitHub імпорт успішний!\n\n📁 ${filesToLoad.length} файлів завантажено\n📍 ${owner}/${repo}`);
        
        // Запам'ятати
        if (typeof agent !== 'undefined' && agent) {
            agent.addMemory({
                type: 'github_imported',
                repo: `${owner}/${repo}`,
                filesCount: filesToLoad.length,
                date: new Date()
            });
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('GitHub помилка:', error);
        alert('❌ Помилка імпорту:\n' + error.message);
    }
}

// Визначити мову за розширенням
function getLanguageFromExtension(ext) {
    const map = {
        'js': 'javascript', 'jsx': 'javascript',
        'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python',
        'html': 'html', 'htm': 'html',
        'css': 'css', 'scss': 'css',
        'java': 'java',
        'cpp': 'cpp', 'c': 'c',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'json': 'json',
        'xml': 'xml',
        'sql': 'sql',
        'md': 'markdown',
        'vue': 'html',
        'svelte': 'html'
    };
    return map[ext.toLowerCase()] || 'plaintext';
}

// Добавити повідомлення про успішний імпорт
function addGitHubSuccessMessage(owner, repo, count) {
    const messagesDiv = document.getElementById('deepseekMessages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.style.cssText = `
        background: linear-gradient(135deg, #2ea043 0%, #238636 100%);
        padding: 20px;
        border-radius: 12px;
        color: white;
        margin-bottom: 20px;
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center;">
            <div style="font-size: 48px;">🐙</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px;">Репозиторій імпортовано з GitHub</h3>
                <p style="margin: 0 0 8px 0; opacity: 0.9;">📦 ${owner}/${repo}</p>
                <p style="margin: 0 0 12px 0; opacity: 0.9;">📁 ${count} файлів</p>
                <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">💡 Тепер можеш:</p>
                    <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.8;">
                        <li>Редагувати кілька файлів одночасно</li>
                        <li>Аналізувати код на помилки</li>
                        <li>Рефакторити та оптимізувати</li>
                        <li>Генерувати тести</li>
                        <li>Додавати нові функції</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Аналізувати імпортований код
async function analyzeImportedCode() {
    if (!currentRepoInfo) {
        alert('⚠️ Спочатку імпортуй репозиторій!');
        return;
    }
    
    if (!window.codeFiles || Object.keys(window.codeFiles).length === 0) {
        alert('⚠️ Немає файлів для аналізу!');
        return;
    }
    
    const action = prompt(
        '🔍 Виберіть тип аналізу:\n\n' +
        '1 - Якість коду\n' +
        '2 - Потенційні баги\n' +
        '3 - Безпека\n' +
        '4 - Архітектура\n' +
        '5 - Best Practices',
        '1'
    );
    
    const prompts = {
        '1': `Проаналізуй якість кодової бази репозиторія ${currentRepoInfo.repo}. Оціни читабельність, структуру, best practices.`,
        '2': `Знайди всі потенційні баги та проблеми в коді ${currentRepoInfo.repo}`,
        '3': `Проведи аналіз безпеки кодової бази ${currentRepoInfo.repo}. Шукай вразливості.`,
        '4': `Проаналізуй архітектуру проекту ${currentRepoInfo.repo}. Оціни розділення на компоненти.`,
        '5': `Перевір код на відповідність best practices та сучасним патернам.`
    };
    
    const prompt = prompts[action] || prompts['1'];
    
    // Відправити в чат
    const input = document.getElementById('deepseekInput');
    if (input) {
        input.value = prompt;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        
        if (typeof sendDeepseekMessage === 'function') {
            await sendDeepseekMessage();
        }
    }
}

// Експортувати назад на GitHub (інструкції)
function exportToGitHub() {
    if (!currentRepoInfo) {
        alert('⚠️ Спочатку імпортуй репозиторій!');
        return;
    }
    
    if (!window.codeFiles || Object.keys(window.codeFiles).length === 0) {
        alert('⚠️ Немає файлів для експорту!');
        return;
    }
    
    const action = confirm(
        '💾 Експорт покращеного коду\n\n' +
        'ОК - Завантажити ZIP\n' +
        'Скасувати - Показати інструкції'
    );
    
    if (action) {
        if (typeof downloadAllAsZip === 'function') {
            downloadAllAsZip();
        }
    } else {
        const instructions = `
🐙 Як оновити GitHub репозиторій:

1️⃣ Завантаж ZIP з покращеними файлами

2️⃣ Розпакуй та замініть оригінальні файли

3️⃣ У терміналі:
   cd path/to/repo
   git add .
   git commit -m "🤖 AI improvements"
   git push origin main

4️⃣ Або створи Pull Request:
   git checkout -b ai-improvements
   git push origin ai-improvements
   # На GitHub створи PR

💡 Рекомендація: перевір зміни перед комітом!
        `;
        alert(instructions);
    }
}

// Показати loading overlay
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
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 10px;" id="github-loading-title">Завантаження...</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.7);" id="github-loading-subtitle"></div>
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
    
    const title = document.getElementById('github-loading-title');
    if (title) title.textContent = message;
    
    overlay.style.display = 'flex';
}

function updateLoadingOverlay(message) {
    const subtitle = document.getElementById('github-loading-subtitle');
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

// Ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('github_token');
    if (saved) {
        githubToken = saved;
    }
    console.log('✅ GitHub Integration готова');
});

// Експорт функцій
window.importFromGitHub = importFromGitHub;
window.setupGitHubToken = setupGitHubToken;
window.analyzeImportedCode = analyzeImportedCode;
window.exportToGitHub = exportToGitHub;
