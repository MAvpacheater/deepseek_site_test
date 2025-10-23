// 🔐 Security Module - Безпека додатку

// ========================================
// API KEYS ENCRYPTION
// ========================================

function encryptApiKey(key) {
    const secret = 'AI_HUB_SECRET_KEY_2024';
    let encrypted = '';
    
    for (let i = 0; i < key.length; i++) {
        const keyChar = key.charCodeAt(i);
        const secretChar = secret.charCodeAt(i % secret.length);
        encrypted += String.fromCharCode(keyChar ^ secretChar);
    }
    
    return btoa(encrypted);
}

function decryptApiKey(encrypted) {
    try {
        const secret = 'AI_HUB_SECRET_KEY_2024';
        const decoded = atob(encrypted);
        let decrypted = '';
        
        for (let i = 0; i < decoded.length; i++) {
            const encChar = decoded.charCodeAt(i);
            const secretChar = secret.charCodeAt(i % secret.length);
            decrypted += String.fromCharCode(encChar ^ secretChar);
        }
        
        return decrypted;
    } catch (e) {
        console.error('Decryption error:', e);
        return encrypted;
    }
}

// ========================================
// API KEY VALIDATION
// ========================================

function validateApiKey(key, type) {
    if (!key || key.trim() === '') {
        return { valid: false, message: 'API ключ не може бути порожнім' };
    }
    
    if (type === 'gemini') {
        if (!key.startsWith('AIza')) {
            return { valid: false, message: 'Gemini ключ повинен починатися з "AIza"' };
        }
        if (key.length < 30) {
            return { valid: false, message: 'Gemini ключ занадто короткий' };
        }
    }
    
    if (type === 'groq') {
        if (!key.startsWith('gsk_')) {
            return { valid: false, message: 'Groq ключ повинен починатися з "gsk_"' };
        }
        if (key.length < 40) {
            return { valid: false, message: 'Groq ключ занадто короткий' };
        }
    }
    
    return { valid: true, message: 'Ключ валідний' };
}

// ========================================
// SECURE KEY GETTERS
// ========================================

function getGeminiApiKey() {
    const encrypted = localStorage.getItem('gemini_api_key');
    const isEncrypted = localStorage.getItem('gemini_encrypted') === 'true';
    
    if (!encrypted) return '';
    return isEncrypted ? decryptApiKey(encrypted) : encrypted;
}

function getGroqApiKey() {
    const encrypted = localStorage.getItem('groq_api_key');
    const isEncrypted = localStorage.getItem('groq_encrypted') === 'true';
    
    if (!encrypted) return '';
    return isEncrypted ? decryptApiKey(encrypted) : encrypted;
}

// ========================================
// SECURE SETTINGS MANAGEMENT
// ========================================

function saveSettingsSecure() {
    const geminiKey = document.getElementById('geminiApiKey')?.value.trim();
    const groqKey = document.getElementById('groqApiKey')?.value.trim();
    
    // Validate Gemini key
    if (geminiKey) {
        const validation = validateApiKey(geminiKey, 'gemini');
        if (!validation.valid) {
            alert('⚠️ Gemini API Key: ' + validation.message);
            return;
        }
        localStorage.setItem('gemini_api_key', encryptApiKey(geminiKey));
        localStorage.setItem('gemini_encrypted', 'true');
    }
    
    // Validate Groq key
    if (groqKey) {
        const validation = validateApiKey(groqKey, 'groq');
        if (!validation.valid) {
            alert('⚠️ Groq API Key: ' + validation.message);
            return;
        }
        localStorage.setItem('groq_api_key', encryptApiKey(groqKey));
        localStorage.setItem('groq_encrypted', 'true');
    }
    
    alert('✅ Налаштування збережено безпечно (з шифруванням)!');
}

function loadSettingsSecure() {
    const geminiInput = document.getElementById('geminiApiKey');
    const groqInput = document.getElementById('groqApiKey');
    
    if (geminiInput) {
        geminiInput.value = getGeminiApiKey();
    }
    
    if (groqInput) {
        groqInput.value = getGroqApiKey();
    }
}

// ========================================
// CODE SECURITY ANALYSIS
// ========================================

function checkForDangerousCode(code) {
    const dangerousPatterns = [
        { pattern: /eval\s*\(/gi, warning: 'eval() - може виконувати довільний код', severity: 'high' },
        { pattern: /innerHTML\s*=/gi, warning: 'innerHTML - ризик XSS атак', severity: 'medium' },
        { pattern: /document\.write/gi, warning: 'document.write() - застаріла небезпечна функція', severity: 'low' },
        { pattern: /exec\s*\(/gi, warning: 'exec() - може виконувати системні команди', severity: 'high' },
        { pattern: /<script[^>]*>[\s\S]*?<\/script>/gi, warning: 'Вбудований script тег', severity: 'medium' },
        { pattern: /localStorage\.setItem.*password/gi, warning: 'Збереження паролю в localStorage', severity: 'high' },
        { pattern: /fetch\s*\([^)]*http:\/\//gi, warning: 'HTTP запити (не HTTPS)', severity: 'medium' }
    ];
    
    const warnings = [];
    
    dangerousPatterns.forEach(({ pattern, warning, severity }) => {
        if (pattern.test(code)) {
            warnings.push({ warning, severity });
        }
    });
    
    return warnings;
}

function analyzeCodeSecurity() {
    if (!window.codeFiles || Object.keys(window.codeFiles).length === 0) {
        alert('⚠️ Немає коду для аналізу!');
        return;
    }
    
    let allWarnings = [];
    
    Object.keys(window.codeFiles).forEach(filename => {
        const code = window.codeFiles[filename].code;
        const warnings = checkForDangerousCode(code);
        
        if (warnings.length > 0) {
            allWarnings.push({ file: filename, warnings });
        }
    });
    
    if (allWarnings.length === 0) {
        alert('✅ Небезпечних конструкцій не знайдено!\n\nКод виглядає безпечно.');
        return;
    }
    
    // Generate report
    let report = '🛡️ ЗВІТ ПРО БЕЗПЕКУ КОДУ\n\n';
    report += `Перевірено файлів: ${Object.keys(window.codeFiles).length}\n`;
    report += `Знайдено проблем: ${allWarnings.reduce((sum, item) => sum + item.warnings.length, 0)}\n\n`;
    
    allWarnings.forEach(item => {
        report += `📄 ${item.file}:\n`;
        item.warnings.forEach(({ warning, severity }) => {
            const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
            report += `   ${icon} ${warning}\n`;
        });
        report += '\n';
    });
    
    report += '💡 Рекомендується переглянути ці фрагменти коду.';
    alert(report);
}

// ========================================
// INITIALIZATION
// ========================================

function initializeSecurity() {
    // Override default save/load functions
    if (typeof window.saveSettings === 'function') {
        window.saveSettings = saveSettingsSecure;
    }
    
    if (typeof window.loadSettings === 'function') {
        window.loadSettings = loadSettingsSecure;
    }
    
    // Add security button to code actions
    const codeActions = document.querySelector('.code-actions');
    if (codeActions && !document.getElementById('security-btn')) {
        const securityBtn = document.createElement('button');
        securityBtn.id = 'security-btn';
        securityBtn.textContent = '🛡️ Безпека';
        securityBtn.title = 'Перевірити код на безпеку';
        securityBtn.onclick = analyzeCodeSecurity;
        codeActions.appendChild(securityBtn);
    }
    
    console.log('✅ Security module initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurity);
} else {
    initializeSecurity();
}

// Export functions
window.encryptApiKey = encryptApiKey;
window.decryptApiKey = decryptApiKey;
window.validateApiKey = validateApiKey;
window.getGeminiApiKey = getGeminiApiKey;
window.getGroqApiKey = getGroqApiKey;
window.analyzeCodeSecurity = analyzeCodeSecurity;
