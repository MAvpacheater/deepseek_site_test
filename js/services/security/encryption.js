// 🔐 Encryption Service - Шифрування конфіденційних даних

class EncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.saltLength = 16;
        this.iterations = 100000;
        this.masterKeyCache = null;
        
        // Секретна фраза (в реальному проекті брати з безпечного джерела)
        this.secretPhrase = 'AI_HUB_SECRET_2024_SECURE_KEY';
    }

    // ========================================
    // WEB CRYPTO API
    // ========================================

    isSupported() {
        return !!(window.crypto && window.crypto.subtle);
    }

    // ========================================
    // KEY DERIVATION
    // ========================================

    /**
     * Створити ключ з пароля/фрази
     */
    async deriveKey(password, salt) {
        if (!this.isSupported()) {
            throw new Error('Web Crypto API not supported');
        }

        // Імпортувати пароль як ключ
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Деривувати ключ
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            passwordKey,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Отримати master key (з кешуванням)
     */
    async getMasterKey() {
        if (this.masterKeyCache) {
            return this.masterKeyCache;
        }

        const salt = await this.getOrCreateSalt();
        this.masterKeyCache = await this.deriveKey(this.secretPhrase, salt);
        
        return this.masterKeyCache;
    }

    /**
     * Отримати або створити salt
     */
    async getOrCreateSalt() {
        let salt = localStorage.getItem('encryption_salt');
        
        if (salt) {
            return this.base64ToBuffer(salt);
        }

        // Створити новий salt
        salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
        localStorage.setItem('encryption_salt', this.bufferToBase64(salt));
        
        return salt;
    }

    // ========================================
    // ENCRYPT
    // ========================================

    /**
     * Зашифрувати дані
     */
    async encrypt(data) {
        if (!this.isSupported()) {
            return this.fallbackEncrypt(data);
        }

        try {
            // Конвертувати в string якщо потрібно
            const plaintext = typeof data === 'string' ? 
                data : JSON.stringify(data);

            // Генерувати IV (Initialization Vector)
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

            // Отримати ключ
            const key = await this.getMasterKey();

            // Шифрувати
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                new TextEncoder().encode(plaintext)
            );

            // Об'єднати IV + encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Конвертувати в base64
            return this.bufferToBase64(combined);

        } catch (error) {
            console.error('Encryption error:', error);
            
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'encryption_error',
                    message: 'Failed to encrypt data',
                    error: error.message,
                    severity: 'high'
                });
            }
            
            throw error;
        }
    }

    /**
     * Зашифрувати API ключ
     */
    async encryptApiKey(apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API key is required');
        }

        return await this.encrypt(apiKey);
    }

    // ========================================
    // DECRYPT
    // ========================================

    /**
     * Розшифрувати дані
     */
    async decrypt(encryptedData) {
        if (!this.isSupported()) {
            return this.fallbackDecrypt(encryptedData);
        }

        try {
            // Конвертувати з base64
            const combined = this.base64ToBuffer(encryptedData);

            // Розділити IV + encrypted data
            const iv = combined.slice(0, this.ivLength);
            const encrypted = combined.slice(this.ivLength);

            // Отримати ключ
            const key = await this.getMasterKey();

            // Розшифрувати
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );

            // Конвертувати в string
            const plaintext = new TextDecoder().decode(decrypted);

            // Спробувати parse JSON
            try {
                return JSON.parse(plaintext);
            } catch {
                return plaintext;
            }

        } catch (error) {
            console.error('Decryption error:', error);
            
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'decryption_error',
                    message: 'Failed to decrypt data',
                    error: error.message,
                    severity: 'high'
                });
            }
            
            throw error;
        }
    }

    /**
     * Розшифрувати API ключ
     */
    async decryptApiKey(encryptedKey) {
        if (!encryptedKey) {
            return null;
        }

        try {
            return await this.decrypt(encryptedKey);
        } catch (error) {
            console.error('Failed to decrypt API key:', error);
            return null;
        }
    }

    // ========================================
    // FALLBACK (XOR - для старих браузерів)
    // ========================================

    fallbackEncrypt(data) {
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        let encrypted = '';
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const keyChar = this.secretPhrase.charCodeAt(i % this.secretPhrase.length);
            encrypted += String.fromCharCode(charCode ^ keyChar);
        }
        
        return btoa(encrypted);
    }

    fallbackDecrypt(encryptedData) {
        try {
            const decoded = atob(encryptedData);
            let decrypted = '';
            
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i);
                const keyChar = this.secretPhrase.charCodeAt(i % this.secretPhrase.length);
                decrypted += String.fromCharCode(charCode ^ keyChar);
            }
            
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }
        } catch (error) {
            console.error('Fallback decryption error:', error);
            return encryptedData;
        }
    }

    // ========================================
    // HASH
    // ========================================

    /**
     * Створити hash (SHA-256)
     */
    async hash(data) {
        if (!this.isSupported()) {
            return this.simpleHash(data);
        }

        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const buffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        
        return this.bufferToHex(hashBuffer);
    }

    /**
     * Простий hash (fallback)
     */
    simpleHash(data) {
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        let hash = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(16);
    }

    // ========================================
    // SECURE STORAGE
    // ========================================

    /**
     * Безпечно зберегти в localStorage
     */
    async secureSet(key, value) {
        try {
            const encrypted = await this.encrypt(value);
            localStorage.setItem(key, encrypted);
            localStorage.setItem(`${key}_encrypted`, 'true');
            return true;
        } catch (error) {
            console.error('Secure set error:', error);
            return false;
        }
    }

    /**
     * Безпечно отримати з localStorage
     */
    async secureGet(key, defaultValue = null) {
        try {
            const encrypted = localStorage.getItem(key);
            const isEncrypted = localStorage.getItem(`${key}_encrypted`) === 'true';
            
            if (!encrypted) {
                return defaultValue;
            }

            if (isEncrypted) {
                return await this.decrypt(encrypted);
            }

            return encrypted;
        } catch (error) {
            console.error('Secure get error:', error);
            return defaultValue;
        }
    }

    /**
     * Безпечно видалити з localStorage
     */
    secureDelete(key) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_encrypted`);
    }

    // ========================================
    // UTILITY
    // ========================================

    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // ========================================
    // RANDOM
    // ========================================

    /**
     * Генерувати випадковий токен
     */
    generateToken(length = 32) {
        if (this.isSupported()) {
            const buffer = crypto.getRandomValues(new Uint8Array(length));
            return this.bufferToBase64(buffer);
        }

        // Fallback
        let token = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * Генерувати UUID
     */
    generateUUID() {
        if (this.isSupported()) {
            return crypto.randomUUID();
        }

        // Fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ========================================
    // PASSWORD
    // ========================================

    /**
     * Перевірити силу пароля
     */
    checkPasswordStrength(password) {
        const length = password.length;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        let score = 0;
        if (length >= 8) score++;
        if (length >= 12) score++;
        if (hasLower && hasUpper) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;

        const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';

        return {
            score,
            strength,
            length,
            hasLower,
            hasUpper,
            hasNumber,
            hasSpecial
        };
    }

    /**
     * Згенерувати безпечний пароль
     */
    generatePassword(length = 16, options = {}) {
        const {
            includeUpper = true,
            includeLower = true,
            includeNumbers = true,
            includeSpecial = true
        } = options;

        let chars = '';
        if (includeLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (includeUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeNumbers) chars += '0123456789';
        if (includeSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (chars === '') chars = 'abcdefghijklmnopqrstuvwxyz';

        let password = '';
        
        if (this.isSupported()) {
            const buffer = crypto.getRandomValues(new Uint8Array(length));
            for (let i = 0; i < length; i++) {
                password += chars[buffer[i] % chars.length];
            }
        } else {
            for (let i = 0; i < length; i++) {
                password += chars[Math.floor(Math.random() * chars.length)];
            }
        }

        return password;
    }

    // ========================================
    // MIGRATION
    // ========================================

    /**
     * Мігрувати незашифровані дані
     */
    async migrateToEncrypted(key) {
        const value = localStorage.getItem(key);
        const isEncrypted = localStorage.getItem(`${key}_encrypted`) === 'true';

        if (value && !isEncrypted) {
            await this.secureSet(key, value);
            console.log(`✅ Migrated ${key} to encrypted storage`);
            return true;
        }

        return false;
    }

    /**
     * Мігрувати всі API ключі
     */
    async migrateApiKeys() {
        const keys = ['gemini_api_key', 'groq_api_key', 'github_token'];
        let migrated = 0;

        for (const key of keys) {
            const success = await this.migrateToEncrypted(key);
            if (success) migrated++;
        }

        console.log(`✅ Migrated ${migrated} API keys to encrypted storage`);
        return migrated;
    }

    // ========================================
    // DEBUG
    // ========================================

    getInfo() {
        return {
            supported: this.isSupported(),
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            hasMasterKey: !!this.masterKeyCache,
            hasSalt: !!localStorage.getItem('encryption_salt')
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const encryptionService = new EncryptionService();

// Експорт
window.encryptionService = encryptionService;
window.EncryptionService = EncryptionService;

console.log('✅ Encryption Service loaded');
