// 📝 Code Extractor - Витягування коду з AI відповідей (FIXED)

class CodeExtractor {
    constructor() {
        this.fileMarkerPattern = /\/\/\s*FILE:\s*(.+?)(?:\n|$)/gi;
        this.codeBlockPattern = /```(\w+)?\s*\n([\s\S]*?)```/g;
        this.languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'scss': 'css',
            'json': 'json',
            'md': 'markdown',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby'
        };
    }

    // ========================================
    // ГОЛОВНА ФУНКЦІЯ ВИТЯГУВАННЯ
    // ========================================

    extractAndApply(text) {
        if (!text) return 0;

        console.log('📝 Extracting code from response...');
        
        let filesCreated = 0;

        // Спочатку перевірити FILE: маркери
        const fileMarkers = text.match(this.fileMarkerPattern);
        
        if (fileMarkers && fileMarkers.length > 0) {
            console.log('Found FILE: markers:', fileMarkers.length);
            filesCreated = this.extractFromFileMarkers(text, fileMarkers);
            if (filesCreated > 0) {
                console.log(`✅ Extracted ${filesCreated} files from markers`);
                return filesCreated;
            }
        }

        // Якщо немає маркерів - витягти з code blocks
        filesCreated = this.extractFromCodeBlocks(text);
        console.log(`✅ Extracted ${filesCreated} files from code blocks`);
        
        return filesCreated;
    }

    // ========================================
    // ВИТЯГУВАННЯ З FILE: МАРКЕРІВ
    // ========================================

    extractFromFileMarkers(text, markers) {
        let filesCreated = 0;
        
        // Фільтрувати маркери на початку рядка
        const validMarkers = markers.filter(marker => {
            const markerIndex = text.indexOf(marker);
            if (markerIndex === 0) return true;
            const prevChar = text[markerIndex - 1];
            return prevChar === '\n';
        });
        
        let currentPos = 0;
        
        validMarkers.forEach((marker, index) => {
            const filename = marker.replace(/\/\/\s*FILE:\s*/i, '').trim();
            const markerPos = text.indexOf(marker, currentPos);
            const nextMarkerPos = index < validMarkers.length - 1 ? 
                text.indexOf(validMarkers[index + 1], markerPos) : text.length;
            
            let codeBlock = text.substring(markerPos + marker.length, nextMarkerPos).trim();
            
            // Видалити code block обгортки якщо є
            codeBlock = codeBlock.replace(/```[\w]*\n?/g, '').replace(/```\n?$/g, '').trim();
            
            if (codeBlock) {
                const ext = filename.split('.').pop();
                const language = this.getLanguageFromExtension(ext);
                
                console.log(`Saving file: ${filename} (${language})`);
                this.saveFile(filename, codeBlock, language);
                filesCreated++;
            }
            
            currentPos = nextMarkerPos;
        });
        
        return filesCreated;
    }

    // ========================================
    // ВИТЯГУВАННЯ З CODE BLOCKS
    // ========================================

    extractFromCodeBlocks(text) {
        let filesCreated = 0;
        let fileIndex = this.getExistingFilesCount();
        
        const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const lang = match[1] || 'txt';
            const code = match[2].trim();
            
            if (!code) continue;
            
            // Спробувати визначити ім'я файлу з коду
            let filename = this.detectFilename(code, lang);
            
            if (!filename) {
                fileIndex++;
                filename = `file_${fileIndex}.${this.getExtension(lang)}`;
            }
            
            console.log(`Saving file: ${filename} (${lang})`);
            this.saveFile(filename, code, lang);
            filesCreated++;
        }
        
        return filesCreated;
    }

    // ========================================
    // ВИЗНАЧЕННЯ ІМЕНІ ФАЙЛУ
    // ========================================

    detectFilename(code, lang) {
        if (!code) return null;

        const lines = code.split('\n');
        const firstNonEmptyLine = lines.find(line => line.trim().length > 0) || '';
        const trimmedCode = code.trim();
        
        // HTML файли
        if (trimmedCode.includes('<!DOCTYPE') || 
            trimmedCode.includes('<html') || 
            firstNonEmptyLine.startsWith('<!DOCTYPE') ||
            firstNonEmptyLine.startsWith('<html')) {
            return 'index.html';
        }
        
        // package.json
        if (trimmedCode.includes('"name"') && 
            trimmedCode.includes('"version"') &&
            (lang === 'json' || trimmedCode.startsWith('{'))) {
            return 'package.json';
        }
        
        // CSS файли
        if (lang === 'css' || 
            /^[.#\w-]+\s*\{/.test(firstNonEmptyLine) ||
            trimmedCode.match(/^[.#\w-]+\s*\{/m)) {
            return 'styles.css';
        }
        
        // JavaScript/TypeScript
        if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
            // React компоненти
            if (trimmedCode.includes('import React') || 
                trimmedCode.includes('from \'react\'') ||
                trimmedCode.includes('from "react"')) {
                return lang === 'typescript' ? 'App.tsx' : 'App.jsx';
            }
            
            // ES6 модулі
            if (trimmedCode.match(/^import .+ from/m) || 
                trimmedCode.match(/^export /m)) {
                return lang === 'typescript' ? 'index.ts' : 'index.js';
            }
            
            return lang === 'typescript' ? 'script.ts' : 'script.js';
        }
        
        // Python
        if (lang === 'python' || lang === 'py') {
            if (trimmedCode.includes('if __name__') || 
                trimmedCode.includes('def main(')) {
                return 'main.py';
            }
            
            if (trimmedCode.includes('from flask import') || 
                trimmedCode.includes('from django')) {
                return 'app.py';
            }
            
            return 'script.py';
        }
        
        return null;
    }

    // ========================================
    // ЗБЕРЕЖЕННЯ ФАЙЛУ
    // ========================================

    saveFile(filename, code, language) {
        console.log(`💾 Saving file: ${filename}`);
        
        // КРИТИЧНО: Зберегти через appState
        if (window.appState) {
            const fileData = {
                language: language || this.getLanguageFromExtension(filename.split('.').pop()),
                code: code,
                size: code.length,
                modified: true,
                created: Date.now(),
                updated: Date.now()
            };
            
            appState.setCodeFile(filename, fileData);
            console.log(`✅ File saved to appState: ${filename}`);
        } else {
            console.error('❌ appState not available');
        }

        // Також зберегти через fileManager якщо доступний
        if (window.fileManager) {
            try {
                fileManager.saveFile(filename, code, language);
                console.log(`✅ File saved to fileManager: ${filename}`);
            } catch (error) {
                console.error('Failed to save via fileManager:', error);
            }
        }
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    getLanguageFromExtension(ext) {
        if (!ext) return 'plaintext';
        return this.languageMap[ext.toLowerCase()] || 'plaintext';
    }

    getExtension(lang) {
        const extensions = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rust': 'rs',
            'php': 'php',
            'ruby': 'rb',
            'markdown': 'md'
        };
        return extensions[lang.toLowerCase()] || 'txt';
    }

    getExistingFilesCount() {
        if (window.appState) {
            return Object.keys(appState.getAllCodeFiles()).length;
        }
        return 0;
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    getStats() {
        return {
            totalFiles: this.getExistingFilesCount(),
            supportedLanguages: Object.keys(this.languageMap).length
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const codeExtractor = new CodeExtractor();

// Експорт
window.codeExtractor = codeExtractor;
window.CodeExtractor = CodeExtractor;

console.log('✅ Code Extractor loaded (FIXED)');
