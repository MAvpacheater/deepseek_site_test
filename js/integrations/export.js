// 📤 Export Integration - Експорт даних

class ExportIntegration {
    constructor() {
        this.formats = ['json', 'markdown', 'html', 'zip'];
        console.log('✅ Export Integration initialized');
    }

    // ========================================
    // EXPORT CONVERSATIONS
    // ========================================

    async exportConversation(mode = 'gemini', format = 'markdown') {
        if (!window.appState) {
            if (window.showToast) {
                showToast('❌ AppState недоступний', 'error');
            }
            return false;
        }

        try {
            let messages = [];
            
            if (mode === 'gemini') {
                messages = appState.getGeminiMessages();
            } else if (mode === 'deepseek') {
                messages = appState.getDeepSeekMessages();
            }

            if (messages.length === 0) {
                if (window.showToast) {
                    showToast('⚠️ Немає повідомлень для експорту', 'warning');
                }
                return false;
            }

            const exportData = {
                mode,
                exportedAt: new Date().toISOString(),
                messagesCount: messages.length,
                messages
            };

            let content, filename, mimeType;

            switch (format) {
                case 'json':
                    content = JSON.stringify(exportData, null, 2);
                    filename = `${mode}-chat-${Date.now()}.json`;
                    mimeType = 'application/json';
                    break;

                case 'markdown':
                    content = this.conversationToMarkdown(exportData);
                    filename = `${mode}-chat-${Date.now()}.md`;
                    mimeType = 'text/markdown';
                    break;

                case 'html':
                    content = this.conversationToHTML(exportData);
                    filename = `${mode}-chat-${Date.now()}.html`;
                    mimeType = 'text/html';
                    break;

                default:
                    throw new Error('Unsupported format');
            }

            // Download
            if (window.fileUtils) {
                fileUtils.download(content, filename, mimeType);
            } else {
                this.download(content, filename, mimeType);
            }

            if (window.showToast) {
                showToast(`✅ Розмову експортовано (${format.toUpperCase()})`, 'success');
            }

            return true;

        } catch (error) {
            console.error('Export conversation failed:', error);
            
            if (window.showToast) {
                showToast('❌ Помилка експорту', 'error');
            }
            
            return false;
        }
    }

    conversationToMarkdown(data) {
        const { mode, exportedAt, messagesCount, messages } = data;

        let md = `# ${mode === 'gemini' ? 'Gemini' : 'DeepSeek'} Chat\n\n`;
        md += `**Експортовано:** ${new Date(exportedAt).toLocaleString('uk-UA')}\n`;
        md += `**Повідомлень:** ${messagesCount}\n\n`;
        md += '---\n\n';

        messages.forEach((msg, i) => {
            const role = msg.role === 'user' ? '👤 Користувач' : '🤖 AI';
            let content = '';
            
            if (mode === 'gemini') {
                content = msg.parts?.[0]?.text || '';
            } else {
                content = msg.content || '';
            }

            md += `## ${role}\n\n`;
            md += `${content}\n\n`;
            
            if (i < messages.length - 1) {
                md += '---\n\n';
            }
        });

        return md;
    }

    conversationToHTML(data) {
        const { mode, exportedAt, messagesCount, messages } = data;

        let html = `<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mode === 'gemini' ? 'Gemini' : 'DeepSeek'} Chat Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { margin: 0 0 15px 0; color: #2563eb; }
        .info { color: #666; font-size: 14px; }
        .message {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .message-header {
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .message-content {
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .user { border-left: 4px solid #2563eb; }
        .assistant { border-left: 4px solid #22c55e; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${mode === 'gemini' ? '✨ Gemini' : '💻 DeepSeek'} Chat</h1>
        <div class="info">
            <p>Експортовано: ${new Date(exportedAt).toLocaleString('uk-UA')}</p>
            <p>Повідомлень: ${messagesCount}</p>
        </div>
    </div>
`;

        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const roleText = role === 'user' ? '👤 Користувач' : '🤖 AI';
            let content = '';
            
            if (mode === 'gemini') {
                content = msg.parts?.[0]?.text || '';
            } else {
                content = msg.content || '';
            }

            // Escape HTML
            content = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            html += `
    <div class="message ${role}">
        <div class="message-header">${roleText}</div>
        <div class="message-content">${content}</div>
    </div>
`;
        });

        html += `
</body>
</html>`;

        return html;
    }

    // ========================================
    // EXPORT CODE PROJECT
    // ========================================

    async exportCodeProject(format = 'zip') {
        if (!window.appState) {
            if (window.showToast) {
                showToast('❌ AppState недоступний', 'error');
            }
            return false;
        }

        const files = appState.getAllCodeFiles();

        if (Object.keys(files).length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає файлів для експорту', 'warning');
            }
            return false;
        }

        try {
            if (format === 'zip') {
                return await this.exportAsZip(files);
            } else if (format === 'json') {
                return await this.exportProjectAsJSON(files);
            }
        } catch (error) {
            console.error('Export project failed:', error);
            
            if (window.showToast) {
                showToast('❌ Помилка експорту проекту', 'error');
            }
            
            return false;
        }
    }

    async exportAsZip(files) {
        if (typeof JSZip === 'undefined') {
            if (window.showToast) {
                showToast('❌ JSZip не завантажено', 'error');
            }
            return false;
        }

        try {
            const zip = new JSZip();

            // Add files
            Object.entries(files).forEach(([filename, fileData]) => {
                zip.file(filename, fileData.code || '');
            });

            // Add README
            const projectContext = appState.getProjectContext();
            if (projectContext) {
                const readme = `# ${projectContext.repo || 'Project'}\n\n` +
                    `Оригінал: ${projectContext.url || 'N/A'}\n` +
                    `Імпортовано: ${new Date(projectContext.importedAt).toLocaleString('uk-UA')}\n`;
                zip.file('AI_CHANGES.md', readme);
            }

            // Generate ZIP
            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE'
            });

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = projectContext?.repo ? 
                `${projectContext.repo}_modified.zip` : 
                `project_${Date.now()}.zip`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.showToast) {
                showToast('✅ ZIP архів створено', 'success');
            }

            return true;

        } catch (error) {
            console.error('ZIP creation failed:', error);
            throw error;
        }
    }

    async exportProjectAsJSON(files) {
        const projectData = {
            exportedAt: new Date().toISOString(),
            filesCount: Object.keys(files).length,
            context: appState.getProjectContext(),
            files: files
        };

        const json = JSON.stringify(projectData, null, 2);
        
        if (window.fileUtils) {
            fileUtils.download(json, `project_${Date.now()}.json`, 'application/json');
        } else {
            this.download(json, `project_${Date.now()}.json`, 'application/json');
        }

        if (window.showToast) {
            showToast('✅ Проект експортовано (JSON)', 'success');
        }

        return true;
    }

    // ========================================
    // HELPERS
    // ========================================

    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // ========================================
    // UI HELPERS
    // ========================================

    async promptExportConversation(mode = 'gemini') {
        if (window.modalManager) {
            const format = await modalManager.select(
                'Виберіть формат експорту:',
                {
                    title: 'Експорт розмови',
                    icon: '📤',
                    choices: [
                        { value: 'markdown', label: 'Markdown (.md)' },
                        { value: 'json', label: 'JSON (.json)' },
                        { value: 'html', label: 'HTML (.html)' }
                    ],
                    defaultValue: 'markdown'
                }
            );

            if (format) {
                await this.exportConversation(mode, format);
            }
        } else {
            await this.exportConversation(mode, 'markdown');
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const exportIntegration = new ExportIntegration();

// Експорт
window.exportIntegration = exportIntegration;

// Backward compatibility
window.exportConversation = (mode, format) => exportIntegration.exportConversation(mode, format);
window.exportCodeProject = (format) => exportIntegration.exportCodeProject(format);

console.log('✅ Export Integration loaded');
