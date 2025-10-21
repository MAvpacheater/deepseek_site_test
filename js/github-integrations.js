// 🐙 GitHub Integration - Імпорт репозиторіїв з GitHub

let githubToken = null;
let currentRepoInfo = null;

// Налаштування GitHub токену
function setupGitHubToken() {
    const currentToken = githubToken || localStorage.getItem('github_token') || '';
    
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
    let owner, repo, branch = 'main';
    
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
        // Завантажити токен якщо є
        if (!githubToken) {
            const saved = localStorage.getItem('github_token');
            if (saved) githubToken = saved;
        }
        
        const headers = githubToken ? { 'Authorization': `token ${githubToken}` } : {};
        
        // Спробувати main, потім master
        let treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        let response = await fetch(treeUrl, { headers });
        
        if (!response.ok) {
            treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            response = await fetch(treeUrl, { headers });
        }
        
        if (!response.ok) {
            throw new Error('Репозиторій не знайдено. Можливо, він приватний?');
        }
        
        const data = await response.json();
        const allFiles = data.tree.filter(item => item.type === 'blob');
        
        // Фільтрувати файли з кодом
        const allowedExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss',
            '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb',
            '.json', '.xml', '.sql', '.md'
        ];
        
        const codeFilesFiltered = allFiles.filter(file => {
            const hasExt = allowedExtensions.some(ext => file.path.endsWith(ext));
            const notIgnored = !file.path.includes('node_modules') &&
                             !file.path.includes('.git') &&
                             !file.path.includes('dist') &&
                             !file.path.includes('build') &&
                             !file.path.includes('.env');
            return hasExt && notIgnored;
        });
        
        if (codeFilesFiltered.length === 0) {
            throw new Error('У репозиторії не знайдено файлів з кодом!');
        }
        
        // Обмежити до 30 файлів
        const filesToLoad = codeFilesFiltered.slice(0, 30);
        
        if (codeFilesFiltered.length > 30) {
            const proceed = confirm(
                `⚠️ Знайдено ${codeFilesFiltered.length} файлів.\n\n` +
                `Завантажити перші 30?\n\nТа/Ні`
            );
            if (!proceed) {
                hideLoadingOverlay();
                return;
            }
        }
        
        // Завантажити файли
        for (let i = 0; i < filesToLoad.length; i++) {
            const file = filesToLoad[i];
            updateLoadingOverlay(`${i + 1}/${filesToLoad.length}: ${file.path}`);
            
            let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}`;
            let fileResponse = await fetch(rawUrl);
            
            if (!fileResponse.ok) {
                rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${file.path}`;
                fileResponse = await fetch(rawUrl);
            }
            
            if (fileResponse.ok) {
                const content = await fileResponse.text();
                const ext = file.path.split('.').pop();
                const language = getLanguageFromExtension(ext);
                
                if (!window.codeFiles) window.codeFiles = {};
                
                window.codeFiles[file.path] = {
                    language: language,
                    code: content
                };
                
                if (fileManager) {
                    fileManager.addFiles({ [file.path]: { language, code: content } });
                }
            }
            
            await new Promise(r => setTimeout(r, 100)); // Затримка для запобігання rate limit
        }
        
        currentRepoInfo = {
            owner: owner,
            repo: repo,
            branch: branch,
            filesCount: filesToLoad.length,
            url: `https://github.com/${owner}/${repo}`
        };
        
        hideLoadingOverlay();
        
        // Перейти на DeepSeek
        if (displayCodeFiles) {
            displayCodeFiles();
        }
        switchMode('deepseek');
        
        // Показати повідомлення про успіх
        addGitHubSuccessMessage(owner, repo, filesToLoad.length);
        
        alert(`✅ GitHub імпорт успішний!\n\n📁 ${filesToLoad.length} файлів завантажено\n📍 ${owner}/${repo}`);
        
        // Запам'ятати
        if (agent) {
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
        'md': 'markdown'
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
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center;">
            <div style="font-size: 48px;">🐙</div>
            <div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px;">Репозиторій імпортовано</h3>
                <p style="margin: 0 0 8px 0; opacity: 0.9;">${owner}/${repo}</p>
                <p style="margin: 0; opacity: 0.8;">📁 Завантажено ${count} файлів</p>
                <div style="margin-top: 12px; font-size: 13px; line-height: 1.6;">
                    ✨ Тепер ти можеш:<br>
                    • Аналізувати код<br>
                    • Рефакторити<br>
                    • Генерувати тести<br>
                    • Документувати<br>
                    • Експортувати назад
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
    
    // Збірка контексту з файлів
    let context = `📁 Репозиторій: ${currentRepoInfo.owner}/${currentRepoInfo.repo}\n\n`;
    context += `Структура файлів:\n`;
    
    Object.keys(window.codeFiles).slice(0, 10).forEach(file => {
        context += `• ${file}\n`;
    });
    
    if (Object.keys(window.codeFiles).length > 10) {
        context += `... та ще ${Object.keys(window.codeFiles).length - 10} файлів\n`;
    }
    
    context += `\n${prompt}`;
    
    // Відправити в чат
    document.getElementById('deepseekInput').value = context;
    if (sendDeepseekMessage) {
        await sendDeepseekMessage();
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
        if (downloadAllAsZip) {
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
