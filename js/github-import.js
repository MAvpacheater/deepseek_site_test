// 🐙 GitHub Import - ВИПРАВЛЕНО

let githubToken = null;
let currentRepo = null;

async function importFromGitHub() {
    const repoUrl = prompt(
        '🐙 Введіть URL GitHub репозиторія:\n\n' +
        'Формат: https://github.com/username/repo\n' +
        'або: username/repo',
        ''
    );
    
    if (!repoUrl) return;
    
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
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        const headers = githubToken ? { 'Authorization': `token ${githubToken}` } : {};
        
        let response = await fetch(treeUrl, { headers });
        
        if (!response.ok) {
            const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            response = await fetch(masterUrl, { headers });
        }
        
        if (!response.ok) {
            throw new Error('Не вдалося завантажити репозиторій');
        }
        
        const data = await response.json();
        const files = data.tree.filter(item => item.type === 'blob');
        
        const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'];
        const codeFiles = files.filter(file => 
            allowedExtensions.some(ext => file.path.endsWith(ext)) &&
            !file.path.includes('node_modules') &&
            !file.path.includes('.git') &&
            !file.path.includes('dist') &&
            !file.path.includes('build')
        );
        
        if (codeFiles.length === 0) {
            throw new Error('У репозиторії не знайдено файлів!');
        }
        
        const filesToLoad = codeFiles.slice(0, 20);
        
        if (codeFiles.length > 20) {
            if (!confirm(`⚠️ Знайдено ${codeFiles.length} файлів.\n\nЗавантажити перші 20?`)) {
                hideLoadingOverlay();
                return;
            }
        }
        
        updateLoadingOverlay(`Завантаження ${filesToLoad.length} файлів...`);
        
        // ✅ ВИПРАВЛЕНО: Використати метод saveCodeFile через deepseekCoder
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
                
                // ✅ ВИПРАВЛЕНО: Використати deepseekCoder.saveCodeFile
                if (window.deepseekCoder) {
                    deepseekCoder.saveCodeFile(file.path, content, language);
                } else if (window.appState) {
                    appState.setCodeFile(file.path, {
                        language: language,
                        code: content,
                        size: content.length,
                        modified: false
                    });
                }
            }
        }
        
        currentRepo = { owner, repo, files: filesToLoad.length };
        
        hideLoadingOverlay();
        
        switchMode('deepseek');
        
        // ✅ ВИПРАВЛЕНО: Викликати через deepseekCoder
        if (window.deepseekCoder) {
            deepseekCoder.displayCodeFiles();
        }
        
        addGitHubImportMessage(owner, repo, filesToLoad.length);
        
        alert(`✅ Репозиторій успішно завантажено!\n\n📁 Завантажено ${filesToLoad.length} файлів`);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Помилка:', error);
        alert('❌ Помилка імпорту: ' + error.message);
    }
}

function addGitHubImportMessage(owner, repo, filesCount) {
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
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

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

function setupGitHubToken() {
    const currentToken = githubToken || localStorage.getItem('github_token') || '';
    
    const token = prompt(
        '🔑 GitHub Personal Access Token (опціонально)\n\n' +
        'Дозволяє:\n' +
        '• Доступ до приватних репозиторіїв\n' +
        '• Більше API запитів\n\n' +
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

// Ініціалізація
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            githubToken = savedToken;
        }
    });
} else {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        githubToken = savedToken;
    }
}

window.importFromGitHub = importFromGitHub;
window.setupGitHubToken = setupGitHubToken;

console.log('✅ GitHub Import loaded (FIXED)');
