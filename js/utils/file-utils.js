// 📁 File Utils - Робота з файлами

class FileUtils {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedExtensions = {
            text: ['txt', 'md', 'log'],
            code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb'],
            web: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
            data: ['json', 'xml', 'yaml', 'yml', 'csv'],
            image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
            document: ['pdf', 'doc', 'docx']
        };
    }

    // ========================================
    // FILE VALIDATION
    // ========================================

    validate(file, options = {}) {
        const {
            maxSize = this.maxFileSize,
            allowedTypes = null,
            allowedExtensions = null
        } = options;

        const errors = [];

        // Check if file exists
        if (!file) {
            errors.push('Файл не вибрано');
            return { valid: false, errors };
        }

        // Check file size
        if (file.size > maxSize) {
            errors.push(`Файл занадто великий (макс ${this.formatSize(maxSize)})`);
        }

        // Check file type
        if (allowedTypes && !allowedTypes.includes(file.type)) {
            errors.push(`Недозволений тип файлу: ${file.type}`);
        }

        // Check extension
        const ext = this.getExtension(file.name);
        if (allowedExtensions && !allowedExtensions.includes(ext)) {
            errors.push(`Недозволене розширення: .${ext}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ========================================
    // FILE INFO
    // ========================================

    getInfo(file) {
        if (!file) return null;

        return {
            name: file.name,
            size: file.size,
            type: file.type,
            extension: this.getExtension(file.name),
            lastModified: new Date(file.lastModified),
            sizeFormatted: this.formatSize(file.size)
        };
    }

    getExtension(filename) {
        if (!filename) return '';
        return filename.split('.').pop().toLowerCase();
    }

    getBasename(filename, removeExtension = false) {
        if (!filename) return '';
        const parts = filename.split('/');
        const name = parts[parts.length - 1];
        
        if (removeExtension) {
            const lastDot = name.lastIndexOf('.');
            return lastDot > 0 ? name.substring(0, lastDot) : name;
        }
        
        return name;
    }

    getMimeType(filename) {
        const ext = this.getExtension(filename);
        
        const mimeTypes = {
            // Text
            'txt': 'text/plain',
            'md': 'text/markdown',
            
            // Code
            'js': 'text/javascript',
            'json': 'application/json',
            'html': 'text/html',
            'css': 'text/css',
            'xml': 'application/xml',
            
            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            
            // Documents
            'pdf': 'application/pdf',
            'zip': 'application/zip'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    // ========================================
    // FILE READING
    // ========================================

    async readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            
            reader.readAsText(file);
        });
    }

    async readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            
            reader.readAsDataURL(file);
        });
    }

    async readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            
            reader.readAsArrayBuffer(file);
        });
    }

    // ========================================
    // FILE DOWNLOAD
    // ========================================

    download(content, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            return false;
        }
    }

    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        return this.download(json, filename, 'application/json');
    }

    downloadCSV(data, filename) {
        // Simple CSV conversion
        if (!Array.isArray(data) || data.length === 0) {
            return false;
        }

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');

        return this.download(csv, filename, 'text/csv');
    }

    // ========================================
    // FILE CONVERSION
    // ========================================

    async imageToBase64(file) {
        if (!file.type.startsWith('image/')) {
            throw new Error('File is not an image');
        }
        
        return await this.readAsDataURL(file);
    }

    base64ToBlob(base64, mimeType = 'application/octet-stream') {
        const byteString = atob(base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        return new Blob([ab], { type: mimeType });
    }

    // ========================================
    // FILE COMPRESSION
    // ========================================

    async createZip(files, zipName = 'archive.zip') {
        if (typeof JSZip === 'undefined') {
            console.error('JSZip library not loaded');
            return false;
        }

        try {
            const zip = new JSZip();
            
            for (const [filename, content] of Object.entries(files)) {
                zip.file(filename, content);
            }

            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('ZIP creation failed:', error);
            return false;
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isTextFile(filename) {
        const ext = this.getExtension(filename);
        return [...this.allowedExtensions.text, ...this.allowedExtensions.code, 
                ...this.allowedExtensions.web, ...this.allowedExtensions.data]
            .includes(ext);
    }

    isImageFile(filename) {
        const ext = this.getExtension(filename);
        return this.allowedExtensions.image.includes(ext);
    }

    isCodeFile(filename) {
        const ext = this.getExtension(filename);
        return [...this.allowedExtensions.code, ...this.allowedExtensions.web]
            .includes(ext);
    }

    getLanguageFromExtension(filename) {
        const ext = this.getExtension(filename);
        
        const languageMap = {
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
            'htm': 'html',
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'txt': 'plaintext'
        };

        return languageMap[ext] || 'plaintext';
    }

    // ========================================
    // FILE PICKER
    // ========================================

    async selectFile(options = {}) {
        const {
            accept = '*',
            multiple = false
        } = options;

        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = multiple;

            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                resolve(multiple ? files : files[0] || null);
            };

            input.click();
        });
    }

    async selectImage() {
        return await this.selectFile({ 
            accept: 'image/*'
        });
    }

    async selectTextFile() {
        return await this.selectFile({ 
            accept: '.txt,.md,.log'
        });
    }

    async selectCodeFile() {
        return await this.selectFile({ 
            accept: '.js,.jsx,.ts,.tsx,.py,.html,.css,.json'
        });
    }

    // ========================================
    // DRAG & DROP HELPERS
    // ========================================

    setupDropZone(element, onDrop) {
        if (!element) return null;

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('drag-over');
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0 && onDrop) {
                onDrop(files);
            }
        };

        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);

        // Return cleanup function
        return () => {
            element.removeEventListener('dragover', handleDragOver);
            element.removeEventListener('dragleave', handleDragLeave);
            element.removeEventListener('drop', handleDrop);
        };
    }
}

// Експорт
const fileUtils = new FileUtils();
window.fileUtils = fileUtils;

// Backward compatibility
window.downloadFile = (content, filename, type) => fileUtils.download(content, filename, type);
window.readFileAsText = (file) => fileUtils.readAsText(file);

console.log('✅ File Utils loaded');
