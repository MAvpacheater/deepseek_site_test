// 💬 Message Renderer - Універсальний рендерер повідомлень

class MessageRenderer {
    constructor() {
        this.renderers = new Map();
        this.initRenderers();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    initRenderers() {
        // Text renderer
        this.addRenderer('text', (content) => {
            const div = document.createElement('div');
            div.textContent = content;
            return div;
        });

        // Markdown renderer
        this.addRenderer('markdown', (content) => {
            if (window.sanitizer && typeof sanitizer.renderMarkdown === 'function') {
                const div = document.createElement('div');
                div.innerHTML = sanitizer.renderMarkdown(content);
                return div;
            }
            return this.renderBasicMarkdown(content);
        });

        // Code renderer
        this.addRenderer('code', (content, language = 'javascript') => {
            return this.renderCodeBlock(content, language);
        });

        // HTML renderer (безпечний)
        this.addRenderer('html', (content) => {
            const div = document.createElement('div');
            if (window.sanitizer) {
                div.innerHTML = sanitizer.sanitize(content);
            } else {
                div.textContent = content;
            }
            return div;
        });
    }

    // ========================================
    // RENDER MESSAGE
    // ========================================

    render(message, options = {}) {
        const {
            sender = 'user',
            timestamp = Date.now(),
            format = 'auto',
            showActions = true,
            showTime = true,
            animated = true
        } = options;

        const container = document.createElement('div');
        container.className = `message ${sender}`;
        container.dataset.timestamp = timestamp;

        if (animated) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
        }

        // Avatar
        const avatar = this.createAvatar(sender);
        container.appendChild(avatar);

        // Content wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'message-content-wrapper';

        // Content
        const content = this.createContent(message, format);
        wrapper.appendChild(content);

        // Time
        if (showTime) {
            const time = this.createTime(timestamp);
            wrapper.appendChild(time);
        }

        container.appendChild(wrapper);

        // Actions
        if (showActions) {
            const actions = this.createActions(message, sender);
            container.appendChild(actions);
        }

        // Анімація
        if (animated) {
            setTimeout(() => {
                container.style.transition = 'all 0.3s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 10);
        }

        return container;
    }

    // ========================================
    // CREATE ELEMENTS
    // ========================================

    createAvatar(sender) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        const icons = {
            user: '👤',
            assistant: '🤖',
            gemini: '✨',
            deepseek: '💻',
            system: 'ℹ️',
            error: '❌'
        };

        avatar.textContent = icons[sender] || icons.assistant;
        return avatar;
    }

    createContent(message, format) {
        const container = document.createElement('div');
        container.className = 'message-content';

        // Авто-визначення формату
        if (format === 'auto') {
            format = this.detectFormat(message);
        }

        // Рендерити відповідним renderer
        const renderer = this.renderers.get(format);
        if (renderer) {
            const rendered = renderer(message);
            container.appendChild(rendered);
        } else {
            container.textContent = message;
        }

        // Підсвітка коду якщо є Prism
        if (typeof Prism !== 'undefined') {
            setTimeout(() => {
                Prism.highlightAllUnder(container);
            }, 0);
        }

        return container;
    }

    createTime(timestamp) {
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(timestamp);
        time.title = new Date(timestamp).toLocaleString('uk-UA');
        return time;
    }

    createActions(message, sender) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';

        // Copy
        const copyBtn = this.createActionButton('📋', 'Копіювати', () => {
            this.copyToClipboard(message, copyBtn);
        });
        actions.appendChild(copyBtn);

        // Speak (TTS)
        if ('speechSynthesis' in window) {
            const speakBtn = this.createActionButton('🔊', 'Озвучити', () => {
                this.speak(message);
            });
            actions.appendChild(speakBtn);
        }

        // Regenerate (тільки для AI)
        if (sender === 'assistant' || sender === 'gemini' || sender === 'deepseek') {
            const regenBtn = this.createActionButton('🔄', 'Регенерувати', () => {
                this.regenerate();
            });
            actions.appendChild(regenBtn);
        }

        return actions;
    }

    createActionButton(icon, title, onClick) {
        const button = document.createElement('button');
        button.className = 'message-action-btn';
        button.innerHTML = icon;
        button.title = title;
        button.onclick = onClick;
        return button;
    }

    // ========================================
    // RENDERERS
    // ========================================

    renderBasicMarkdown(text) {
        const div = document.createElement('div');
        let html = text;

        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const escaped = this.escapeHTML(code.trim());
            return `<pre><code class="language-${language}">${escaped}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        div.innerHTML = html;
        return div;
    }

    renderCodeBlock(code, language) {
        const pre = document.createElement('pre');
        const codeEl = document.createElement('code');
        codeEl.className = `language-${language}`;
        codeEl.textContent = code;
        pre.appendChild(codeEl);
        return pre;
    }

    // ========================================
    // ACTIONS HANDLERS
    // ========================================

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);

            const originalHTML = button.innerHTML;
            button.innerHTML = '✓';
            button.classList.add('success');

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('success');
            }, 2000);

        } catch (error) {
            console.error('Copy failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка копіювання', 'error');
            }
        }
    }

    speak(text) {
        if (!('speechSynthesis' in window)) return;

        // Зупинити попереднє
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'uk-UA';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        speechSynthesis.speak(utterance);
    }

    regenerate() {
        if (window.eventBus) {
            eventBus.emit('message:regenerate');
        }
    }

    // ========================================
    // FORMAT DETECTION
    // ========================================

    detectFormat(text) {
        // Code block
        if (/```[\s\S]*?```/.test(text)) {
            return 'markdown';
        }

        // Inline code
        if (/`[^`]+`/.test(text)) {
            return 'markdown';
        }

        // Bold/Italic
        if (/\*\*.*?\*\*|\*.*?\*/.test(text)) {
            return 'markdown';
        }

        // Links
        if (/\[.*?\]\(.*?\)/.test(text)) {
            return 'markdown';
        }

        // HTML tags
        if (/<[^>]+>/.test(text)) {
            return 'html';
        }

        return 'text';
    }

    // ========================================
    // CUSTOM RENDERERS
    // ========================================

    addRenderer(name, rendererFn) {
        this.renderers.set(name, rendererFn);
    }

    getRenderer(name) {
        return this.renderers.get(name);
    }

    hasRenderer(name) {
        return this.renderers.has(name);
    }

    // ========================================
    // UTILITY
    // ========================================

    escapeHTML(text) {
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();

        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isYesterday) {
            return 'Вчора ' + date.toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return date.toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ========================================
    // BATCH RENDERING
    // ========================================

    renderBatch(messages, options = {}) {
        const fragment = document.createDocumentFragment();

        messages.forEach((msg, index) => {
            const messageEl = this.render(msg.content, {
                ...options,
                sender: msg.role === 'user' ? 'user' : 'assistant',
                timestamp: msg.timestamp || Date.now() - (messages.length - index) * 1000,
                animated: false
            });

            fragment.appendChild(messageEl);
        });

        return fragment;
    }

    // ========================================
    // STREAM RENDERING
    // ========================================

    createStreamContainer(sender = 'assistant') {
        const container = this.render('', {
            sender,
            showActions: false,
            animated: true
        });

        container.classList.add('streaming');
        return container;
    }

    updateStream(container, chunk) {
        const content = container.querySelector('.message-content');
        if (content) {
            const currentText = content.textContent;
            content.textContent = currentText + chunk;
        }
    }

    finalizeStream(container) {
        container.classList.remove('streaming');

        // Додати actions
        const actions = this.createActions(
            container.querySelector('.message-content').textContent,
            container.classList.contains('user') ? 'user' : 'assistant'
        );
        container.appendChild(actions);

        // Підсвітити код
        if (typeof Prism !== 'undefined') {
            Prism.highlightAllUnder(container);
        }
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const messageRenderer = new MessageRenderer();

// Експорт
window.messageRenderer = messageRenderer;
window.MessageRenderer = MessageRenderer;

console.log('✅ Message Renderer loaded');
