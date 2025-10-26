// 📡 Event Bus - Глобальна система подій

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.wildcardListeners = [];
        this.history = [];
        this.maxHistorySize = 100;
        this.isEnabled = true;
        this.debugMode = false;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        // Глобальний обробник помилок для listeners
        this.errorHandler = (error, eventName, listener) => {
            console.error(`❌ EventBus error in "${eventName}":`, error);
            
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'event_bus_error',
                    message: `Event listener error: ${eventName}`,
                    error: error.message,
                    stack: error.stack,
                    severity: 'medium',
                    context: 'EventBus'
                });
            }
        };

        console.log('✅ Event Bus initialized');
    }

    // ========================================
    // ПІДПИСКА НА ПОДІЇ
    // ========================================

    /**
     * Підписатися на подію
     * @param {string} eventName - Назва події
     * @param {Function} callback - Функція-обробник
     * @param {Object} options - Опції (priority, context)
     * @returns {Function} - Функція для відписки
     */
    on(eventName, callback, options = {}) {
        if (!eventName || typeof callback !== 'function') {
            console.error('EventBus.on: Invalid arguments');
            return () => {};
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listener = {
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            id: this.generateListenerId()
        };

        const listeners = this.events.get(eventName);
        listeners.push(listener);

        // Сортувати за пріоритетом (вищий пріоритет - перший)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`📡 Subscribed to "${eventName}" (priority: ${listener.priority})`);
        }

        // Повернути функцію для відписки
        return () => this.off(eventName, callback);
    }

    /**
     * Підписатися на подію (спрацює лише один раз)
     * @param {string} eventName - Назва події
     * @param {Function} callback - Функція-обробник
     * @param {Object} options - Опції
     * @returns {Function} - Функція для відписки
     */
    once(eventName, callback, options = {}) {
        if (!eventName || typeof callback !== 'function') {
            console.error('EventBus.once: Invalid arguments');
            return () => {};
        }

        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }

        const listener = {
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            id: this.generateListenerId()
        };

        this.onceEvents.get(eventName).push(listener);

        if (this.debugMode) {
            console.log(`📡 Subscribed to "${eventName}" (once)`);
        }

        return () => this.offOnce(eventName, callback);
    }

    /**
     * Підписатися на всі події (wildcard)
     * @param {Function} callback - Функція-обробник
     * @returns {Function} - Функція для відписки
     */
    onAny(callback) {
        if (typeof callback !== 'function') {
            console.error('EventBus.onAny: Invalid callback');
            return () => {};
        }

        this.wildcardListeners.push(callback);

        if (this.debugMode) {
            console.log('📡 Subscribed to all events (wildcard)');
        }

        return () => {
            const index = this.wildcardListeners.indexOf(callback);
            if (index > -1) {
                this.wildcardListeners.splice(index, 1);
            }
        };
    }

    // ========================================
    // ВІДПИСКА
    // ========================================

    /**
     * Відписатися від події
     * @param {string} eventName - Назва події
     * @param {Function} callback - Функція-обробник
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(l => l.callback === callback);

        if (index > -1) {
            listeners.splice(index, 1);

            if (this.debugMode) {
                console.log(`📡 Unsubscribed from "${eventName}"`);
            }
        }

        // Видалити масив якщо порожній
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Відписатися від once події
     */
    offOnce(eventName, callback) {
        if (!this.onceEvents.has(eventName)) return;

        const listeners = this.onceEvents.get(eventName);
        const index = listeners.findIndex(l => l.callback === callback);

        if (index > -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.onceEvents.delete(eventName);
        }
    }

    /**
     * Відписатися від всіх обробників події
     * @param {string} eventName - Назва події
     */
    offAll(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            this.onceEvents.delete(eventName);

            if (this.debugMode) {
                console.log(`📡 Removed all listeners for "${eventName}"`);
            }
        } else {
            // Відписатися від ВСІХ подій
            this.events.clear();
            this.onceEvents.clear();
            this.wildcardListeners = [];

            if (this.debugMode) {
                console.log('📡 Removed ALL listeners');
            }
        }
    }

    // ========================================
    // ВИПРОМІНЮВАННЯ ПОДІЙ
    // ========================================

    /**
     * Випромінити подію
     * @param {string} eventName - Назва події
     * @param {*} data - Дані події
     * @param {Object} options - Опції (async)
     */
    emit(eventName, data = {}, options = {}) {
        if (!this.isEnabled) return;

        if (!eventName) {
            console.error('EventBus.emit: Event name is required');
            return;
        }

        // Записати в історію
        this.addToHistory(eventName, data);

        if (this.debugMode) {
            console.log(`📡 Emitting "${eventName}"`, data);
        }

        // Викликати обробники
        if (options.async) {
            this.emitAsync(eventName, data);
        } else {
            this.emitSync(eventName, data);
        }
    }

    /**
     * Синхронне випромінювання
     */
    emitSync(eventName, data) {
        // 1. Wildcard listeners
        this.wildcardListeners.forEach(callback => {
            this.executeListener(callback, eventName, data);
        });

        // 2. Once listeners
        if (this.onceEvents.has(eventName)) {
            const onceListeners = [...this.onceEvents.get(eventName)];
            this.onceEvents.delete(eventName);

            onceListeners.forEach(listener => {
                this.executeListener(listener.callback, eventName, data, listener.context);
            });
        }

        // 3. Regular listeners
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            
            listeners.forEach(listener => {
                this.executeListener(listener.callback, eventName, data, listener.context);
            });
        }
    }

    /**
     * Асинхронне випромінювання
     */
    async emitAsync(eventName, data) {
        // Wildcard
        await Promise.all(
            this.wildcardListeners.map(callback => 
                this.executeListenerAsync(callback, eventName, data)
            )
        );

        // Once
        if (this.onceEvents.has(eventName)) {
            const onceListeners = [...this.onceEvents.get(eventName)];
            this.onceEvents.delete(eventName);

            await Promise.all(
                onceListeners.map(listener =>
                    this.executeListenerAsync(listener.callback, eventName, data, listener.context)
                )
            );
        }

        // Regular
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            
            await Promise.all(
                listeners.map(listener =>
                    this.executeListenerAsync(listener.callback, eventName, data, listener.context)
                )
            );
        }
    }

    /**
     * Виконати listener
     */
    executeListener(callback, eventName, data, context = null) {
        try {
            if (context) {
                callback.call(context, data, eventName);
            } else {
                callback(data, eventName);
            }
        } catch (error) {
            this.errorHandler(error, eventName, callback);
        }
    }

    /**
     * Виконати listener асинхронно
     */
    async executeListenerAsync(callback, eventName, data, context = null) {
        try {
            if (context) {
                await callback.call(context, data, eventName);
            } else {
                await callback(data, eventName);
            }
        } catch (error) {
            this.errorHandler(error, eventName, callback);
        }
    }

    // ========================================
    // UTILITY МЕТОДИ
    // ========================================

    /**
     * Перевірити чи є обробники для події
     */
    hasListeners(eventName) {
        return (
            (this.events.has(eventName) && this.events.get(eventName).length > 0) ||
            (this.onceEvents.has(eventName) && this.onceEvents.get(eventName).length > 0) ||
            this.wildcardListeners.length > 0
        );
    }

    /**
     * Отримати кількість обробників
     */
    getListenerCount(eventName) {
        let count = 0;

        if (this.events.has(eventName)) {
            count += this.events.get(eventName).length;
        }

        if (this.onceEvents.has(eventName)) {
            count += this.onceEvents.get(eventName).length;
        }

        return count;
    }

    /**
     * Отримати всі назви подій
     */
    getEventNames() {
        const names = new Set([
            ...this.events.keys(),
            ...this.onceEvents.keys()
        ]);

        return Array.from(names);
    }

    /**
     * Увімкнути/вимкнути EventBus
     */
    enable() {
        this.isEnabled = true;
        console.log('📡 EventBus enabled');
    }

    disable() {
        this.isEnabled = false;
        console.log('📡 EventBus disabled');
    }

    /**
     * Увімкнути/вимкнути debug режим
     */
    setDebug(enabled) {
        this.debugMode = enabled;
        console.log(`📡 EventBus debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    // ========================================
    // ІСТОРІЯ ПОДІЙ
    // ========================================

    addToHistory(eventName, data) {
        this.history.unshift({
            eventName,
            data,
            timestamp: Date.now(),
            date: new Date().toISOString()
        });

        // Обмежити розмір історії
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
    }

    getHistory(eventName = null, limit = 10) {
        if (eventName) {
            return this.history
                .filter(entry => entry.eventName === eventName)
                .slice(0, limit);
        }

        return this.history.slice(0, limit);
    }

    clearHistory() {
        this.history = [];
        console.log('📡 EventBus history cleared');
    }

    // ========================================
    // HELPER МЕТОДИ
    // ========================================

    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================
    // ДІАГНОСТИКА
    // ========================================

    getStats() {
        const eventNames = this.getEventNames();
        
        const stats = {
            totalEvents: eventNames.length,
            totalListeners: 0,
            wildcardListeners: this.wildcardListeners.length,
            historySize: this.history.length,
            isEnabled: this.isEnabled,
            debugMode: this.debugMode,
            events: {}
        };

        eventNames.forEach(name => {
            const count = this.getListenerCount(name);
            stats.totalListeners += count;
            stats.events[name] = count;
        });

        return stats;
    }

    debug() {
        const stats = this.getStats();

        console.group('📡 EventBus Debug Info');
        console.log('Status:', this.isEnabled ? '✅ Enabled' : '❌ Disabled');
        console.log('Debug Mode:', this.debugMode ? 'ON' : 'OFF');
        console.log('Total Events:', stats.totalEvents);
        console.log('Total Listeners:', stats.totalListeners);
        console.log('Wildcard Listeners:', stats.wildcardListeners);
        console.log('History Size:', stats.historySize);
        console.log('\nEvents:');
        console.table(stats.events);
        console.log('\nRecent History:');
        console.table(this.getHistory(null, 5));
        console.groupEnd();
    }

    // ========================================
    // ПРЕДЕФІНОВАНІ ПОДІЇ
    // ========================================

    /**
     * Стандартні події системи
     */
    static get Events() {
        return {
            // App lifecycle
            APP_READY: 'app:ready',
            APP_ERROR: 'app:error',
            
            // Mode changes
            MODE_CHANGE: 'mode:change',
            MODE_BEFORE_CHANGE: 'mode:beforeChange',
            
            // Chat events
            MESSAGE_SEND: 'chat:send',
            MESSAGE_RECEIVE: 'chat:receive',
            CHAT_CLEAR: 'chat:clear',
            
            // Code events
            CODE_GENERATE: 'code:generate',
            CODE_UPDATE: 'code:update',
            CODE_DELETE: 'code:delete',
            FILE_SWITCH: 'code:fileSwitch',
            
            // Image events
            IMAGE_GENERATE: 'image:generate',
            IMAGE_READY: 'image:ready',
            
            // Storage events
            DATA_SAVE: 'storage:save',
            DATA_LOAD: 'storage:load',
            DATA_DELETE: 'storage:delete',
            
            // UI events
            THEME_CHANGE: 'ui:themeChange',
            SIDEBAR_TOGGLE: 'ui:sidebarToggle',
            MODAL_OPEN: 'ui:modalOpen',
            MODAL_CLOSE: 'ui:modalClose',
            
            // Agent events
            AGENT_ACTIVE: 'agent:active',
            TASK_ADD: 'agent:taskAdd',
            TASK_COMPLETE: 'agent:taskComplete',
            MEMORY_ADD: 'agent:memoryAdd',
            
            // Error events
            ERROR_OCCURRED: 'error:occurred',
            API_ERROR: 'error:api',
            STORAGE_ERROR: 'error:storage'
        };
    }
}

// ========================================
// ГЛОБАЛЬНИЙ ЕКЗЕМПЛЯР
// ========================================

const eventBus = new EventBus();

// Експорт
window.eventBus = eventBus;
window.EventBusEvents = EventBus.Events;

// ========================================
// ІНТЕГРАЦІЯ З APPSTATE
// ========================================

// Якщо appState вже існує - підключити EventBus
if (window.appState) {
    const originalNotify = appState.notify.bind(appState);
    
    appState.notify = function(event, data) {
        // Викликати оригінальний notify
        originalNotify(event, data);
        
        // Також випромінити через EventBus
        eventBus.emit(event, data);
    };
    
    console.log('✅ EventBus integrated with AppState');
}

// ========================================
// HELPER ФУНКЦІЇ
// ========================================

/**
 * Швидкий доступ до подій
 */
window.on = (event, callback, options) => eventBus.on(event, callback, options);
window.once = (event, callback, options) => eventBus.once(event, callback, options);
window.emit = (event, data, options) => eventBus.emit(event, data, options);
window.off = (event, callback) => eventBus.off(event, callback);

console.log('✅ Event Bus loaded');
