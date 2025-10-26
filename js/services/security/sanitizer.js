// 🛡️ HTML Sanitizer - XSS захист та безпечна робота з HTML

class HTMLSanitizer {
    constructor() {
        this.allowedTags = new Set([
            'p', 'br', 'span', 'div', 'strong', 'em', 'b', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ]);

        this.allowedAttributes = {
            'a': ['href', 'title', 'target', 'rel'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'span': ['class', 'style'],
            'div': ['class', 'style'],
            'code': ['class'],
            'pre': ['class'],
            'td': ['colspan', 'rowspan'],
            'th': ['colspan', 'rowspan']
        };

        this.allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

        this.dangerousPatterns = [
            /javascript:/gi,
            /data:text\/html/gi,
            /vbscript:/gi,
            /on\w+\s*=/gi, // onclick, onerror, etc.
            /<script/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /<link/gi,
            /<meta/gi
        ];
    }

    // ========================================
    // ОСНОВНА САНІТИЗАЦІЯ
    // ========================================

    sanitize(html, options = {}) {
        if (!html) return '';
        if (typeof html !== 'string') return String(html);

        // Опції
        const {
            allowHTML = true,
            allowLinks = true,
            allowImages = true,
            stripTags = false
        } = options;

        // Якщо stripTags - видалити весь HTML
        if (stripTags) {
            return this.stripAllTags(html);
        }

        // Якщо не дозволяємо HTML - escape все
        if (!allowHTML) {
            return this.escapeHTML(html);
        }

        // Створити тимчасовий контейнер
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Рекурсивна санітизація
        this.sanitizeNode(temp, { allowLinks, allowImages });

        return temp.innerHTML;
    }

    sanitizeNode(node, options) {
        if (!node) return;

        // Обробка текстових вузлів
        if (node.nodeType === Node.TEXT_NODE) {
            return;
        }

        // Обробка елементів
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            // Видалити недозволені теги
            if (!this.allowedTags.has(tagName)) {
                // Зберегти дітей, але видалити сам тег
                while (node.firstChild) {
                    node.parentNode.insertBefore(node.firstChild, node);
                }
                node.parentNode.removeChild(node);
                return;
            }

            // Видалити посилання якщо не дозволено
            if (tagName === 'a' && !options.allowLinks) {
                while (node.firstChild) {
                    node.parentNode.insertBefore(node.firstChild, node);
                }
                node.parentNode.removeChild(node);
                return;
            }

            // Видалити зображення якщо не дозволено
            if (tagName === 'img' && !options.allowImages) {
                node.parentNode.removeChild(node);
                return;
            }

            // Очистити атрибути
            this.sanitizeAttributes(node);
        }

        // Рекурсивно обробити дітей
        const children = Array.from(node.childNodes);
        children.forEach(child => this.sanitizeNode(child, options));
    }

    sanitizeAttributes(element) {
        const tagName = element.tagName.toLowerCase();
        const allowedAttrs = this.allowedAttributes[tagName] || [];

        // Отримати всі атрибути
        const attributes = Array.from(element.attributes);

        attributes.forEach(attr => {
            const attrName = attr.name.toLowerCase();

            // Видалити недозволені атрибути
            if (!allowedAttrs.includes(attrName)) {
                element.removeAttribute(attr.name);
                return;
            }

            // Перевірити значення атрибутів
            const value = attr.value;

            // Перевірити на небезпечні паттерни
            if (this.isDangerousValue(value)) {
                element.removeAttribute(attr.name);
                return;
            }

            // Перевірити URL атрибути
            if (attrName === 'href' || attrName === 'src') {
                if (!this.isSafeURL(value)) {
                    element.removeAttribute(attr.name);
                    return;
                }
            }

            // Обмежити style атрибут
            if (attrName === 'style') {
                element.setAttribute('style', this.sanitizeStyle(value));
            }
        });
    }

    // ========================================
    // ПЕРЕВІРКИ БЕЗПЕКИ
    // ========================================

    isDangerousValue(value) {
        if (!value) return false;

        return this.dangerousPatterns.some(pattern => pattern.test(value));
    }

    isSafeURL(url) {
        if (!url) return false;

        try {
            // Відносні URL - безпечні
            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
                return true;
            }

            // Anchor links - безпечні
            if (url.startsWith('#')) {
                return true;
            }

            // Перевірити протокол
            const urlObj = new URL(url, window.location.origin);
            return this.allowedProtocols.has(urlObj.protocol);

        } catch (e) {
            // Невалідний URL
            return false;
        }
    }

    sanitizeStyle(style) {
        if (!style) return '';

        // Видалити небезпечні властивості
        const dangerous = ['expression', 'behavior', 'binding', 'javascript:', 'vbscript:'];
        
        let safe = style;
        dangerous.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            safe = safe.replace(regex, '');
        });

        return safe;
    }

    // ========================================
    // ESCAPE ФУНКЦІЇ
    // ========================================

    escapeHTML(text) {
        if (!text) return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;'
        };

        return String(text).replace(/[&<>"'`/]/g, char => map[char]);
    }

    unescapeHTML(text) {
        if (!text) return '';

        const map = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#x60;': '`'
        };

        return String(text).replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60);/g, entity => map[entity]);
    }

    stripAllTags(html) {
        if (!html) return '';

        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    // ========================================
    // MARKDOWN РЕНДЕРИНГ (БЕЗПЕЧНИЙ)
    // ========================================

    renderMarkdown(markdown) {
        if (!markdown) return '';

        let html = markdown;

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        // Code inline
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const escapedCode = this.escapeHTML(code);
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${escapedCode}</code></pre>`;
        });

        // Links - БЕЗПЕЧНО
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            if (this.isSafeURL(url)) {
                return `<a href="${this.escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHTML(text)}</a>`;
            }
            return this.escapeHTML(text);
        });

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        // Sanitize final HTML
        return this.sanitize(html);
    }

    // ========================================
    // БЕЗПЕЧНА РОБОТА З DOM
    // ========================================

    safeSetHTML(element, html, options = {}) {
        if (!element) return;

        const sanitized = this.sanitize(html, options);
        element.innerHTML = sanitized;
    }

    safeAppendHTML(element, html, options = {}) {
        if (!element) return;

        const sanitized = this.sanitize(html, options);
        const temp = document.createElement('div');
        temp.innerHTML = sanitized;

        while (temp.firstChild) {
            element.appendChild(temp.firstChild);
        }
    }

    safeSetText(element, text) {
        if (!element) return;

        element.textContent = text;
    }

    // Створити елемент безпечно
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        // Додати атрибути
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                this.safeSetHTML(element, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // Додати дітей
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    }

    // ========================================
    // ВАЛІДАЦІЯ ВВЕДЕННЯ
    // ========================================

    validateInput(input, rules = {}) {
        const {
            maxLength = 10000,
            minLength = 0,
            pattern = null,
            allowHTML = false,
            required = false
        } = rules;

        const errors = [];

        // Required check
        if (required && (!input || input.trim() === '')) {
            errors.push('Поле обов\'язкове');
            return { valid: false, errors, value: input };
        }

        if (!input) {
            return { valid: true, errors: [], value: input };
        }

        // Length check
        if (input.length < minLength) {
            errors.push(`Мінімальна довжина: ${minLength} символів`);
        }

        if (input.length > maxLength) {
            errors.push(`Максимальна довжина: ${maxLength} символів`);
        }

        // Pattern check
        if (pattern && !pattern.test(input)) {
            errors.push('Невірний формат');
        }

        // HTML check
        if (!allowHTML && /<[^>]*>/g.test(input)) {
            errors.push('HTML теги не дозволені');
        }

        // XSS check
        if (this.isDangerousValue(input)) {
            errors.push('Виявлено небезпечний вміст');
        }

        const value = allowHTML ? this.sanitize(input) : this.escapeHTML(input);

        return {
            valid: errors.length === 0,
            errors,
            value
        };
    }

    // ========================================
    // CODE SYNTAX HIGHLIGHTING (БЕЗПЕЧНО)
    // ========================================

    highlightCode(code, language = 'plaintext') {
        // Escape спочатку
        const escaped = this.escapeHTML(code);

        // Використовувати Prism якщо доступний
        if (typeof Prism !== 'undefined' && Prism.languages[language]) {
            return Prism.highlight(code, Prism.languages[language], language);
        }

        // Fallback - просто escaped код
        return escaped;
    }

    // ========================================
    // UTILITY ФУНКЦІЇ
    // ========================================

    // Перевірити чи містить XSS
    containsXSS(text) {
        if (!text) return false;

        return this.dangerousPatterns.some(pattern => pattern.test(text));
    }

    // Очистити ім'я файлу
    sanitizeFilename(filename) {
        if (!filename) return 'untitled';

        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 255);
    }

    // Очистити URL
    sanitizeURL(url) {
        if (!url) return '';

        try {
            const urlObj = new URL(url);
            
            // Дозволити тільки безпечні протоколи
            if (!this.allowedProtocols.has(urlObj.protocol)) {
                return '';
            }

            return urlObj.href;
        } catch (e) {
            return '';
        }
    }

    // ========================================
    // CONTENT SECURITY POLICY HELPERS
    // ========================================

    generateCSPMeta() {
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' https://cdnjs.cloudflare.com",
            "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://image.pollinations.ai",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'"
        ].join('; ');

        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = csp;

        return meta;
    }

    // ========================================
    // БЕЗПЕЧНІ ШАБЛОНИ
    // ========================================

    // Шаблон для повідомлень чату
    createMessageElement(text, sender = 'user') {
        const messageDiv = this.createElement('div', {
            className: `message ${sender}`
        });

        const avatar = this.createElement('div', {
            className: 'message-avatar',
            textContent: sender === 'user' ? '👤' : '🤖'
        });

        const contentDiv = this.createElement('div', {
            className: 'message-content',
            textContent: text // Безпечно через textContent
        });

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        return messageDiv;
    }

    // Шаблон для code block
    createCodeBlock(code, language = 'plaintext', filename = '') {
        const codeBlock = this.createElement('div', {
            className: 'code-block'
        });

        // Header
        const header = this.createElement('div', {
            className: 'code-block-header'
        });

        if (filename) {
            const fileNameSpan = this.createElement('span', {
                className: 'code-block-name',
                textContent: this.sanitizeFilename(filename)
            });
            header.appendChild(fileNameSpan);
        }

        const copyBtn = this.createElement('button', {
            textContent: '📋 Копіювати',
            onclick: () => {
                navigator.clipboard.writeText(code);
                copyBtn.textContent = '✓ Скопійовано!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Копіювати';
                }, 2000);
            }
        });
        header.appendChild(copyBtn);

        // Code content
        const pre = this.createElement('pre');
        const codeElement = this.createElement('code', {
            className: `language-${language}`
        });

        // Highlight код безпечно
        const highlighted = this.highlightCode(code, language);
        codeElement.innerHTML = highlighted;

        pre.appendChild(codeElement);
        codeBlock.appendChild(header);
        codeBlock.appendChild(pre);

        return codeBlock;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const sanitizer = new HTMLSanitizer();

// Додати CSP meta tag
document.addEventListener('DOMContentLoaded', () => {
    // Перевірити чи вже є CSP
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
        const cspMeta = sanitizer.generateCSPMeta();
        document.head.insertBefore(cspMeta, document.head.firstChild);
        console.log('✅ CSP Meta tag added');
    }
});

// ========================================
// ПАТЧИНГ НЕБЕЗПЕЧНИХ МЕТОДІВ
// ========================================

// Wrapper для innerHTML
Object.defineProperty(Element.prototype, 'safeHTML', {
    set: function(html) {
        sanitizer.safeSetHTML(this, html);
    },
    get: function() {
        return this.innerHTML;
    }
});

// ========================================
// EXPORT
// ========================================

window.sanitizer = sanitizer;
window.escapeHTML = sanitizer.escapeHTML.bind(sanitizer);
window.sanitizeHTML = sanitizer.sanitize.bind(sanitizer);
window.safeSetHTML = sanitizer.safeSetHTML.bind(sanitizer);
window.createSafeElement = sanitizer.createElement.bind(sanitizer);

console.log('✅ HTML Sanitizer initialized');
