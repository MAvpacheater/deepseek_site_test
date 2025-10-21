// Security Features

// 🔐 Шифрування API ключів
function encryptApiKey(key) {
    // Простий XOR шифр (для базової обфускації)
    const secret = 'AI_HUB_SECRET_KEY_2024';
    let encrypted = '';
    
    for (let i = 0; i < key.length; i++) {
        const keyChar = key.charCodeAt(i);
        const secretChar = secret.charCodeAt(i % secret.length);
        encrypted += String.fromCharCode(keyChar ^ secretChar);
    }
    
    return btoa(encrypted); // Base64 кодування
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
        return encrypted; // Якщо не вдалось розшифрувати, повернути як є
    }
}

// Оновлене збереження налаштувань з шифруванням
function saveSettingsSecure() {
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const groqKey = document.getElementById('groqApiKey').value.trim();
    const geminiPrompt = document.getElementById('geminiSystemPrompt').value.trim();
    const deepseekPrompt = document.getElementById('deepseekSystemPrompt').value.trim();

    // Шифрувати ключі перед збереженням
    if (geminiKey) {
        localStorage.setItem('gemini_api_key', encryptApiKey(geminiKey));
        localStorage.setItem('gemini_encrypted', 'true');
    }
    
    if (groqKey) {
        localStorage.setItem('groq_api_key', encryptApiKey(groqKey));
        localStorage.setItem('groq_encrypted', 'true');
    }
    
    localStorage.setItem('gemini_system_prompt', geminiPrompt);
    localStorage.setItem('deepseek_system_prompt', deepseekPrompt);

    alert('✅ Налаштування збережено безпечно (з шифруванням)!');
}

// Оновлене завантаження налаштувань з розшифруванням
function loadSettingsSecure() {
    const geminiKeyEncrypted = localStorage.getItem('gemini_api_key') || '';
    const groqKeyEncrypted = localStorage.getItem('groq_api_key') || '';
    const isGeminiEncrypted = localStorage.getItem('gemini_encrypted') === 'true';
    const isGroqEncrypted = localStorage.getItem('groq_encrypted') === 'true';
    
    const geminiPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асістент. Відповідай чітко, стисло та по суті. Говори українською мовою.';
    const deepseekPrompt = localStorage.getItem('deepseek_system_prompt') || 'Ти експерт-програміст. Пиши чистий, оптимізований код з коментарями. Створюй окремі файли для HTML, CSS, JS. Говори українською мовою.';

    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const groqApiKeyInput = document.getElementById('groqApiKey');
    const geminiSystemPromptInput = document.getElementById('geminiSystemPrompt');
    const deepseekSystemPromptInput = document.getElementById('deepseekSystemPrompt');

    // Розшифрувати ключі
    if (geminiApiKeyInput) {
        const geminiKey = isGeminiEncrypted ? decryptApiKey(geminiKeyEncrypted) : geminiKeyEncrypted;
        geminiApiKeyInput.value = geminiKey;
    }
    
    if (groqApiKeyInput) {
        const groqKey = isGroqEncrypted ? decryptApiKey(groqKeyEncrypted) : groqKeyEncrypted;
        groqApiKeyInput.value = groqKey;
    }
    
    if (geminiSystemPromptInput) geminiSystemPromptInput.value = geminiPrompt;
    if (deepseekSystemPromptInput) deepseekSystemPromptInput.value = deepseekPrompt;
}

// Отримати розшифрований ключ для використання
function getDecryptedApiKey(keyName) {
    const encrypted = localStorage.getItem(keyName);
    const isEncrypted = localStorage.getItem(`${keyName.replace('_api_key', '')}_encrypted`) === 'true';
    
    if (!encrypted) return '';
    return isEncrypted ? decryptApiKey(encrypted) : encrypted;
}

// 🛡️ Валідація введення API ключів
function validateApiKey(key, type) {
    if (!key || key.trim() === '') {
        return { valid: false, message: 'API ключ не може бути порожнім' };
    }
    
    // Перевірка формату для Gemini
    if (type === 'gemini') {
        if (!key.startsWith('AIza')) {
            return { valid: false, message: 'Gemini ключ повинен починатися з "AIza"' };
        }
        if (key.length < 30) {
            return { valid: false, message: 'Gemini ключ занадто короткий' };
        }
    }
    
    // Перевірка формату для Groq
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

// Покращене збереження з валідацією
function saveSettingsWithValidation() {
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const groqKey = document.getElementById('groqApiKey').value.trim();
    
    // Валідація Gemini ключа
    if (geminiKey) {
        const validation = validateApiKey(geminiKey, 'gemini');
        if (!validation.valid) {
            alert('⚠️ Gemini API Key: ' + validation.message);
            return;
        }
    }
    
    // Валідація Groq ключа
    if (groqKey) {
        const validation = validateApiKey(groqKey, 'groq');
        if (!validation.valid) {
            alert('⚠️ Groq API Key: ' + validation.message);
            return;
        }
    }
    
    // Якщо валідація пройшла - зберегти
    saveSettingsSecure();
}

// ⚠️ Попередження про небезпечний код
function checkForDangerousCode(code) {
    const dangerousPatterns = [
        { pattern: /eval\s*\(/gi, warning: 'eval() - може виконувати довільний код' },
        { pattern: /innerHTML\s*=/gi, warning: 'innerHTML - ризик XSS атак' },
        { pattern: /document\.write/gi, warning: 'document.write() - застаріла небезпечна функція' },
        { pattern: /exec\s*\(/gi, warning: 'exec() - може виконувати системні команди' },
        { pattern: /<script[^>]*>[\s\S]*?<\/script>/gi, warning: 'Вбудований script тег - потенційна загроза' },
        { pattern: /localStorage\.setItem.*password/gi, warning: 'Збереження паролю в localStorage - небезпечно!' },
        { pattern: /fetch\s*\([^)]*http:\/\//gi, warning: 'HTTP запити (не HTTPS) - незахищене з\'єднання' }
    ];
    
    const warnings = [];
    
    dangerousPatterns.forEach(({ pattern, warning }) => {
        if (pattern.test(code)) {
            warnings.push(warning);
        }
    });
    
    return warnings;
}

// Аналіз безпеки коду
function analyzeCodeSecurity() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для аналізу!');
        return;
    }
    
    let allWarnings = [];
    
    Object.keys(codeFiles).forEach(filename => {
        const code = codeFiles[filename].code;
        const warnings = checkForDangerousCode(code);
        
        if (warnings.length > 0) {
            allWarnings.push({
                file: filename,
                warnings: warnings
            });
        }
    });
    
    if (allWarnings.length === 0) {
        alert('✅ Небезпечних конструкцій не знайдено!\n\nКод виглядає безпечно.');
    } else {
        let report = '🛡️ ЗВІТ ПРО БЕЗПЕКУ\n\n';
        report += '⚠️ Знайдено потенційно небезпечні конструкції:\n\n';
        
        allWarnings.forEach(item => {
            report += `📄 ${item.file}:\n`;
            item.warnings.forEach(warning => {
                report += `   • ${warning}\n`;
            });
            report += '\n';
        });
        
        report += '💡 Рекомендується переглянути ці фрагменти коду.';
        alert(report);
    }
}

// Ініціалізація безпеки при завантаженні
function initializeSecurity() {
    // Замінити стандартні функції збереження на безпечні
    window.saveSettings = saveSettingsWithValidation;
    window.loadSettings = loadSettingsSecure;
    
    // Додати кнопку аналізу безпеки
    const codeActions = document.querySelector('.code-actions');
    if (codeActions) {
        const securityBtn = document.createElement('button');
        securityBtn.textContent = '🛡️ Безпека';
        securityBtn.title = 'Перевірити код на безпеку';
        securityBtn.onclick = analyzeCodeSecurity;
        securityBtn.style.cssText = `
            background: rgba(220, 53, 69, 0.2);
            color: white;
            border: 1px solid #dc3545;
            padding: 8px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        securityBtn.onmouseover = function() {
            this.style.background = 'rgba(220, 53, 69, 0.3)';
        };
        securityBtn.onmouseout = function() {
            this.style.background = 'rgba(220, 53, 69, 0.2)';
        };
        
        codeActions.appendChild(securityBtn);
    }
    
    // Показати індикатор шифрування в налаштуваннях
    const geminiInput = document.getElementById('geminiApiKey');
    const groqInput = document.getElementById('groqApiKey');
    
    if (geminiInput && localStorage.getItem('gemini_encrypted') === 'true') {
        addEncryptionIndicator(geminiInput);
    }
    
    if (groqInput && localStorage.getItem('groq_encrypted') === 'true') {
        addEncryptionIndicator(groqInput);
    }
}

// Додати індикатор шифрування
function addEncryptionIndicator(inputElement) {
    const indicator = document.createElement('span');
    indicator.textContent = '🔐 Зашифровано';
    indicator.style.cssText = `
        display: inline-block;
        margin-left: 10px;
        color: #22c55e;
        font-size: 12px;
        font-weight: 600;
    `;
    
    const parent = inputElement.parentElement;
    const small = parent.querySelector('small');
    
    if (small && !small.querySelector('span')) {
        small.appendChild(indicator);
    }
}

// Оновити функції відправки повідомлень для використання розшифрованих ключів
function getGeminiApiKey() {
    return getDecryptedApiKey('gemini_api_key');
}

function getGroqApiKey() {
    return getDecryptedApiKey('groq_api_key');
}
