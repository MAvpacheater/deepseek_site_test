// 📅 Date Formatter - Форматування дат

class DateFormatter {
    constructor() {
        this.locale = 'uk-UA';
    }

    // ========================================
    // ФОРМАТУВАННЯ
    // ========================================

    format(date, format = 'full') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const formats = {
            'full': { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            },
            'date': { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            },
            'short': { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
            },
            'time': { 
                hour: '2-digit', 
                minute: '2-digit'
            },
            'datetime': {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        };

        const options = formats[format] || formats.full;
        return d.toLocaleString(this.locale, options);
    }

    formatRelative(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) {
            return 'щойно';
        } else if (diffMins < 60) {
            return `${diffMins} ${this.plural(diffMins, 'хвилину', 'хвилини', 'хвилин')} тому`;
        } else if (diffHours < 24) {
            return `${diffHours} ${this.plural(diffHours, 'годину', 'години', 'годин')} тому`;
        } else if (diffDays === 1) {
            return 'вчора';
        } else if (diffDays < 7) {
            return `${diffDays} ${this.plural(diffDays, 'день', 'дні', 'днів')} тому`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} ${this.plural(weeks, 'тиждень', 'тижні', 'тижнів')} тому`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} ${this.plural(months, 'місяць', 'місяці', 'місяців')} тому`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} ${this.plural(years, 'рік', 'роки', 'років')} тому`;
        }
    }

    formatDistance(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffMs = Math.abs(d2 - d1);
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'сьогодні';
        if (diffDays === 1) return '1 день';
        return `${diffDays} днів`;
    }

    // ========================================
    // ОПЕРАЦІЇ З ДАТАМИ
    // ========================================

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    addHours(date, hours) {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    startOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    endOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    isSameDay(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    isToday(date) {
        return this.isSameDay(date, new Date());
    }

    isYesterday(date) {
        const yesterday = this.addDays(new Date(), -1);
        return this.isSameDay(date, yesterday);
    }

    isPast(date) {
        return new Date(date) < new Date();
    }

    isFuture(date) {
        return new Date(date) > new Date();
    }

    // ========================================
    // HELPERS
    // ========================================

    plural(n, one, few, many) {
        n = Math.abs(n) % 100;
        const n1 = n % 10;
        
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
    }

    getDayName(date) {
        const d = new Date(date);
        return d.toLocaleDateString(this.locale, { weekday: 'long' });
    }

    getMonthName(date) {
        const d = new Date(date);
        return d.toLocaleDateString(this.locale, { month: 'long' });
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ========================================
    // PARSING
    // ========================================

    parse(dateString) {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    isValid(date) {
        const d = new Date(date);
        return !isNaN(d.getTime());
    }

    // ========================================
    // FORMATTING PRESETS
    // ========================================

    formatForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 16);
    }

    formatISO(date) {
        if (!date) return '';
        return new Date(date).toISOString();
    }

    formatSQL(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 19).replace('T', ' ');
    }
}

// Експорт
const dateFormatter = new DateFormatter();
window.dateFormatter = dateFormatter;

// Backward compatibility
window.formatDate = (date, format) => dateFormatter.format(date, format);
window.formatRelativeTime = (date) => dateFormatter.formatRelative(date);

console.log('✅ Date Formatter utility loaded');
