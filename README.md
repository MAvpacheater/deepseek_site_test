# 🤖 AI Assistant Hub

Повнофункціональний веб-додаток для роботи з AI моделями - Gemini, DeepSeek Coder та генерації зображень. Побудований на сучасній модульній архітектурі з підтримкою IndexedDB, XSS захистом та шифруванням.

## ✨ Основні функції

### 💬 Gemini Chat
Розумовий асистент на базі Gemini 2.0 Flash з збереженням історії, пошуком та експортом.

### 💻 DeepSeek Coder
Генерація коду, автоматичне виявлення файлів, підсвічування синтаксису, preview HTML, аналіз помилок, тести та документація.

### 🖼️ Image Generator
Безкоштовна генерація зображень через Pollinations.ai з різними стилями та розмірами.

### 📅 Планувальник
Створення планів з дедлайнами, AI генерація підзавдань, нагадування про прострочені завдання.

### 🧠 Пам'ять Агента
Автоматичне збереження важливої інформації, категоризація, пошук та експорт спогадів.

### 📚 Бібліотека
Збереження проектів та розмов з тегами, фільтрами та улюбленими.

### 🐙 GitHub Integration
Імпорт репозиторіїв, аналіз коду, рефакторинг, генерація тестів та документації.

## 🏗️ Архітектура v2.0

### Core Модулі
- **app-state.js** - Централізоване управління станом з reactive системою
- **error-handler.js** - Обробка помилок з автоматичним retry та rate limiting
- **storage-manager.js** - Гібридне сховище IndexedDB + localStorage
- **sanitizer.js** - XSS захист та безпечна робота з DOM
- **security.js** - Шифрування API ключів (XOR + Base64)

### Feature Модулі (Класи)
- **GeminiChat** - Gemini інтеграція
- **DeepSeekCoder** - DeepSeek код генератор
- **ImageGenerator** - Генерація зображень
- **SettingsManager** - Налаштування
- **PlannerManager** - Планувальник
- **MemoryManager** - Система пам'яті
- **UIManager** - Управління інтерфейсом

## 🚀 Швидкий старт

1. Відкрий `index.html` у браузері
2. Перейди в налаштування (⚙️)
3. Додай API ключі:
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Groq**: [Groq Console](https://console.groq.com/keys)
4. Почни використовувати! 🎉

## ⌨️ Гарячі клавіші

- `Ctrl + Enter` - Відправити повідомлення
- `Ctrl + K` - Пошук в історії
- `Ctrl + S` - Зберегти розмову
- `Ctrl + B` - Toggle панель коду
- `Escape` - Закрити модальні вікна

## 🔒 Безпека

✅ **XSS захист** - HTML санітизація всіх користувацьких даних  
✅ **Шифрування API ключів** - XOR + Base64 encoding  
✅ **CSP Headers** - Content Security Policy  
✅ **Input валідація** - Перевірка всіх введених даних  
✅ **Rate limiting** - Захист від надмірних запитів  
✅ **Аналіз коду** - Виявлення небезпечних конструкцій  

## 💾 Сховище

- **IndexedDB** - Основне сховище (до 50GB)
- **localStorage** - Fallback (5MB)
- **Автоматична міграція** - Перенесення даних з localStorage
- **Backup/Restore** - Експорт та імпорт всіх даних

## 📊 Статистика

Відстежування запитів, згенерованих зображень, збережених проектів, використаних токенів та днів використання.

## 🛠️ Використані технології

**Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3  
**AI APIs:** Google Gemini 2.0, Groq API (Llama 3.3 70B), Pollinations.ai  
**Бібліотеки:** Prism.js, JSZip  
**Сховище:** IndexedDB + localStorage  
**Архітектура:** OOP, Модульна система, Reactive patterns  

## 📝 Приклад використання

```javascript
// Відправити повідомлення в Gemini
appState.addGeminiMessage('user', 'Hello!');

// Зберегти файл коду
appState.setCodeFile('index.js', {
    language: 'javascript',
    code: 'console.log("Hello");'
});

// Створити план
appState.addPlan({
    title: 'Мій план',
    description: 'Опис',
    priority: 'high'
});

// Обробити помилку з retry
try {
    await errorHandler.fetchWithRetry(url, options);
} catch (error) {
    showToast('Помилка запиту', 'error');
}

// Безпечно встановити HTML
sanitizer.safeSetHTML(element, userInput);
```

## 🎯 Основні переваги v2.0

✅ **Модульна архітектура** - Всі модулі у вигляді класів  
✅ **Централізований стан** - AppState для управління даними  
✅ **Обробка помилок** - Автоматичний retry з rate limiting  
✅ **Безпека** - Повний XSS захист та шифрування  
✅ **Продуктивність** - IndexedDB замість localStorage  
✅ **Надійність** - Error logging та toast notifications  
✅ **Backward compatibility** - Старий код працює  

## 📂 Структура проекту

```
ai-assistant-hub/
├── index.html
├── css/
│   ├── general.css
│   ├── chats.css
│   ├── settings.css
│   ├── photo.css
│   └── planner.css
├── js/
│   ├── Core/
│   │   ├── app-state.js
│   │   ├── error-handler.js
│   │   ├── storage-manager.js
│   │   ├── sanitizer.js
│   │   └── security.js
│   ├── Features/
│   │   ├── gemini.js
│   │   ├── deepseek.js
│   │   ├── photo.js
│   │   ├── settings.js
│   │   ├── planner.js
│   │   ├── memory.js
│   │   └── general.js
│   └── Helpers/
│       ├── file-upload.js
│       ├── deepseek-ui-controls.js
│       ├── agent-core.js
│       └── github-import.js
└── README.md
```

## 🐛 Відомі проблеми

- Мобільна версія потребує UI оптимізації
- Preview HTML може некоректно відображати дуже складні проекти

## 🤝 Contribution

Pull requests вітаються! Для великих змін спочатку відкрий issue.

## 📄 Ліцензія

MIT License - використовуй вільно!

## 👨‍💻 Автор

Створено з ❤️ для спільноти розробників

---

**⭐ Подобається проект? Постав зірку на GitHub!**

**💡 Знайшов баг?** Відкрий issue з деталями  
**🚀 Маєш ідею?** Створи pull request або обговорення  
**❓ Потрібна допомога?** Перевір документацію або задай питання в discussions
