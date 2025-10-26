// 🛠️ Helpers - Utility Functions

class Helpers {
    // ========================================
    // STRING UTILITIES
    // ========================================

    static truncate(str, maxLength = 100, suffix = '...') {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }

    static slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return text.replace(/[&<>"'/]/g, char => map[char]);
    }

    static unescapeHtml(text) {
        if (!text) return '';
        const map = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x2F;': '/'
        };
        return text.replace(/&(amp|lt|gt|quot|#x27|#x2F);/g, match => map[match]);
    }

    static stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    static countWords(str) {
        if (!str) return 0;
        return str.trim().split(/\s+/).length;
    }

    static extractUrls(text) {
        if (!text) return [];
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    }

    // ========================================
    // NUMBER UTILITIES
    // ========================================

    static formatNumber(num, decimals = 0) {
        if (typeof num !== 'number') return num;
        return num.toLocaleString('uk-UA', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    static formatPercentage(value, total, decimals = 1) {
        if (total === 0) return '0%';
        const percentage = (value / total) * 100;
        return percentage.toFixed(decimals) + '%';
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static randomFloat(min, max, decimals = 2) {
        const value = Math.random() * (max - min) + min;
        return parseFloat(value.toFixed(decimals));
    }

    // ========================================
    // ARRAY UTILITIES
    // ========================================

    static chunk(array, size) {
        if (!Array.isArray(array) || size <= 0) return [];
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static shuffle(array) {
        if (!Array.isArray(array)) return array;
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static unique(array) {
        if (!Array.isArray(array)) return [];
        return [...new Set(array)];
    }

    static groupBy(array, key) {
        if (!Array.isArray(array)) return {};
        return array.reduce((result, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            (result[group] = result[group] || []).push(item);
            return result;
        }, {});
    }

    static sortBy(array, key, ascending = true) {
        if (!Array.isArray(array)) return [];
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }

    static findLast(array, predicate) {
        if (!Array.isArray(array)) return undefined;
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i], i, array)) {
                return array[i];
            }
        }
        return undefined;
    }

    // ========================================
    // OBJECT UTILITIES
    // ========================================

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('Deep clone failed, using shallow clone', error);
            return { ...obj };
        }
    }

    static deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    static pick(obj, keys) {
        if (!this.isObject(obj)) return {};
        return keys.reduce((result, key) => {
            if (key in obj) result[key] = obj[key];
            return result;
        }, {});
    }

    static omit(obj, keys) {
        if (!this.isObject(obj)) return {};
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    }

    static isEmpty(value) {
        if (value == null) return true;
        if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    // ========================================
    // ASYNC UTILITIES
    // ========================================

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxAttempts - 1) throw error;
                await this.sleep(delay * (i + 1));
            }
        }
    }

    // ========================================
    // VALIDATION UTILITIES
    // ========================================

    static isEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isValidJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    // ========================================
    // CLIPBOARD UTILITIES
    // ========================================

    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    textArea.remove();
                    return true;
                } catch (error) {
                    textArea.remove();
                    return false;
                }
            }
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    }

    static async readFromClipboard() {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                return await navigator.clipboard.readText();
            }
            return null;
        } catch (error) {
            console.error('Read clipboard failed:', error);
            return null;
        }
    }

    // ========================================
    // MISC UTILITIES
    // ========================================

    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static hashCode(str) {
        if (!str) return 0;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    static getRandomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    static parseQueryString(url = window.location.search) {
        const params = new URLSearchParams(url);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    static buildQueryString(params) {
        const query = new URLSearchParams(params);
        return query.toString();
    }
}

// Експорт
window.Helpers = Helpers;

console.log('✅ Helpers utility loaded');
