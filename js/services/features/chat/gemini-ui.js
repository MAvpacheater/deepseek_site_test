// ✨ Gemini UI Controller - Управління інтерфейсом Gemini Chat

class GeminiUIController {
    constructor() {
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.isAutoScroll = true;
        this.lastMessageId = null;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.messagesContainer = document.getElementById('geminiMessages');
        this.inputField = document.getElementById('geminiInput');
        this.sendButton = document.getElementById('geminiSendBtn');
        
        this.setupEventListeners();
        this.setupAutoResize();
        this.loadHistory();
        
        console.log('✅ Gemini UI Controller initialized');
    }

    setupEventListeners() {
        // Send button
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.handleSend());
        }

        // Enter для відправки
        if (this.inputField) {
            this.inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.handleSend();
                }
                // Ctrl+Enter для нового рядка
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    const pos = this.inputField.selectionStart;
                    const text = this.inputField.value;
                    this.inputField.value = text.slice(0, pos) + '\n' + text.slice(pos);
                    this.inputField.selectionStart = this.inputField.selectionEnd = pos + 1;
                }
            });
        }

        // Відстежувати scroll
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener('scroll', () => {
                this.checkAutoScroll();
            });
        }

        // Підписатися на події
        if (window.eventBus) {
            eventBus.on('gemini:message', ({ message }) => {
                this.onNewMessage(message);
            });
            
            eventBus.on('gemini:clear', () => {
                this.clearMessages();
            });
        }
    }

    setupAutoResize() {
        if (!this.inputField) return;

        this.inputField.addEventListener('input', () => {
            this.inputField.style.height = 'auto';
            this.inputField.style.height = Math.min(this.inputField.scrollHeight, 150) + 'px';
        });
    }

    // ========================================
    // HANDLE SEND
    // ========================================

    async handleSend() {
        if (!this.inputField || !window.geminiChat) return;

        const message = this.inputField.value.trim();
        if (!message) {
            if (window.showToast) {
                showToast('⚠️ Введи повідомлення', 'warning');
            }
            return;
        }

        // Очистити input
        this.inputField.value = '';
        this.inputField.style.height = 'auto';

        // Відправити через geminiChat
        await geminiChat.sendMessage();
    }

    // ========================================
    // RENDER MESSAGES
    // ========================================

    onNewMessage(message) {
        const role = message.role === 'user' ? 'user' : 'assistant';
        const content = message.parts?.[0]?.text || '';
        
        if (content) {
            this.renderMessage(content, role, message.timestamp);
        }
    }

    renderMessage(text, sender, timestamp = Date.now()) {
        if (!this.messagesContainer) return;

        const messageElement = this.createMessageElement(text, sender, timestamp);
        
        this.messagesContainer.appendChild(messageElement);
        
        // Auto-scroll якщо увімкнено
        if (this.isAutoScroll) {
            this.scrollToBottom();
        }

        // Анімація появи
        setTimeout(() => {
            messageElement.classList.add('message-visible');
        }, 10);

        this.lastMessageId = timestamp;
    }

    createMessageElement(text, sender, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.dataset.timestamp = timestamp;
        
        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '✨';
        
        // Content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';
        
        // Content
        const content = document.createElement('div');
        content.className = 'message-content';
        
        // Перевірити чи є markdown/code blocks
        if (this.hasCodeBlocks(text)) {
            content.innerHTML = this.renderMarkdown(text);
        } else {
            content.textContent = text;
        }
        
        // Time
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(timestamp);
        
        // Actions
        const actions = this.createMessageActions(text, sender);
        
        contentWrapper.appendChild(content);
        contentWrapper.appendChild(time);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);
        messageDiv.appendChild(actions);
        
        return messageDiv;
    }

    createMessageActions(text, sender) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Копіювати';
        copyBtn.onclick = () => this.copyText(text, copyBtn);
        
        actions.appendChild(copyBtn);
        
        // Regenerate button (тільки для AI)
        if (sender === 'assistant') {
            const regenBtn = document.createElement('button');
            regenBtn.className = 'message-action-btn';
            regenBtn.innerHTML = '🔄';
            regenBtn.title = 'Регенерувати';
            regenBtn.onclick = () => this.regenerateResponse();
            actions.appendChild(regenBtn);
        }
        
        return actions;
    }

    // ========================================
    // ACTIONS
    // ========================================

    async copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            const originalText = button.innerHTML;
            button.innerHTML = '✓';
            button.classList.add('success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            if (window.showToast) {
                showToast('❌ Помилка копіювання', 'error');
            }
        }
    }

    async regenerateResponse() {
        if (!window.geminiChat) return;
        
        // Видалити останнє AI повідомлення
        const messages = this.messagesContainer.querySelectorAll('.message.assistant');
        const lastAI = messages[messages.length - 1];
        
        if (lastAI) {
            lastAI.remove();
        }

        // Отримати останнє user повідомлення
        const userMessages = this.messagesContainer.querySelectorAll('.message.user');
        const lastUser = userMessages[userMessages.length - 1];
        
        if (lastUser) {
            const text = lastUser.querySelector('.message-content').textContent;
            
            if (this.inputField) {
                this.inputField.value = text;
            }
            
            await geminiChat.sendMessage();
        }
    }

    // ========================================
    // RENDER MARKDOWN
    // ========================================

    hasCodeBlocks(text) {
        return /```[\s\S]*?```/.test(text);
    }

    renderMarkdown(text) {
        if (window.sanitizer && typeof sanitizer.renderMarkdown === 'function') {
            return sanitizer.renderMarkdown(text);
        }

        // Fallback - базовий рендеринг
        let html = text;
        
        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const escaped = this.escapeHTML(code);
            return `<pre><code class="language-${language}">${escaped}</code></pre>`;
        });
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        return html;
    }

    escapeHTML(text) {
        if (window.sanitizer) {
            return sanitizer.escapeHTML(text);
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // LOAD HISTORY
    // ========================================

    loadHistory() {
        if (!window.appState) return;

        const messages = appState.getGeminiMessages ? 
            appState.getGeminiMessages() : 
            [];

        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.parts?.[0]?.text || '';
            const timestamp = msg.timestamp || Date.now();
            
            if (content) {
                this.renderMessage(content, role, timestamp);
            }
        });
    }

    // ========================================
    // CLEAR
    // ========================================

    clearMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }

    // ========================================
    // SCROLL
    // ========================================

    scrollToBottom(smooth = true) {
        if (!this.messagesContainer) return;
        
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    checkAutoScroll() {
        if (!this.messagesContainer) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        this.isAutoScroll = isAtBottom;
    }

    // ========================================
    // LOADING STATE
    // ========================================

    setLoading(isLoading) {
        if (this.sendButton) {
            this.sendButton.disabled = isLoading;
            
            if (isLoading) {
                this.sendButton.innerHTML = `
                    <div class="loading-dots">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                `;
            } else {
                this.sendButton.textContent = 'Надіслати';
            }
        }

        if (this.inputField) {
            this.inputField.disabled = isLoading;
        }
    }

    showTypingIndicator() {
        if (!this.messagesContainer) return;

        const indicator = document.createElement('div');
        indicator.className = 'message assistant typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar">✨</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // ========================================
    // UTILITY
    // ========================================

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
        
        return date.toLocaleString('uk-UA', { 
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getMessageCount() {
        if (!this.messagesContainer) return 0;
        return this.messagesContainer.querySelectorAll('.message').length;
    }

    // ========================================
    // EXPORT
    // ========================================

    async exportAsText() {
        const messages = this.messagesContainer.querySelectorAll('.message');
        let text = 'Gemini Chat Експорт\n';
        text += `${new Date().toLocaleString('uk-UA')}\n\n`;
        text += '---\n\n';

        messages.forEach((msg, i) => {
            const sender = msg.classList.contains('user') ? 'Користувач' : 'Gemini';
            const content = msg.querySelector('.message-content').textContent;
            
            text += `${sender}:\n${content}\n\n`;
        });

        return text;
    }

    async exportAsMarkdown() {
        const messages = this.messagesContainer.querySelectorAll('.message');
        let md = '# Gemini Chat\n\n';
        md += `**Експортовано:** ${new Date().toLocaleString('uk-UA')}\n\n`;
        md += '---\n\n';

        messages.forEach((msg) => {
            const sender = msg.classList.contains('user') ? '👤 Користувач' : '✨ Gemini';
            const content = msg.querySelector('.message-content').textContent;
            
            md += `## ${sender}\n\n${content}\n\n`;
        });

        return md;
    }

    // ========================================
    // DEBUG
    // ========================================

    debug() {
        console.group('✨ Gemini UI Debug');
        console.log('Messages:', this.getMessageCount());
        console.log('Auto-scroll:', this.isAutoScroll);
        console.log('Last message ID:', this.lastMessageId);
        console.groupEnd();
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

let geminiUI = null;

document.addEventListener('DOMContentLoaded', () => {
    geminiUI = new GeminiUIController();
});

// Експорт
window.geminiUI = geminiUI;
window.GeminiUIController = GeminiUIController;

console.log('✅ Gemini UI Controller loaded');
