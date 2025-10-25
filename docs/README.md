# 🤖 AI Assistant Hub

**Версія:** 2.0  
**Статус:** Production Ready  
**Архітектура:** Модульна, масштабована

Повнофункціональний веб-додаток для роботи з AI моделями - Gemini 2.0 Flash, DeepSeek Coder (через Groq API) та генерації зображень через Pollinations.ai.

---

## 📋 Зміст

1. [Особливості](#особливості)
2. [Швидкий старт](#швидкий-старт)
3. [Архітектура](#архітектура)
4. [Основні модулі](#основні-модулі)
5. [Безпека](#безпека)
6. [Розробка](#розробка)
7. [API](#api)
8. [FAQ](#faq)

---

## ✨ Особливості

### 💬 Gemini Chat
- **Модель:** Google Gemini 2.0 Flash Experimental
- Контекстна історія до 20 повідомлень
- Збереження розмов у IndexedDB
- Експорт у Markdown/JSON
- Пошук по історії
- Автоматичне запам'ятовування важливої інформації

### 💻 DeepSeek Coder
- **Модель:** Llama 3.3 70B Versatile (через Groq API)
- Автоматичне виявлення та витягування файлів з коду
- Підсвічування синтаксису (Prism.js)
- Live Preview для HTML проектів
- Версіонування коду (до 10 версій на файл)
- Навігація між файлами (Alt+← / Alt+→)
- Аналіз помилок та генерація тестів
- GitHub імпорт репозиторіїв
- Експорт проектів у ZIP

### 🖼️ Image Generator
- **API:** Pollinations.ai (безкоштовно)
- Генерація 1024x1024 зображень
- Різні стилі та параметри
- Галерея з історією
- Завантаження та копіювання URL

### 📅 Розумний планувальник
- Створення планів з дедлайнами
- AI генерація підзавдань (Groq API)
- Система пріоритетів (high/medium/low)
- Відстежування прогресу
- Нагадування про прострочені завдання
- Експорт планів у Markdown

### 🧠 Система пам'яті агента
- Автоматичне та ручне збереження спогадів
- Категоризація: загальне, важливе, завдання, навчання, персональне
- Повнотекстовий пошук
- Теги для організації
- Експорт/імпорт JSON

### 📚 Бібліотека проектів
- Збереження розмов та код проектів
- Система тегів та фільтрів
- Улюблені проекти
- **Preview Modal** - перегляд перед завантаженням
- Експорт окремих проектів

### 📊 Dashboard
- Статистика використання
- 3 швидких доступів до чатів
- Хронологія активності
- Системна інформація
- Швидкі дії

---

## 🚀 Швидкий старт

### 1. Завантаження
```bash
git clone https://github.com/yourusername/ai-assistant-hub.git
cd ai-assistant-hub
```

### 2. Запуск
Відкрийте `index.html` у браузері або запустіть локальний сервер:

```bash
# Python
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### 3. Налаштування API ключів

Перейдіть у **Налаштування** (⚙️) та додайте:

#### Gemini API Key
1. Отримайте на [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Формат: `AIzaSy...`
3. Безкоштовно: 15 запитів/хв, 1500 запитів/день

#### Groq API Key
1. Отримайте на [Groq Console](https://console.groq.com/keys)
2. Формат: `gsk_...`
3. Безкоштовно: 30 запитів/хв, 14400 запитів/день

### 4. Готово! 🎉

---

## 🏗️ Архітектура

### Структура проекту
```
ai-assistant-hub/
│
├── index.html                 # Головна сторінка
│
├── css/
│   ├── base/                  # Базові стилі (~150 рядків)
│   ├── components/            # Компоненти (~780 рядків)
│   ├── layout/                # Макети (~470 рядків)
│   └── pages/                 # Сторінки (~2500 рядків)
│
├── js/
│   ├── core/                  # Ядро (~1050 рядків)
│   ├── services/              # Сервіси (~1830 рядків)
│   ├── features/              # Функції (~4050 рядків)
│   ├── ui/                    # UI (~950 рядків)
│   ├── utils/                 # Утиліти (~1050 рядків)
│   └── integrations/          # Інтеграції (~650 рядків)
│
├── assets/
│   ├── images/
│   └── icons/
│
└── docs/
    ├── README.md             # Цей файл
    └── ARCHITECTURE.md       # Детальна архітектура
```

### Технологічний стек

**Frontend:**
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- CSS Variables + Modern CSS
- No frameworks, no build tools

**AI APIs:**
- Google Gemini 2.0 Flash
- Groq API (Llama 3.3 70B)
- Pollinations.ai

**Бібліотеки:**
- Prism.js (syntax highlighting)
- JSZip (ZIP архіви)

**Сховище:**
- IndexedDB (primary, до 50GB)
- localStorage (fallback, 5MB)

**Архітектура:**
- OOP Classes
- Event-driven (EventBus)
- Modular design
- Reactive state management

---

## 🔧 Основні модулі

### Core

#### app.js (~150)
Entry point додатку. Ініціалізація всіх модулів, routing, глобальні обробники подій.

#### state-manager.js (~400)
Централізоване управління станом. Reactive система з підписками на зміни.

```javascript
const state = stateManager.getState();
stateManager.setState({ key: 'value' });
stateManager.subscribe('key', callback);
```

#### chat-state.js (~300)
Управління станом чатів (Gemini, DeepSeek). Історія повідомлень, контекст розмов.

#### event-bus.js (~200)
Глобальна шина подій для міжмодульної комунікації.

```javascript
eventBus.emit('chat:message', data);
eventBus.on('chat:message', handler);
```

### Services

#### API Services
- **gemini-api.js** (~400) - Інтеграція з Gemini API
- **groq-api.js** (~400) - Інтеграція з Groq API
- **image-api.js** (~250) - Генерація зображень

#### Storage Services
- **indexeddb.js** (~450) - Робота з IndexedDB
- **migration.js** (~350) - Міграція з localStorage
- **cache.js** (~180) - Кешування запитів

#### Security Services
- **encryption.js** (~250) - XOR + Base64 шифрування API ключів
- **sanitizer.js** (~550) - **ЯК Є** - XSS захист, HTML санітизація
- **validator.js** (~300) - Валідація введення

### Features

#### Chat Features
- **gemini-chat.js** (~400) - Gemini чат логіка
- **gemini-ui.js** (~400) - Gemini UI
- **deepseek-chat.js** (~400) - DeepSeek чат
- **message-renderer.js** (~300) - Рендеринг повідомлень

#### Code Editor Features
- **deepseek-api.js** (~400) - API для коду
- **code-extractor.js** (~350) - Витягування коду
- **file-manager.js** (~350) - Управління файлами
- **ui-controller.js** (~300) - UI редактора
- **preview.js** (~250) - Live preview

#### Image Generator
- **generator.js** (~350) - Генерація зображень
- **gallery.js** (~250) - Галерея

#### Planner
- **planner.js** (~400) - Планувальник
- **task-manager.js** (~300) - Управління задачами
- **ai-subtasks.js** (~200) - AI генерація підзавдань

#### Memory
- **memory-manager.js** (~400) - Система пам'яті
- **search.js** (~200) - Пошук спогадів

#### Library
- **library.js** (~350) - Бібліотека проектів
- **preview-modal.js** (~300) - Preview modal
- **filters.js** (~150) - Фільтри

#### Dashboard
- **dashboard.js** (~400) - Dashboard
- **stats.js** (~300) - Статистика

### UI Components

- **modal-manager.js** (~450) - **ЯК Є** - Модальні вікна
- **toast.js** (~200) - Toast повідомлення
- **loading.js** (~150) - Loading indicators
- **theme-switcher.js** (~150) - Перемикач теми

### Utils

- **helpers.js** (~300) - Допоміжні функції
- **date-formatter.js** (~150) - Форматування дат
- **file-utils.js** (~250) - Робота з файлами
- **code-analyzer.js** (~350) - Аналіз коду

### Integrations

- **github.js** (~400) - GitHub імпорт
- **export.js** (~250) - Експорт даних

---

## 🔒 Безпека

### XSS Protection
- HTML санітизація всіх користувацьких даних
- CSP (Content Security Policy) headers
- DOMPurify-подібна очистка

### API Keys Encryption
- XOR + Base64 encoding
- Ключі не зберігаються у відкритому вигляді
- Безпечні getter/setter функції

### Input Validation
- Валідація всіх форм
- Перевірка типів даних
- Sanitization перед збереженням

### Code Analysis
- Виявлення небезпечних конструкцій
- Попередження про потенційні вразливості
- `eval()`, `innerHTML`, `document.write()` detection

### Rate Limiting
- Обмеження частоти запитів до API
- Автоматичний retry з exponential backoff
- Захист від DDoS

---

## 💻 Розробка

### Вимоги
- Сучасний браузер (Chrome 90+, Firefox 88+, Safari 14+)
- IndexedDB support
- JavaScript enabled
- LocalStorage (fallback)

### Гарячі клавіші

| Комбінація | Дія |
|---|---|
| `Ctrl + Enter` | Відправити повідомлення |
| `Ctrl + S` | Зберегти розмову |
| `Ctrl + K` | Пошук |
| `Ctrl + B` | Toggle код панель |
| `Ctrl + P` | Toggle preview |
| `Alt + ←/→` | Навігація між файлами |
| `Alt + 1-8` | Переключення режимів |
| `Escape` | Закрити модальні вікна |

### Debug Mode
Відкрийте консоль (F12) та використовуйте:

```javascript
// Глобальний стан
appState.debug();

// Статистика сховища
storageManager.getStorageStats();

// Лог помилок
errorHandler.getErrorReport();

// Експорт даних
await storageManager.exportAllData();
```

### Додавання нових модулів

1. Створіть файл у відповідній папці
2. Додайте `<script>` тег у `index.html`
3. Використовуйте EventBus для комунікації
4. Оновіть StateManager якщо потрібен стан
5. Додайте документацію

---

## 📡 API

### Gemini API
```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  }
);
```

### Groq API (DeepSeek)
```javascript
const response = await fetch(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [...history, { role: 'user', content: message }],
      temperature: 0.5,
      max_tokens: 8000
    })
  }
);
```

### Pollinations.ai
```javascript
const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;
```

---

## ❓ FAQ

### Чому Vanilla JS без фреймворків?
- Швидше завантаження (немає бандлів)
- Простіше для навчання
- Повний контроль над кодом
- Менше залежностей

### Чи безпечно зберігати API ключі?
Так, ключі шифруються XOR + Base64 та зберігаються в IndexedDB/localStorage. Вони ніколи не відправляються на сторонні сервери (окрім офіційних API).

### Скільки коштує використання?
**Безкоштовно!** Всі використані API мають generous free tiers:
- Gemini: 1500 запитів/день
- Groq: 14400 запитів/день
- Pollinations.ai: необмежено

### Чи працює офлайн?
Частково. UI та збережені дані доступні офлайн, але для AI запитів потрібен інтернет.

### Як експортувати всі дані?
**Налаштування** → **Експорт даних** → Завантажте JSON backup.

### Підтримка браузерів?
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ IE (не підтримується)

---

## 📄 Ліцензія

MIT License - використовуй вільно!

---

## 👨‍💻 Автор

Створено з ❤️ для спільноти розробників

**GitHub:** [ваш-профіль]  
**Email:** [ваш-email]

---

## 🤝 Contribution

Pull requests вітаються!

1. Fork проект
2. Створи feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit зміни (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Відкрий Pull Request

---

## 📝 Changelog

### v2.0.0 (Поточна)
- ✨ Модульна архітектура
- 🔒 XSS захист + шифрування
- 💾 IndexedDB замість localStorage
- 📊 Dashboard з статистикою
- 🐙 GitHub імпорт
- 🎨 Покращений UI/UX

### v1.0.0
- 🚀 Початковий реліз

---

**⭐ Подобається проект? Постав зірку на GitHub!**
