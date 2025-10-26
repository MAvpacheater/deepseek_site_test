// ✅ Validator Service - Валідація введених даних

class ValidatorService {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();
        this.initDefaultRules();
    }

    // ========================================
    // DEFAULT VALIDATION RULES
    // ========================================

    initDefaultRules() {
        // Required
        this.addRule('required', (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim() !== '';
            if (Array.isArray(value)) return value.length > 0;
            return true;
        }, 'Поле обов\'язкове');

        // Email
        this.addRule('email', (value) => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(value);
        }, 'Невірний формат email');

        // URL
        this.addRule('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        }, 'Невірний формат URL');

        // Min length
        this.addRule('minLength', (value, length) => {
            return value && value.length >= length;
        }, (length) => `Мінімум ${length} символів`);

        // Max length
        this.addRule('maxLength', (value, length) => {
            return !value || value.length <= length;
        }, (length) => `Максимум ${length} символів`);

        // Min value
        this.addRule('min', (value, min) => {
            return parseFloat(value) >= min;
        }, (min) => `Мінімальне значення: ${min}`);

        // Max value
        this.addRule('max', (value, max) => {
            return parseFloat(value) <= max;
        }, (max) => `Максимальне значення: ${max}`);

        // Pattern
        this.addRule('pattern', (value, pattern) => {
            const regex = new RegExp(pattern);
            return regex.test(value);
        }, 'Невірний формат');

        // Number
        this.addRule('number', (value) => {
            return !isNaN(value) && isFinite(value);
        }, 'Має бути числом');

        // Integer
        this.addRule('integer', (value) => {
            return Number.isInteger(parseFloat(value));
        }, 'Має бути цілим числом');

        // Alpha
        this.addRule('alpha', (value) => {
            return /^[a-zA-Zа-яА-ЯіїєґІЇЄҐ]+$/.test(value);
        }, 'Тільки літери');

        // Alphanumeric
        this.addRule('alphanumeric', (value) => {
            return /^[a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]+$/.test(value);
        }, 'Тільки літери та цифри');

        // Safe string (no XSS)
        this.addRule('safe', (value) => {
            if (window.sanitizer) {
                return !sanitizer.containsXSS(value);
            }
            return !/<script|javascript:|onerror|onclick/i.test(value);
        }, 'Небезпечний вміст');
    }

    // ========================================
    // ADD CUSTOM RULE
    // ========================================

    addRule(name, validatorFn, message) {
        this.rules.set(name, { validatorFn, message });
    }

    // ========================================
    // VALIDATE
    // ========================================

    /**
     * Валідувати значення за правилами
     */
    validate(value, rules = {}) {
        const errors = [];

        for (const [ruleName, ruleParam] of Object.entries(rules)) {
            const rule = this.rules.get(ruleName);
            
            if (!rule) {
                console.warn(`Unknown validation rule: ${ruleName}`);
                continue;
            }

            // Виконати валідацію
            let isValid;
            if (ruleParam === true || ruleParam === undefined) {
                isValid = rule.validatorFn(value);
            } else {
                isValid = rule.validatorFn(value, ruleParam);
            }

            if (!isValid) {
                // Отримати повідомлення про помилку
                let message;
                if (typeof rule.message === 'function') {
                    message = rule.message(ruleParam);
                } else {
                    message = rule.message;
                }
                
                errors.push(message);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            value
        };
    }

    /**
     * Валідувати об'єкт (кілька полів)
     */
    validateObject(data, schema) {
        const errors = {};
        let isValid = true;

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            const result = this.validate(value, rules);

            if (!result.valid) {
                errors[field] = result.errors;
                isValid = false;
            }
        }

        return {
            valid: isValid,
            errors,
            data
        };
    }

    // ========================================
    // API KEY VALIDATION
    // ========================================

    validateApiKey(key, type) {
        if (!key || key.trim() === '') {
            return {
                valid: false,
                message: 'API ключ не може бути порожнім'
            };
        }

        // Gemini API key
        if (type === 'gemini') {
            if (!key.startsWith('AIza')) {
                return {
                    valid: false,
                    message: 'Gemini ключ повинен починатися з "AIza"'
                };
            }
            if (key.length < 30) {
                return {
                    valid: false,
                    message: 'Gemini ключ занадто короткий'
                };
            }
        }

        // Groq API key
        if (type === 'groq') {
            if (!key.startsWith('gsk_')) {
                return {
                    valid: false,
                    message: 'Groq ключ повинен починатися з "gsk_"'
                };
            }
            if (key.length < 40) {
                return {
                    valid: false,
                    message: 'Groq ключ занадто короткий'
                };
            }
        }

        return {
            valid: true,
            message: 'Ключ валідний'
        };
    }

    // ========================================
    // FILE VALIDATION
    // ========================================

    validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB
            allowedTypes = [],
            allowedExtensions = []
        } = options;

        const errors = [];

        // Перевірка розміру
        if (file.size > maxSize) {
            errors.push(`Файл занадто великий (макс ${(maxSize / 1024 / 1024).toFixed(1)}MB)`);
        }

        // Перевірка типу
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            errors.push(`Недозволений тип файлу: ${file.type}`);
        }

        // Перевірка розширення
        if (allowedExtensions.length > 0) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                errors.push(`Недозволене розширення: .${ext}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            file
        };
    }

    // ========================================
    // CODE VALIDATION
    // ========================================

    validateCode(code, language = 'javascript') {
        const errors = [];
        const warnings = [];

        // Перевірка на порожній код
        if (!code || code.trim() === '') {
            errors.push('Код не може бути порожнім');
            return { valid: false, errors, warnings };
        }

        // Перевірка розміру
        if (code.length > 1000000) {
            errors.push('Код занадто великий (макс 1MB)');
        }

        // Перевірка на небезпечні конструкції
        const dangerousPatterns = [
            { pattern: /eval\s*\(/gi, message: 'Використання eval() - небезпечно' },
            { pattern: /Function\s*\(/gi, message: 'Використання Function() - небезпечно' },
            { pattern: /document\.write/gi, message: 'document.write - застаріла функція' }
        ];

        dangerousPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(code)) {
                warnings.push(message);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // ========================================
    // PROMPT VALIDATION
    // ========================================

    validatePrompt(prompt, options = {}) {
        const {
            minLength = 1,
            maxLength = 10000,
            allowHTML = false,
            checkProfanity = false
        } = options;

        const errors = [];

        // Базова валідація
        const baseValidation = this.validate(prompt, {
            required: true,
            minLength,
            maxLength,
            safe: true
        });

        if (!baseValidation.valid) {
            errors.push(...baseValidation.errors);
        }

        // Перевірка HTML
        if (!allowHTML && /<[^>]*>/g.test(prompt)) {
            errors.push('HTML теги не дозволені');
        }

        // Перевірка на profanity (базова)
        if (checkProfanity) {
            const profanityWords = ['заборонене1', 'заборонене2'];
            const lowerPrompt = prompt.toLowerCase();
            
            if (profanityWords.some(word => lowerPrompt.includes(word))) {
                errors.push('Виявлено неприпустимі слова');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            prompt
        };
    }

    // ========================================
    // URL VALIDATION
    // ========================================

    validateURL(url, options = {}) {
        const {
            allowedProtocols = ['http:', 'https:'],
            allowedDomains = [],
            blockedDomains = []
        } = options;

        const errors = [];

        try {
            const urlObj = new URL(url);

            // Перевірка протоколу
            if (!allowedProtocols.includes(urlObj.protocol)) {
                errors.push(`Недозволений протокол: ${urlObj.protocol}`);
            }

            // Перевірка дозволених доменів
            if (allowedDomains.length > 0) {
                const isAllowed = allowedDomains.some(domain => 
                    urlObj.hostname.endsWith(domain)
                );
                if (!isAllowed) {
                    errors.push('Домен не в списку дозволених');
                }
            }

            // Перевірка заблокованих доменів
            if (blockedDomains.length > 0) {
                const isBlocked = blockedDomains.some(domain => 
                    urlObj.hostname.endsWith(domain)
                );
                if (isBlocked) {
                    errors.push('Домен заблоковано');
                }
            }

        } catch (error) {
            errors.push('Невірний формат URL');
        }

        return {
            valid: errors.length === 0,
            errors,
            url
        };
    }

    // ========================================
    // SANITIZE & VALIDATE
    // ========================================

    sanitizeAndValidate(value, rules = {}) {
        let sanitized = value;

        // Санітизація
        if (window.sanitizer) {
            if (rules.allowHTML === false) {
                sanitized = sanitizer.stripAllTags(value);
            } else {
                sanitized = sanitizer.sanitize(value, rules);
            }
        }

        // Валідація
        const validation = this.validate(sanitized, rules);

        return {
            ...validation,
            original: value,
            sanitized
        };
    }

    // ========================================
    // BATCH VALIDATION
    // ========================================

    validateBatch(items, rules) {
        const results = items.map((item, index) => ({
            index,
            item,
            ...this.validate(item, rules)
        }));

        const allValid = results.every(r => r.valid);
        const errors = results.filter(r => !r.valid);

        return {
            valid: allValid,
            results,
            errors,
            validCount: results.filter(r => r.valid).length,
            errorCount: errors.length
        };
    }

    // ========================================
    // FORM VALIDATION
    // ========================================

    validateForm(formElement, schema) {
        const data = {};
        const formData = new FormData(formElement);

        // Зібрати дані з форми
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Валідувати
        return this.validateObject(data, schema);
    }

    // ========================================
    // PASSWORD VALIDATION
    // ========================================

    validatePassword(password, options = {}) {
        const {
            minLength = 8,
            requireUpper = true,
            requireLower = true,
            requireNumber = true,
            requireSpecial = false
        } = options;

        const errors = [];

        if (password.length < minLength) {
            errors.push(`Мінімум ${minLength} символів`);
        }

        if (requireUpper && !/[A-Z]/.test(password)) {
            errors.push('Потрібна велика літера');
        }

        if (requireLower && !/[a-z]/.test(password)) {
            errors.push('Потрібна маленька літера');
        }

        if (requireNumber && !/\d/.test(password)) {
            errors.push('Потрібна цифра');
        }

        if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Потрібен спеціальний символ');
        }

        // Визначити силу
        let strength = 'weak';
        if (errors.length === 0) {
            const score = 
                (password.length >= 12 ? 1 : 0) +
                (/[A-Z]/.test(password) ? 1 : 0) +
                (/[a-z]/.test(password) ? 1 : 0) +
                (/\d/.test(password) ? 1 : 0) +
                (/[!@#$%^&*()]/.test(password) ? 1 : 0);

            strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';
        }

        return {
            valid: errors.length === 0,
            errors,
            strength,
            password
        };
    }

    // ========================================
    // DATE VALIDATION
    // ========================================

    validateDate(dateString, options = {}) {
        const {
            minDate = null,
            maxDate = null,
            format = 'ISO'
        } = options;

        const errors = [];

        // Спробувати parse
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            errors.push('Невірний формат дати');
            return { valid: false, errors, date: null };
        }

        // Перевірка мінімальної дати
        if (minDate) {
            const min = new Date(minDate);
            if (date < min) {
                errors.push(`Дата не може бути раніше ${min.toLocaleDateString('uk-UA')}`);
            }
        }

        // Перевірка максимальної дати
        if (maxDate) {
            const max = new Date(maxDate);
            if (date > max) {
                errors.push(`Дата не може бути пізніше ${max.toLocaleDateString('uk-UA')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            date
        };
    }

    // ========================================
    // JSON VALIDATION
    // ========================================

    validateJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            return {
                valid: true,
                errors: [],
                data: parsed
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Невірний JSON: ${error.message}`],
                data: null
            };
        }
    }

    // ========================================
    // SCHEMA VALIDATION (SIMPLE)
    // ========================================

    validateSchema(data, schema) {
        const errors = {};
        let isValid = true;

        for (const [field, fieldSchema] of Object.entries(schema)) {
            const value = data[field];

            // Тип
            if (fieldSchema.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== fieldSchema.type) {
                    errors[field] = errors[field] || [];
                    errors[field].push(`Має бути типу ${fieldSchema.type}`);
                    isValid = false;
                }
            }

            // Required
            if (fieldSchema.required && (value === undefined || value === null)) {
                errors[field] = errors[field] || [];
                errors[field].push('Поле обов\'язкове');
                isValid = false;
            }

            // Enum
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                errors[field] = errors[field] || [];
                errors[field].push(`Має бути одним з: ${fieldSchema.enum.join(', ')}`);
                isValid = false;
            }

            // Custom validator
            if (fieldSchema.validator && typeof fieldSchema.validator === 'function') {
                const result = fieldSchema.validator(value);
                if (result !== true) {
                    errors[field] = errors[field] || [];
                    errors[field].push(result || 'Валідація не пройдена');
                    isValid = false;
                }
            }
        }

        return {
            valid: isValid,
            errors,
            data
        };
    }

    // ========================================
    // CUSTOM VALIDATORS
    // ========================================

    addCustomValidator(name, validatorFn) {
        this.customValidators.set(name, validatorFn);
    }

    getCustomValidator(name) {
        return this.customValidators.get(name);
    }

    // ========================================
    // PRESETS
    // ========================================

    static get Presets() {
        return {
            USERNAME: {
                required: true,
                minLength: 3,
                maxLength: 20,
                alphanumeric: true
            },
            EMAIL: {
                required: true,
                email: true
            },
            PASSWORD: {
                required: true,
                minLength: 8,
                maxLength: 100
            },
            PHONE: {
                required: true,
                pattern: /^\+?[\d\s-()]+$/
            },
            URL: {
                required: true,
                url: true
            },
            PROMPT: {
                required: true,
                minLength: 1,
                maxLength: 10000,
                safe: true
            },
            API_KEY: {
                required: true,
                minLength: 20,
                safe: true
            }
        };
    }

    // ========================================
    // UTILITY
    // ========================================

    /**
     * Перевірити чи валідне значення за типом
     */
    isType(value, type) {
        if (type === 'array') {
            return Array.isArray(value);
        }
        if (type === 'null') {
            return value === null;
        }
        return typeof value === type;
    }

    /**
     * Отримати всі правила
     */
    getRules() {
        return Array.from(this.rules.keys());
    }

    /**
     * Перевірити чи існує правило
     */
    hasRule(name) {
        return this.rules.has(name);
    }

    // ========================================
    // DEBUG
    // ========================================

    debug() {
        console.group('✅ Validator Debug Info');
        console.log('Available rules:', this.getRules());
        console.log('Custom validators:', Array.from(this.customValidators.keys()));
        console.groupEnd();
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Швидка валідація email
     */
    isEmail(email) {
        return this.validate(email, { email: true }).valid;
    }

    /**
     * Швидка валідація URL
     */
    isURL(url) {
        return this.validate(url, { url: true }).valid;
    }

    /**
     * Швидка валідація числа
     */
    isNumber(value) {
        return this.validate(value, { number: true }).valid;
    }

    /**
     * Швидка валідація безпечного рядка
     */
    isSafe(value) {
        return this.validate(value, { safe: true }).valid;
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const validatorService = new ValidatorService();

// Додати глобальні хелпери
window.isEmail = (email) => validatorService.isEmail(email);
window.isURL = (url) => validatorService.isURL(url);
window.isNumber = (value) => validatorService.isNumber(value);
window.isSafe = (value) => validatorService.isSafe(value);

// Експорт
window.validatorService = validatorService;
window.ValidatorService = ValidatorService;

// Backward compatibility
window.validateApiKey = (key, type) => validatorService.validateApiKey(key, type);

console.log('✅ Validator Service loaded');
