// 🐙 GitHub Integration - Інтеграція з GitHub

class GitHubIntegration {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.rawBase = 'https://raw.githubusercontent.com';
        this.token = null;
        this.rateLimit = {
            remaining: 60,
            reset: null
        };
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadToken();
        console.log('✅ GitHub Integration initialized');
    }

    loadToken() {
        this.token = localStorage.getItem('github_token') || null;
    }

    saveToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('github_token', token);
        } else {
            localStorage.removeItem('github_token');
        }
    }

    // ========================================
    // AUTHENTICATION
    // ========================================

    setToken(token) {
        this.saveToken(token);
        if (window.showToast) {
            showToast('✅ GitHub токен збережено', 'success');
        }
    }

    removeToken() {
        this.saveToken(null);
        if (window.showToast) {
            showToast('ℹ️ GitHub токен видалено', 'info');
        }
    }

    hasToken() {
        return !!this.token;
    }

    async promptForToken() {
        if (window.modalManager) {
            const token = await modalManager.prompt(
                'Введіть GitHub Personal Access Token (опціонально):\n\n' +
                '• Дозволяє доступ до приватних репозиторіїв\n' +
                '• Більше API запитів\n\n' +
                'Залиште порожнім для публічних репозиторіїв',
                {
                    title: 'GitHub Token',
                    icon: '🔑',
                    defaultValue: this.token || '',
                    placeholder: 'ghp_...'
                }
            );

            if (token !== null) {
                this.setToken(token || null);
            }
        } else {
            const token = prompt(
                '🔑 GitHub Personal Access Token (опціонально)\n\n' +
                'Залиш порожнім для публічних репозиторіїв',
                this.token || ''
            );

            if (token !== null) {
                this.setToken(token || null);
            }
        }
    }

    // ========================================
    // API REQUESTS
    // ========================================

    async fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Update rate limit
            this.updateRateLimit(response.headers);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `GitHub API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'github_api_error',
                    message: 'GitHub API request failed',
                    error: error.message,
                    severity: 'medium'
                });
            }
            throw error;
        }
    }

    updateRateLimit(headers) {
        const remaining = headers.get('X-RateLimit-Remaining');
        const reset = headers.get('X-RateLimit-Reset');

        if (remaining) this.rateLimit.remaining = parseInt(remaining);
        if (reset) this.rateLimit.reset = new Date(parseInt(reset) * 1000);
    }

    // ========================================
    // REPOSITORY OPERATIONS
    // ========================================

    parseRepoUrl(url) {
        // Підтримка різних форматів:
        // https://github.com/owner/repo
        // github.com/owner/repo
        // owner/repo

        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace('.git', '')
            };
        }

        const parts = url.split('/');
        if (parts.length === 2) {
            return {
                owner: parts[0],
                repo: parts[1]
            };
        }

        return null;
    }

    async getRepo(owner, repo) {
        const url = `${this.apiBase}/repos/${owner}/${repo}`;
        return await this.fetch(url);
    }

    async getRepoTree(owner, repo, branch = 'main') {
        const url = `${this.apiBase}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        
        try {
            return await this.fetch(url);
        } catch (error) {
            // Try master branch
            if (branch === 'main') {
                const masterUrl = `${this.apiBase}/repos/${owner}/${repo}/git/trees/master?recursive=1`;
                return await this.fetch(masterUrl);
            }
            throw error;
        }
    }

    async getFileContent(owner, repo, path, branch = 'main') {
        const url = `${this.rawBase}/${owner}/${repo}/${branch}/${path}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Try master branch
                if (branch === 'main') {
                    const masterUrl = `${this.rawBase}/${owner}/${repo}/master/${path}`;
                    const masterResponse = await fetch(masterUrl);
                    if (masterResponse.ok) {
                        return await masterResponse.text();
                    }
                }
                throw new Error('File not found');
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Failed to fetch file: ${path}`);
        }
    }

    // ========================================
    // IMPORT REPOSITORY
    // ========================================

    async importRepository(repoUrl, options = {}) {
        const {
            maxFiles = 20,
            allowedExtensions = ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'java'],
            excludePaths = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'],
            onProgress = null
        } = options;

        // Parse URL
        const parsed = this.parseRepoUrl(repoUrl);
        if (!parsed) {
            throw new Error('Invalid GitHub repository URL');
        }

        const { owner, repo } = parsed;

        // Show loading
        if (window.loadingManager) {
            loadingManager.show({
                text: 'Завантаження репозиторія...',
                subtext: `${owner}/${repo}`,
                progress: true
            });
        }

        try {
            // Get repository info
            const repoInfo = await this.getRepo(owner, repo);
            
            if (onProgress) onProgress({ stage: 'repo_info', data: repoInfo });

            // Get file tree
            const tree = await this.getRepoTree(owner, repo, repoInfo.default_branch);
            
            if (onProgress) onProgress({ stage: 'tree', data: tree });

            // Filter files
            const files = tree.tree.filter(item => {
                if (item.type !== 'blob') return false;
                
                // Check excluded paths
                if (excludePaths.some(excluded => item.path.includes(excluded))) {
                    return false;
                }
                
                // Check extension
                const ext = item.path.split('.').pop().toLowerCase();
                return allowedExtensions.includes(ext);
            });

            if (files.length === 0) {
                throw new Error('Не знайдено файлів для імпорту');
            }

            // Limit files
            const filesToImport = files.slice(0, maxFiles);

            if (files.length > maxFiles) {
                if (window.modalManager) {
                    const confirmed = await modalManager.confirm(
                        `Знайдено ${files.length} файлів.\n\nЗавантажити перші ${maxFiles}?`,
                        {
                            title: 'Забагато файлів',
                            icon: '⚠️'
                        }
                    );
                    if (!confirmed) {
                        if (window.loadingManager) loadingManager.hide();
                        return null;
                    }
                }
            }

            // Download files
            const downloadedFiles = {};
            
            for (let i = 0; i < filesToImport.length; i++) {
                const file = filesToImport[i];
                
                if (window.loadingManager) {
                    loadingManager.update('default', {
                        subtext: `Файл ${i + 1}/${filesToImport.length}: ${file.path}`,
                        progress: ((i + 1) / filesToImport.length) * 100
                    });
                }

                try {
                    const content = await this.getFileContent(
                        owner, 
                        repo, 
                        file.path, 
                        repoInfo.default_branch
                    );

                    const ext = file.path.split('.').pop().toLowerCase();
                    const language = this.getLanguageFromExtension(ext);

                    downloadedFiles[file.path] = {
                        language,
                        code: content,
                        size: content.length,
                        modified: false
                    };

                    if (onProgress) {
                        onProgress({ 
                            stage: 'download', 
                            current: i + 1, 
                            total: filesToImport.length,
                            file: file.path
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to download ${file.path}:`, error);
                }
            }

            // Hide loading
            if (window.loadingManager) loadingManager.hide();

            // Return result
            return {
                owner,
                repo,
                url: repoInfo.html_url,
                branch: repoInfo.default_branch,
                files: downloadedFiles,
                totalFiles: files.length,
                importedFiles: Object.keys(downloadedFiles).length
            };

        } catch (error) {
            if (window.loadingManager) loadingManager.hide();
            throw error;
        }
    }

    // ========================================
    // SAVE TO APP STATE
    // ========================================

    async saveToAppState(importResult) {
        if (!window.appState) {
            console.warn('AppState not available');
            return false;
        }

        const { owner, repo, url, files } = importResult;

        // Save files
        Object.entries(files).forEach(([filename, fileData]) => {
            appState.setCodeFile(filename, fileData);
        });

        // Save project context
        appState.setProjectContext({
            owner,
            repo,
            url,
            importedAt: Date.now()
        });

        return true;
    }

    // ========================================
    // UI INTEGRATION
    // ========================================

    async promptAndImport() {
        let repoUrl;

        if (window.modalManager) {
            repoUrl = await modalManager.prompt(
                'Введіть URL GitHub репозиторія:',
                {
                    title: 'Імпорт з GitHub',
                    icon: '🐙',
                    placeholder: 'https://github.com/username/repo',
                    validator: (value) => {
                        if (!value) return false;
                        return this.parseRepoUrl(value) !== null;
                    }
                }
            );
        } else {
            repoUrl = prompt(
                '🐙 Введіть URL GitHub репозиторія:\n\n' +
                'Формат: https://github.com/username/repo\n' +
                'або: username/repo'
            );
        }

        if (!repoUrl) return;

        try {
            const result = await this.importRepository(repoUrl);
            
            if (!result) return;

            // Save to app state
            await this.saveToAppState(result);

            // Switch to code editor
            if (typeof switchMode === 'function') {
                switchMode('deepseek');
            }

            // Display files
            if (window.deepseekCoder && typeof deepseekCoder.displayCodeFiles === 'function') {
                deepseekCoder.displayCodeFiles();
            }

            // Show success message
            if (window.showToast) {
                showToast(
                    `✅ Репозиторій імпортовано!\n📁 ${result.importedFiles} файлів`,
                    'success'
                );
            }

            // Add message to chat
            this.addImportMessage(result);

        } catch (error) {
            console.error('Import failed:', error);
            
            if (window.showToast) {
                showToast(`❌ Помилка імпорту: ${error.message}`, 'error');
            }
        }
    }

    addImportMessage(result) {
        const messagesDiv = document.getElementById('deepseekMessages');
        if (!messagesDiv) return;

        const { owner, repo, url, importedFiles } = result;

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
                    <div style="opacity: 0.9; font-size: 14px; margin-bottom: 8px;">
                        📁 Завантажено ${importedFiles} файлів
                    </div>
                    <div style="opacity: 0.9; font-size: 12px;">
                        <a href="${url}" target="_blank" style="color: white; text-decoration: underline;">
                            Відкрити на GitHub →
                        </a>
                    </div>
                </div>
            </div>
        `;

        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ========================================
    // HELPERS
    // ========================================

    getLanguageFromExtension(ext) {
        const map = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'html': 'html',
            'css': 'css',
            'scss': 'css',
            'json': 'json',
            'md': 'markdown'
        };
        return map[ext] || 'plaintext';
    }

    getRateLimit() {
        return {
            ...this.rateLimit,
            resetFormatted: this.rateLimit.reset ? 
                this.rateLimit.reset.toLocaleTimeString('uk-UA') : null
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const githubIntegration = new GitHubIntegration();

// Експорт
window.githubIntegration = githubIntegration;

// Backward compatibility
window.importFromGitHub = () => githubIntegration.promptAndImport();
window.setupGitHubToken = () => githubIntegration.promptForToken();

console.log('✅ GitHub Integration loaded');
