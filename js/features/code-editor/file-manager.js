// 📁 File Manager - Управління файлами коду

class FileManager {
    constructor() {
        this.activeFile = null;
        this.files = {};
        this.fileHistory = {};
        this.maxHistoryPerFile = 10;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadFromState();
        this.setupEventListeners();
        console.log('✅ File Manager initialized');
    }

    loadFromState() {
        if (window.appState) {
            this.files = appState.getAllCodeFiles();
            this.activeFile = appState.ui.activeFile;
        }
    }

    setupEventListeners() {
        if (window.appState) {
            appState.on('codeFile:set', ({ filename }) => {
                this.onFileChanged(filename);
            });
            
            appState.on('codeFile:delete', ({ filename }) => {
                this.onFileDeleted(filename);
            });
        }
    }

    // ========================================
    // CRUD ОПЕРАЦІЇ
    // ========================================

    saveFile(filename, code, language) {
        if (!filename || !code) {
            throw new Error('Filename and code are required');
        }

        // Валідація
        const validation = this.validateFile(filename, code);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        // Зберегти стару версію в історію
        if (this.files[filename]) {
            this.addToHistory(filename, this.files[filename].code);
        }

        // Створити файл
        const file = {
            language: language || this.detectLanguage(filename),
            code: code,
            size: code.length,
            modified: true,
            created: this.files[filename]?.created || Date.now(),
            updated: Date.now()
        };

        this.files[filename] = file;

        // Зберегти в appState
        if (window.appState) {
            appState.setCodeFile(filename, file);
        }

        console.log(`💾 Saved file: ${filename}`);
        return file;
    }

    getFile(filename) {
        return this.files[filename] || null;
    }

    getAllFiles() {
        return { ...this.files };
    }

    getFilesList() {
        return Object.keys(this.files);
    }

    updateFile(filename, code) {
        if (!this.files[filename]) {
            throw new Error(`File ${filename} not found`);
        }

        return this.saveFile(filename, code, this.files[filename].language);
    }

    deleteFile(filename) {
        if (!this.files[filename]) {
            return false;
        }

        delete this.files[filename];
        delete this.fileHistory[filename];

        // Видалити з appState
        if (window.appState) {
            appState.deleteCodeFile(filename);
        }

        // Якщо це активний файл - вибрати інший
        if (this.activeFile === filename) {
            const files = this.getFilesList();
            this.activeFile = files.length > 0 ? files[0] : null;
        }

        console.log(`🗑️ Deleted file: ${filename}`);
        return true;
    }

    renameFile(oldName, newName) {
        if (!this.files[oldName]) {
            throw new Error(`File ${oldName} not found`);
        }

        if (this.files[newName]) {
            throw new Error(`File ${newName} already exists`);
        }

        // Копіювати файл
        this.files[newName] = { ...this.files[oldName] };
        
        // Копіювати історію
        if (this.fileHistory[oldName]) {
            this.fileHistory[newName] = [...this.fileHistory[oldName]];
        }

        // Видалити старий
        delete this.files[oldName];
        delete this.fileHistory[oldName];

        // Оновити activeFile
        if (this.activeFile === oldName) {
            this.activeFile = newName;
        }

        // Оновити в appState
        if (window.appState) {
            appState.deleteCodeFile(oldName);
            appState.setCodeFile(newName, this.files[newName]);
            if (this.activeFile === newName) {
                appState.setActiveFile(newName);
            }
        }

        console.log(`📝 Renamed file: ${oldName} → ${newName}`);
        return true;
    }

    clearAll() {
        this.files = {};
        this.fileHistory = {};
        this.activeFile = null;

        if (window.appState) {
            appState.clearCodeFiles();
        }

        console.log('🗑️ All files cleared');
    }

    // ========================================
    // АКТИВНИЙ ФАЙЛ
    // ========================================

    setActiveFile(filename) {
        if (!this.files[filename]) {
            throw new Error(`File ${filename} not found`);
        }

        this.activeFile = filename;

        if (window.appState) {
            appState.setActiveFile(filename);
        }

        return this.files[filename];
    }

    getActiveFile() {
        if (!this.activeFile) return null;
        return this.files[this.activeFile];
    }

    getActiveFilename() {
        return this.activeFile;
    }

    // ========================================
    // ІСТОРІЯ ВЕРСІЙ
    // ========================================

    addToHistory(filename, code) {
        if (!this.fileHistory[filename]) {
            this.fileHistory[filename] = [];
        }

        this.fileHistory[filename].push({
            code,
            timestamp: Date.now()
        });

        // Обмежити історію
        if (this.fileHistory[filename].length > this.maxHistoryPerFile) {
            this.fileHistory[filename] = this.fileHistory[filename].slice(-this.maxHistoryPerFile);
        }

        // Зберегти в appState
        if (window.appState) {
            appState.addCodeHistory(filename, code);
        }
    }

    getHistory(filename) {
        return this.fileHistory[filename] || [];
    }

    getVersion(filename, versionIndex) {
        const history = this.getHistory(filename);
        if (versionIndex < 0 || versionIndex >= history.length) {
            return null;
        }
        return history[versionIndex];
    }

    revertToVersion(filename, versionIndex) {
        const version = this.getVersion(filename, versionIndex);
        if (!version) {
            throw new Error('Version not found');
        }

        // Зберегти поточну версію перед реверсією
        if (this.files[filename]) {
            this.addToHistory(filename, this.files[filename].code);
        }

        // Відновити версію
        return this.updateFile(filename, version.code);
    }

    // ========================================
    // ВАЛІДАЦІЯ
    // ========================================

    validateFile(filename, code) {
        const errors = [];

        // Перевірка імені файлу
        if (!filename || filename.trim() === '') {
            errors.push('Filename is required');
        }

        if (filename.length > 255) {
            errors.push('Filename too long');
        }

        if (!/^[a-zA-Z0-9._\-\/]+$/.test(filename)) {
            errors.push('Invalid filename characters');
        }

        // Перевірка коду
        if (!code) {
            errors.push('Code is required');
        }

        if (code.length > 5 * 1024 * 1024) { // 5MB
            errors.push('File too large (max 5MB)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ========================================
    // ПОШУК
    // ========================================

    searchInFiles(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        Object.entries(this.files).forEach(([filename, file]) => {
            const matches = [];
            const lines = file.code.split('\n');

            lines.forEach((line, index) => {
                if (line.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        line: index + 1,
                        content: line.trim(),
                        position: line.toLowerCase().indexOf(lowerQuery)
                    });
                }
            });

            if (matches.length > 0) {
                results.push({
                    filename,
                    language: file.language,
                    matches
                });
            }
        });

        return results;
    }

    findByExtension(extension) {
        return Object.entries(this.files)
            .filter(([filename]) => filename.endsWith(`.${extension}`))
            .map(([filename, file]) => ({ filename, ...file }));
    }

    findByLanguage(language) {
        return Object.entries(this.files)
            .filter(([, file]) => file.language === language)
            .map(([filename, file]) => ({ filename, ...file }));
    }

    // ========================================
    // ЕКСПОРТ / ІМПОРТ
    // ========================================

    async exportAsZip() {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip not loaded');
        }

        const zip = new JSZip();

        Object.entries(this.files).forEach(([filename, file]) => {
            zip.file(filename, file.code);
        });

        // Додати README
        const readme = `# Code Files Export\n\nExported: ${new Date().toLocaleString()}\nTotal files: ${Object.keys(this.files).length}`;
        zip.file('README.md', readme);

        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE'
        });

        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code-export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📦 Exported as ZIP');
    }

    exportFile(filename, format = 'download') {
        const file = this.files[filename];
        if (!file) {
            throw new Error(`File ${filename} not found`);
        }

        if (format === 'download') {
            const blob = new Blob([file.code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (format === 'clipboard') {
            navigator.clipboard.writeText(file.code);
        }

        return true;
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    getStats() {
        const stats = {
            totalFiles: Object.keys(this.files).length,
            totalSize: 0,
            totalLines: 0,
            byLanguage: {},
            largestFile: null,
            smallestFile: null
        };

        let largestSize = 0;
        let smallestSize = Infinity;

        Object.entries(this.files).forEach(([filename, file]) => {
            stats.totalSize += file.size;
            stats.totalLines += file.code.split('\n').length;

            // По мові
            if (!stats.byLanguage[file.language]) {
                stats.byLanguage[file.language] = 0;
            }
            stats.byLanguage[file.language]++;

            // Найбільший/найменший
            if (file.size > largestSize) {
                largestSize = file.size;
                stats.largestFile = { filename, size: file.size };
            }
            if (file.size < smallestSize) {
                smallestSize = file.size;
                stats.smallestFile = { filename, size: file.size };
            }
        });

        stats.averageSize = stats.totalFiles > 0 ? 
            Math.round(stats.totalSize / stats.totalFiles) : 0;

        return stats;
    }

    // ========================================
    // UTILITY
    // ========================================

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown'
        };
        return languageMap[ext] || 'plaintext';
    }

    onFileChanged(filename) {
        console.log(`📝 File changed: ${filename}`);
    }

    onFileDeleted(filename) {
        console.log(`🗑️ File deleted: ${filename}`);
    }

    hasUnsavedChanges() {
        return Object.values(this.files).some(file => file.modified);
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const fileManager = new FileManager();

window.fileManager = fileManager;
window.FileManager = FileManager;

console.log('✅ File Manager loaded');
