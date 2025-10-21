// DeepSeek Coder Enhancements

// 🔍 Аналіз коду на помилки
async function analyzeCodeForErrors() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для аналізу!');
        return;
    }
    
    const activeFileName = activeFile || Object.keys(codeFiles)[0];
    const code = codeFiles[activeFileName].code;
    const language = codeFiles[activeFileName].language;
    
    // Базова перевірка помилок
    const errors = [];
    
    // Перевірка для JavaScript
    if (language === 'javascript' || language === 'js') {
        // Перевірка на console.log (можливо забули прибрати)
        const consoleMatches = code.match(/console\.log/g);
        if (consoleMatches && consoleMatches.length > 5) {
            errors.push({
                type: 'warning',
                message: `Знайдено ${consoleMatches.length} console.log - можливо треба прибрати для production`
            });
        }
        
        // Перевірка на var (краще let/const)
        if (code.includes('var ')) {
            errors.push({
                type: 'suggestion',
                message: 'Використовується var - краще використати let або const'
            });
        }
        
        // Перевірка на ==  (краще ===)
        if (code.match(/[^=!]==(?!=)/g)) {
            errors.push({
                type: 'suggestion',
                message: 'Використовується == - краще використати ==='
            });
        }
    }
    
    // Перевірка для CSS
    if (language === 'css') {
        // Перевірка на !important
        const importantCount = (code.match(/!important/g) || []).length;
        if (importantCount > 3) {
            errors.push({
                type: 'warning',
                message: `Надто багато !important (${importantCount}) - можливо проблеми зі специфічністю`
            });
        }
    }
    
    // Перевірка для HTML
    if (language === 'html') {
        // Перевірка на закриті теги
        const openTags = code.match(/<(\w+)[^>]*>/g) || [];
        const closeTags = code.match(/<\/(\w+)>/g) || [];
        
        if (openTags.length !== closeTags.length) {
            errors.push({
                type: 'error',
                message: 'Можлива проблема з незакритими HTML тегами'
            });
        }
        
        // Перевірка на alt для img
        if (code.includes('<img') && !code.match(/<img[^>]+alt=/)) {
            errors.push({
                type: 'accessibility',
                message: 'Зображення без alt атрибуту (погано для accessibility)'
            });
        }
    }
    
    // Показати результати
    if (errors.length === 0) {
        alert('✅ Помилок не знайдено! Код виглядає добре.');
    } else {
        let report = '🔍 Результати аналізу:\n\n';
        errors.forEach((err, i) => {
            const icon = err.type === 'error' ? '❌' : err.type === 'warning' ? '⚠️' : err.type === 'accessibility' ? '♿' : '💡';
            report += `${icon} ${err.message}\n\n`;
        });
        alert(report);
    }
}

// 📝 Генерація тестів
async function generateTests() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для генерації тестів!');
        return;
    }
    
    const jsFiles = Object.keys(codeFiles).filter(name => 
        name.endsWith('.js') && !name.includes('test')
    );
    
    if (jsFiles.length === 0) {
        alert('⚠️ Не знайдено JavaScript файлів!');
        return;
    }
    
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        return;
    }
    
    const filename = jsFiles[0];
    const code = codeFiles[filename].code;
    
    const prompt = `Створи unit тести для цього JavaScript коду використовуючи Jest. Покрий основні функції та edge cases:\n\n${code}`;
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Ти експерт з тестування. Створюй чисті, зрозумілі тести.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });
        
        const data = await response.json();
        const tests = data.choices[0].message.content;
        
        // Зберегти тести у новий файл
        const testFilename = filename.replace('.js', '.test.js');
        const testCode = tests.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
        
        codeFiles[testFilename] = {
            language: 'javascript',
            code: testCode
        };
        
        displayCodeFiles();
        alert(`✅ Тести створено у файлі ${testFilename}!`);
        
    } catch (error) {
        console.error('Помилка:', error);
        alert('❌ Помилка генерації тестів: ' + error.message);
    }
}

// 📚 Автоматична документація
async function generateDocumentation() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для документації!');
        return;
    }
    
    let documentation = '# 📚 Документація проекту\n\n';
    documentation += `Згенеровано: ${new Date().toLocaleString('uk-UA')}\n\n`;
    documentation += '---\n\n';
    
    // Проаналізувати кожен файл
    Object.keys(codeFiles).forEach(filename => {
        const file = codeFiles[filename];
        documentation += `## 📄 ${filename}\n\n`;
        documentation += `**Мова:** ${file.language}\n\n`;
        documentation += `**Розмір:** ${file.code.length} символів\n\n`;
        
        // Витягти функції (для JS)
        if (file.language === 'javascript' || file.language === 'js') {
            const functions = file.code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g);
            if (functions && functions.length > 0) {
                documentation += '### Функції:\n\n';
                functions.forEach(func => {
                    const funcName = func.match(/\w+/)[0];
                    if (funcName !== 'function' && funcName !== 'const') {
                        documentation += `- \`${funcName}()\`\n`;
                    }
                });
                documentation += '\n';
            }
        }
        
        // Витягти класи (для CSS)
        if (file.language === 'css') {
            const classes = file.code.match(/\.[\w-]+(?=\s*\{)/g);
            if (classes && classes.length > 0) {
                documentation += '### CSS Класи:\n\n';
                const uniqueClasses = [...new Set(classes)];
                uniqueClasses.slice(0, 20).forEach(cls => {
                    documentation += `- \`${cls}\`\n`;
                });
                if (uniqueClasses.length > 20) {
                    documentation += `\n... та ще ${uniqueClasses.length - 20} класів\n`;
                }
                documentation += '\n';
            }
        }
        
        documentation += '---\n\n';
    });
    
    // Зберегти документацію
    const blob = new Blob([documentation], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DOCUMENTATION.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Документацію створено та завантажено!');
}

// 🎯 Рефакторинг коду
async function refactorCode() {
    if (Object.keys(codeFiles).length === 0) {
        alert('⚠️ Немає коду для рефакторингу!');
        return;
    }
    
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Groq API ключ у налаштуваннях!');
        return;
    }
    
    const activeFileName = activeFile || Object.keys(codeFiles)[0];
    const code = codeFiles[activeFileName].code;
    
    const refactorType = prompt(
        'Який тип рефакторингу?\n\n' +
        '1 - Оптимізація продуктивності\n' +
        '2 - Покращення читабельності\n' +
        '3 - Видалення дублювання\n' +
        '4 - Модернізація синтаксису',
        '2'
    );
    
    const prompts = {
        '1': 'Оптимізуй цей код для кращої продуктивності',
        '2': 'Покращ читабельність цього коду, додай коментарі',
        '3': 'Видали дублювання коду та використай DRY принцип',
        '4': 'Модернізуй код використовуючи сучасний ES6+ синтаксис'
    };
    
    const promptText = prompts[refactorType] || prompts['2'];
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Ти експерт з рефакторингу коду.' },
                    { role: 'user', content: `${promptText}:\n\n${code}` }
                ],
                temperature: 0.3,
                max_tokens: 4000
            })
        });
        
        const data = await response.json();
        const refactoredCode = data.choices[0].message.content;
        
        // Зберегти рефакторений код
        const newFilename = activeFileName.replace(/\.(\w+)$/, '_refactored.$1');
        const cleanCode = refactoredCode.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '');
        
        codeFiles[newFilename] = {
            language: codeFiles[activeFileName].language,
            code: cleanCode
        };
        
        displayCodeFiles();
        alert(`✅ Рефакторинг завершено! Новий файл: ${newFilename}`);
        
    } catch (error) {
        console.error('Помилка:', error);
        alert('❌ Помилка рефакторингу: ' + error.message);
    }
}

// Ініціалізувати кнопки покращень
function initializeCoderEnhancements() {
    const codeHeader = document.querySelector('.code-header');
    if (!codeHeader) return;
    
    const existingEnhancements = document.getElementById('coder-enhancements');
    if (existingEnhancements) {
        existingEnhancements.remove();
    }
    
    const enhancementsDiv = document.createElement('div');
    enhancementsDiv.id = 'coder-enhancements';
    enhancementsDiv.style.display = 'flex';
    enhancementsDiv.style.gap = '8px';
    enhancementsDiv.style.marginTop = '10px';
    enhancementsDiv.style.flexWrap = 'wrap';
    
    enhancementsDiv.innerHTML = `
        <button onclick="analyzeCodeForErrors()" title="Аналіз коду на помилки" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            🔍 Аналіз
        </button>
        <button onclick="generateTests()" title="Генерація тестів" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            🧪 Тести
        </button>
        <button onclick="generateDocumentation()" title="Автоматична документація" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            📚 Docs
        </button>
        <button onclick="refactorCode()" title="Рефакторинг коду" style="background: rgba(102, 126, 234, 0.2); color: white; border: 1px solid var(--accent-primary); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            🎯 Рефакторинг
        </button>
    `;
    
    codeHeader.appendChild(enhancementsDiv);
}
