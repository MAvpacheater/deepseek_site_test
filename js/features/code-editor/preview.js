// 🖼️ Preview Module - Прев'ю коду в реальному часі

class PreviewManager {
    constructor() {
        this.previewFrame = null;
        this.isOpen = false;
        this.autoRefresh = true;
        this.refreshTimeout = null;
        this.lastPreviewContent = '';
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.previewFrame = document.getElementById('previewFrame');
        this.setupEventListeners();
        console.log('✅ Preview Manager initialized');
    }

    setupEventListeners() {
        // Підписатися на зміни файлів
        if (window.fileManager) {
            window.fileManager.onFileChanged = () => {
                if (this.isOpen && this.autoRefresh) {
                    this.scheduleRefresh();
                }
            };
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + P - Toggle preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.toggle();
            }

            // Ctrl/Cmd + R - Refresh preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.isOpen) {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    // ========================================
    // TOGGLE PREVIEW
    // ========================================

    toggle() {
        const panel = document.getElementById('previewPanel');
        if (!panel) return;

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            panel.classList.add('active');
            this.refresh();
        } else {
            panel.classList.remove('active');
        }

        // Notify event bus
        if (window.eventBus) {
            eventBus.emit('preview:toggle', { isOpen: this.isOpen });
        }
    }

    open() {
        if (this.isOpen) return;
        this.toggle();
    }

    close() {
        if (!this.isOpen) return;
        this.toggle();
    }

    // ========================================
    // REFRESH PREVIEW
    // ========================================

    refresh() {
        if (!this.previewFrame) return;

        const content = this.generatePreviewContent();

        // Не оновлювати якщо контент не змінився
        if (content === this.lastPreviewContent) {
            return;
        }

        this.lastPreviewContent = content;
        this.previewFrame.srcdoc = content;

        if (window.showToast) {
            showToast('🔄 Preview оновлено', 'info', 1500);
        }
    }

    scheduleRefresh() {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
            this.refresh();
        }, 500);
    }

    // ========================================
    // ГЕНЕРАЦІЯ КОНТЕНТУ
    // ========================================

    generatePreviewContent() {
        const files = window.fileManager ? 
            fileManager.getAllFiles() : 
            {};

        // Знайти HTML файл
        const htmlFile = this.findHtmlFile(files);

        if (!htmlFile) {
            return this.generateEmptyState();
        }

        // Отримати HTML контент
        let html = htmlFile.code;

        // Вбудувати CSS
        html = this.injectCSS(html, files);

        // Вбудувати JavaScript
        html = this.injectJavaScript(html, files);

        return html;
    }

    findHtmlFile(files) {
        // Пріоритет: index.html -> перший .html файл
        if (files['index.html']) {
            return files['index.html'];
        }

        const htmlFiles = Object.entries(files)
            .filter(([name]) => name.endsWith('.html'))
            .map(([, file]) => file);

        return htmlFiles[0] || null;
    }

    injectCSS(html, files) {
        const cssFiles = Object.entries(files)
            .filter(([name]) => name.endsWith('.css'))
            .map(([, file]) => file.code);

        if (cssFiles.length === 0) return html;

        const cssTag = `<style>\n${cssFiles.join('\n\n')}\n</style>`;

        // Спробувати вставити перед </head>
        if (html.includes('</head>')) {
            return html.replace('</head>', `${cssTag}\n</head>`);
        }

        // Якщо немає </head>, вставити на початок
        if (html.includes('<head>')) {
            return html.replace('<head>', `<head>\n${cssTag}`);
        }

        // Якщо немає <head>, створити його
        if (html.includes('<html>')) {
            return html.replace('<html>', `<html>\n<head>\n${cssTag}\n</head>`);
        }

        // Інакше просто додати на початок
        return cssTag + '\n' + html;
    }

    injectJavaScript(html, files) {
        const jsFiles = Object.entries(files)
            .filter(([name]) => {
                // Виключити test файли
                if (name.includes('test') || name.includes('spec')) {
                    return false;
                }
                return name.endsWith('.js');
            })
            .map(([, file]) => file.code);

        if (jsFiles.length === 0) return html;

        const jsTag = `<script>\n${jsFiles.join('\n\n')}\n</script>`;

        // Спробувати вставити перед </body>
        if (html.includes('</body>')) {
            return html.replace('</body>', `${jsTag}\n</body>`);
        }

        // Інакше додати в кінець
        return html + '\n' + jsTag;
    }

    generateEmptyState() {
        return `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            padding: 20px;
        }
        
        .empty-state {
            max-width: 400px;
        }
        
        .empty-state-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        h2 {
            font-size: 28px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        
        p {
            font-size: 16px;
            opacity: 0.9;
            line-height: 1.6;
        }
        
        .hint {
            margin-top: 30px;
            padding: 15px 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            font-size: 14px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h2>Немає HTML для прев'ю</h2>
        <p>Створи файл index.html або будь-який .html файл щоб побачити результат</p>
        <div class="hint">
            💡 Підказка: Попроси DeepSeek створити HTML сторінку
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    // ========================================
    // ДОДАТКОВІ ФУНКЦІЇ
    // ========================================

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;

        const icon = this.autoRefresh ? '🔄' : '⏸️';
        const message = this.autoRefresh ? 
            'Auto-refresh увімкнено' : 
            'Auto-refresh вимкнено';

        if (window.showToast) {
            showToast(`${icon} ${message}`, 'info', 2000);
        }

        return this.autoRefresh;
    }

    openInNewWindow() {
        const content = this.generatePreviewContent();
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const width = 1200;
        const height = 800;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        window.open(
            url,
            'Preview',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Очистити URL після відкриття
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    exportAsHTML() {
        const content = this.generatePreviewContent();
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preview.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            showToast('✅ HTML експортовано!', 'success');
        }
    }

    getPreviewURL() {
        const content = this.generatePreviewContent();
        const blob = new Blob([content], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }

    // ========================================
    // UTILITY
    // ========================================

    hasHtmlFile() {
        const files = window.fileManager ? 
            fileManager.getAllFiles() : 
            {};
        
        return Object.keys(files).some(name => name.endsWith('.html'));
    }

    getStats() {
        const files = window.fileManager ? 
            fileManager.getAllFiles() : 
            {};

        return {
            hasHtml: this.hasHtmlFile(),
            htmlFiles: Object.keys(files).filter(name => name.endsWith('.html')).length,
            cssFiles: Object.keys(files).filter(name => name.endsWith('.css')).length,
            jsFiles: Object.keys(files).filter(name => name.endsWith('.js')).length,
            isOpen: this.isOpen,
            autoRefresh: this.autoRefresh
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const previewManager = new PreviewManager();

// Глобальні функції для сумісності
window.togglePreview = () => previewManager.toggle();
window.updatePreview = () => previewManager.refresh();
window.openPreviewInNewWindow = () => previewManager.openInNewWindow();
window.exportPreviewAsHTML = () => previewManager.exportAsHTML();
window.toggleAutoRefresh = () => previewManager.toggleAutoRefresh();

// Експорт
window.previewManager = previewManager;
window.PreviewManager = PreviewManager;

console.log('✅ Preview Manager loaded');
