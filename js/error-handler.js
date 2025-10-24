// 🛡️ Error Handler - Централізована система обробки помилок

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.rateLimits = new Map();
        this.initGlobalHandlers();
    }

    // ========================================
    // ГЛОБАЛЬНІ ОБРОБНИКИ
    // ========================================

    initGlobalHandlers() {
        // Перехоплення необроблених помилок
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'runtime_error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
            event.preventDefault();
        });

        // Перехоплення необроблених Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'promise_rejection',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack
            });
            event.preventDefault();
        });

        console.log('✅ Global error handlers initialized');
    }

    // ========================================
    // ЛОГУВАННЯ ПОМИЛОК
    // ========================================

    logError(error) {
        const errorEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...error
        };

        this.errors.unshift(errorEntry);

        // Обмежити розмір масиву
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Зберегти в localStorage
        try {
            localStorage.setItem('error_log', JSON.stringify(this.errors.slice(0, 50)));
        } catch (e) {
            console.warn('Failed to save error log:', e);
        }

        // Вивести в консоль
        console.error('🔴 Error logged:', errorEntry);

        // Відобразити для користувача (тільки критичні)
        if (error.severity === 'critical' || error.showToUser) {
            this.showErrorToUser(error);
        }

        return errorEntry;
    }

    showErrorToUser(error) {
        const message = this.getUserFriendlyMessage(error);
        this.showToast(message, 'error');
    }

    getUserFriendlyMessage(error) {
        const messages = {
            'api_error': '❌ Помилка з\'єднання з AI сервісом',
            'network_error': '🌐 Перевір інтернет з\'єднання',
            'auth_error': '🔑 Невірний API ключ',
            'rate_limit': '⏱️ Занадто багато запитів. Почекай трохи',
            'storage_error': '💾 Проблема зі збереженням даних',
            'validation_error': '⚠️ Невірні дані'
        };

        return messages[error.type] || error.message || '❌ Щось пішло не так';
    }

    // ========================================
    // API WRAPPER З RETRY
    // ========================================

    async fetchWithRetry(url, options = {}, retries = this.retryAttempts) {
        const controller = new AbortController();
        const timeout = options.timeout || 30000;

        // Встановити таймаут
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // Перевірити rate limit
            if (!this.checkRateLimit(url)) {
                throw new Error('Rate limit exceeded');
            }

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Оновити rate limit
            this.updateRateLimit(url);

            if (!response.ok) {
                throw await this.createApiError(response);
            }

            return response;

        } catch (error) {
            clearTimeout(timeoutId);

            // Якщо це abort (timeout)
            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`);
                timeoutError.type = 'timeout_error';
                throw timeoutError;
            }

            // Якщо це мережева помилка і є спроби
            if (retries > 0 && this.isRetryableError(error)) {
                console.warn(`⚠️ Retry attempt ${this.retryAttempts - retries + 1}/${this.retryAttempts}`);
                await this.delay(this.retryDelay * (this.retryAttempts - retries + 1));
                return this.fetchWithRetry(url, options, retries - 1);
            }

            // Логувати помилку
            this.logError({
                type: this.getErrorType(error),
                message: error.message,
                url: url,
                stack: error.stack,
                severity: 'high'
            });

            throw error;
        }
    }

    async createApiError(response) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { message: response.statusText };
        }

        const error = new Error(errorData.error?.message || errorData.message || 'API Error');
        error.type = 'api_error';
        error.status = response.status;
        error.data = errorData;

        // Специфічні типи помилок
        if (response.status === 401 || response.status === 403) {
            error.type = 'auth_error';
        } else if (response.status === 429) {
            error.type = 'rate_limit';
        } else if (response.status >= 500) {
            error.type = 'server_error';
        }

        return error;
    }

    isRetryableError(error) {
        // Не retry для цих помилок
        const nonRetryable = ['auth_error', 'validation_error', 'rate_limit'];
        if (nonRetryable.includes(error.type)) return false;

        // Retry для мережевих помилок та 5xx
        return error.type === 'network_error' || 
               error.type === 'server_error' ||
               error.type === 'timeout_error' ||
               error.status >= 500;
    }

    getErrorType(error) {
        if (error.type) return error.type;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'network_error';
        }
        return 'unknown_error';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================
    // RATE LIMITING
    // ========================================

    checkRateLimit(key) {
        const now = Date.now();
        const limit = this.rateLimits.get(key);

        if (!limit) return true;

        // Перевірити чи минув час
        if (now - limit.lastRequest < limit.minInterval) {
            return false;
        }

        // Перевірити кількість запитів
        const recentRequests = limit.requests.filter(time => now - time < limit.window);
        return recentRequests.length < limit.maxRequests;
    }

    updateRateLimit(key) {
        const now = Date.now();
        const limit = this.rateLimits.get(key) || {
            minInterval: 100, // 100ms між запитами
            maxRequests: 60,  // 60 запитів
            window: 60000,    // за 1 хвилину
            requests: [],
            lastRequest: 0
        };

        limit.requests.push(now);
        limit.lastRequest = now;

        // Очистити старі запити
        limit.requests = limit.requests.filter(time => now - time < limit.window);

        this.rateLimits.set(key, limit);
    }

    setRateLimit(key, options) {
        this.rateLimits.set(key, {
            minInterval: options.minInterval || 100,
            maxRequests: options.maxRequests || 60,
            window: options.window || 60000,
            requests: [],
            lastRequest: 0
        });
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    showToast(message, type = 'info', duration = 5000) {
        // Створити контейнер якщо немає
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        // Створити toast
        const toast = document.createElement('div');
        const colors = {
            error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };

        toast.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
            cursor: pointer;
            font-size: 14px;
            line-height: 1.5;
        `;

        const icons = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span style="font-size: 20px;">${icons[type] || icons.info}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; opacity: 0.7;">✕</button>
        `;

        // Додати CSS анімацію
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(toast);

        // Автоматично видалити
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        // Клік для закриття
        toast.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        });

        return toast;
    }

    // ========================================
    // SAFE WRAPPERS
    // ========================================

    safeExecute(fn, fallback = null, context = 'Unknown') {
        try {
            return fn();
        } catch (error) {
            this.logError({
                type: 'execution_error',
                message: error.message,
                context: context,
                stack: error.stack,
                severity: 'medium'
            });
            return fallback;
        }
    }

    async safeExecuteAsync(fn, fallback = null, context = 'Unknown') {
        try {
            return await fn();
        } catch (error) {
            this.logError({
                type: 'async_error',
                message: error.message,
                context: context,
                stack: error.stack,
                severity: 'medium'
            });
            return fallback;
        }
    }

    wrapFunction(fn, context = 'Unknown') {
        return (...args) => {
            return this.safeExecute(() => fn(...args), null, context);
        };
    }

    wrapAsyncFunction(fn, context = 'Unknown') {
        return async (...args) => {
            return await this.safeExecuteAsync(() => fn(...args), null, context);
        };
    }

    // ========================================
    // STORAGE SAFE WRAPPER
    // ========================================

    safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.logError({
                    type: 'storage_error',
                    message: 'localStorage quota exceeded',
                    severity: 'high',
                    showToUser: true
                });
                this.showToast('💾 Сховище переповнене! Очисти старі дані.', 'error');
            } else {
                this.logError({
                    type: 'storage_error',
                    message: error.message,
                    key: key,
                    severity: 'medium'
                });
            }
            return false;
        }
    }

    safeStorageGet(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            this.logError({
                type: 'storage_error',
                message: 'Failed to parse localStorage item',
                key: key,
                error: error.message,
                severity: 'low'
            });
            return defaultValue;
        }
    }

    // ========================================
    // ERROR REPORTING
    // ========================================

    getErrorReport() {
        return {
            totalErrors: this.errors.length,
            recentErrors: this.errors.slice(0, 10),
            errorsByType: this.groupErrorsByType(),
            criticalErrors: this.errors.filter(e => e.severity === 'critical').length
        };
    }

    groupErrorsByType() {
        const grouped = {};
        this.errors.forEach(error => {
            const type = error.type || 'unknown';
            grouped[type] = (grouped[type] || 0) + 1;
        });
        return grouped;
    }

    exportErrors() {
        const report = this.getErrorReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearErrors() {
        this.errors = [];
        localStorage.removeItem('error_log');
    }

    // ========================================
    // DEBUG PANEL
    // ========================================

    showDebugPanel() {
        const report = this.getErrorReport();
        
        let html = '🛡️ ERROR HANDLER DEBUG\n\n';
        html += `Total errors: ${report.totalErrors}\n`;
        html += `Critical errors: ${report.criticalErrors}\n\n`;
        
        html += 'Errors by type:\n';
        Object.entries(report.errorsByType).forEach(([type, count]) => {
            html += `  ${type}: ${count}\n`;
        });
        
        html += '\nRecent errors:\n';
        report.recentErrors.forEach((error, i) => {
            html += `\n${i + 1}. [${error.type}] ${error.message}\n`;
            html += `   ${new Date(error.timestamp).toLocaleString()}\n`;
        });

        alert(html);
    }
}

// ========================================
// GLOBAL INSTANCE
// ========================================

const errorHandler = new ErrorHandler();

// Налаштувати rate limits для API
errorHandler.setRateLimit('gemini_api', {
    minInterval: 1000,
    maxRequests: 15,
    window: 60000
});

errorHandler.setRateLimit('groq_api', {
    minInterval: 500,
    maxRequests: 30,
    window: 60000
});

// ========================================
// EXPORT
// ========================================

window.errorHandler = errorHandler;
window.showToast = errorHandler.showToast.bind(errorHandler);

console.log('✅ Error Handler initialized');
