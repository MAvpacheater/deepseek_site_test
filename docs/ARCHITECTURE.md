# 🏗️ AI Assistant Hub - Детальна архітектура

**Версія:** 2.0  
**Тип:** Модульна клієнт-серверна архітектура  
**Парадигма:** OOP + Event-driven + Reactive patterns

---

## 📋 Зміст

1. [Загальний огляд](#загальний-огляд)
2. [Шари архітектури](#шари-архітектури)
3. [Потік даних](#потік-даних)
4. [Модулі та залежності](#модулі-та-залежності)
5. [State Management](#state-management)
6. [API інтеграції](#api-інтеграції)
7. [Сховище даних](#сховище-даних)
8. [Безпека](#безпека)
9. [Масштабування](#масштабування)

---

## 🎯 Загальний огляд

### Принципи дизайну

1. **Модульність** - кожен модуль незалежний та заміняється
2. **Separation of Concerns** - логіка відокремлена від UI
3. **Single Responsibility** - один модуль = одна відповідальність
4. **Event-driven** - слабкий зв'язок через EventBus
5. **Progressive Enhancement** - працює без JavaScript (базово)
6. **Mobile First** - адаптивний дизайн

### Архітектурна схема

```
┌─────────────────────────────────────────────────────────┐
│                      PRESENTATION                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         UI Components (modals, toasts...)        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Pages (dashboard, chat, editor, library...)   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Features (chat, code-editor, planner...)       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Core (state-manager, event-bus)             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                       SERVICES                           │
│  ┌───────────────┬───────────────┬────────────────┐    │
│  │   API Layer   │ Storage Layer │ Security Layer │    │
│  │ (gemini,groq) │ (IndexedDB)   │ (encryption)   │    │
│  └───────────────┴───────────────┴────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                         │
│    Gemini API  |  Groq API  |  Pollinations.ai          │
└─────────────────────────────────────────────────────────┘
```

---

## 🏛️ Шари архітектури

### 1. Presentation Layer (UI)

**Відповідальність:** Відображення даних, взаємодія з користувачем

**Компоненти:**
- `css/components/*` - Переносні UI компоненти
- `css/layout/*` - Структура сторінок
- `css/pages/*` - Специфічні стилі сторінок
- `js/ui/*` - UI контролери (modal, toast, loading)

**Паттерни:**
- Component-based architecture
- CSS BEM naming convention
- Responsive design (mobile-first)

### 2. Business Logic Layer

**Відповідальність:** Бізнес-логіка, обробка подій, workflow

**Модулі:**

#### Core (`js/core/`)
- **app.js** - Application entry point, initialization
- **state-manager.js** - Централізоване управління станом
- **chat-state.js** - Спеціалізований стан для чатів
- **event-bus.js** - Pub/Sub система

#### Features (`js/features/`)
Кожна feature - окремий модуль з власною логікою:
- `chat/` - Gemini та DeepSeek чати
- `code-editor/` - Редактор коду
- `image-generator/` - Генерація зображень
- `planner/` - Планувальник задач
- `memory/` - Система пам'яті
- `library/` - Бібліотека проектів
- `dashboard/` - Dashboard та статистика

**Паттерни:**
- Class-based OOP
- Observer pattern (через EventBus)
- Command pattern (для undo/redo)

### 3. Service Layer

**Відповідальність:** Інтеграція з зовнішніми сервісами, персистенція даних

**Підшари:**

#### API Services (`js/services/api/`)
```javascript
class GeminiAPI {
  constructor(apiKey) { ... }
  
  async chat(messages, options) {
    // HTTP request to Gemini API
    // Error handling
    // Response parsing
  }
}
```

#### Storage Services (`js/services/storage/`)
```javascript
class IndexedDBService {
  async save(store, data) { ... }
  async get(store, id) { ... }
  async query(store, filter) { ... }
}
```

#### Security Services (`js/services/security/`)
```javascript
class SecurityService {
  encryptAPIKey(key) { ... }
  sanitizeHTML(html) { ... }
  validateInput(data, rules) { ... }
}
```

**Паттерни:**
- Repository pattern (для storage)
- Factory pattern (для API clients)
- Strategy pattern (для різних storage backends)

### 4. Data Layer

**Відповідальність:** Зберігання та отримання даних

**Джерела даних:**
1. **IndexedDB** (primary) - структуровані дані
2. **localStorage** (fallback) - налаштування, кеш
3. **Memory** (runtime) - тимчасовий стан

---

## 🔄 Потік даних

### Приклад: Відправка повідомлення в Gemini Chat

```
User Action (UI)
      ↓
Event Handler (gemini-ui.js)
      ↓
Validation (validator.js)
      ↓
State Update (chat-state.js)
      ↓
UI Update (message-renderer.js)
      ↓
API Call (gemini-api.js)
      ↓
Response Processing
      ↓
State Update (chat-state.js)
      ↓
UI Update (message-renderer.js)
      ↓
Storage (indexeddb.js)
      ↓
Event Broadcast (event-bus.js)
```

### Reactive Flow

```javascript
// 1. User sends message
geminiUI.sendMessage(text);

// 2. Update state
chatState.addMessage({ role: 'user', text });

// 3. State emits event
eventBus.emit('chat:message-added', message);

// 4. UI subscribes and updates
eventBus.on('chat:message-added', (msg) => {
  messageRenderer.render(msg);
});

// 5. API call
const response = await geminiAPI.chat(history);

// 6. Update state with response
chatState.addMessage({ role: 'assistant', text: response });

// 7. Repeat step 3-4
```

---

## 📦 Модулі та залежності

### Граф залежностей

```
app.js
  ├─ state-manager.js
  ├─ event-bus.js
  ├─ router.js
  └─ feature modules
       ├─ gemini-chat.js
       │    ├─ gemini-api.js
       │    ├─ chat-state.js
       │    └─ message-renderer.js
       │
       ├─ deepseek-chat.js
       │    ├─ groq-api.js
       │    ├─ code-extractor.js
       │    └─ file-manager.js
       │
       └─ ...
```

### Dependency Injection

```javascript
class GeminiChat {
  constructor(apiService, stateManager, renderer) {
    this.api = apiService;
    this.state = stateManager;
    this.renderer = renderer;
  }
  
  async sendMessage(text) {
    // Use injected dependencies
    this.state.addMessage({ role: 'user', text });
    const response = await this.api.chat(this.state.getHistory());
    this.renderer.render(response);
  }
}

// Initialization
const geminiChat = new GeminiChat(
  new GeminiAPI(apiKey),
  chatState,
  messageRenderer
);
```

---

## 🗄️ State Management

### Структура стану

```javascript
const appState = {
  // UI state
  ui: {
    currentMode: 'dashboard',
    theme: 'dark',
    isCodePanelOpen: false,
    isSidebarOpen: true
  },
  
  // Chat state
  chat: {
    gemini: {
      history: [],    // For API (no timestamp)
      messages: [],   // For UI (with timestamp)
      systemPrompt: '...'
    },
    deepseek: {
      history: [],
      messages: [],
      codeFiles: {},
      projectContext: {}
    },
    image: {
      gallery: []
    }
  },
  
  // User state
  user: {
    apiKeys: {
      gemini: null,
      groq: null
    },
    settings: {},
    stats: {
      geminiRequests: 0,
      deepseekRequests: 0,
      imagesGenerated: 0,
      totalTokens: 0
    }
  },
  
  // Agent state
  agent: {
    isActive: false,
    autonomousMode: false,
    memory: [],
    plans: [],
    taskQueue: []
  }
};
```

### State Manager API

```javascript
// Get state
const state = stateManager.getState();

// Set state
stateManager.setState({ 
  'ui.theme': 'light' 
});

// Subscribe to changes
const unsubscribe = stateManager.subscribe('ui.theme', (newTheme) => {
  console.log('Theme changed:', newTheme);
});

// Computed properties
stateManager.computed('activePlansCount', (state) => {
  return state.agent.plans.filter(p => p.status !== 'completed').length;
});
```

### Reactive Updates

```javascript
class StateManager {
  constructor() {
    this.state = {};
    this.listeners = new Map();
  }
  
  setState(path, value) {
    // Update state
    this.setNested(this.state, path, value);
    
    // Notify listeners
    this.notify(path, value);
  }
  
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);
    
    // Return unsubscribe function
    return () => this.unsubscribe(path, callback);
  }
  
  notify(path, value) {
    const callbacks = this.listeners.get(path) || [];
    callbacks.forEach(cb => cb(value));
  }
}
```

---

## 🌐 API інтеграції

### Gemini API

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

**Request:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Hello!" }]
    }
  ],
  "systemInstruction": {
    "parts": [{ "text": "You are a helpful assistant" }]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048,
    "topP": 0.95,
    "topK": 40
  },
  "safetySettings": [...]
}
```

**Response:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "Hi! How can I help?" }],
        "role": "model"
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

### Groq API (DeepSeek)

**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`

**Request:**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert programmer"
    },
    {
      "role": "user",
      "content": "Create a React button component"
    }
  ],
  "temperature": 0.5,
  "max_tokens": 8000,
  "top_p": 0.95
}
```

**Rate Limits:**
- Gemini: 15 req/min, 1500 req/day
- Groq: 30 req/min, 14400 req/day

### Error Handling

```javascript
class APIClient {
  async fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw await this.createError(response);
        }
        
        return response;
        
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Exponential backoff
        await this.delay(1000 * Math.pow(2, i));
      }
    }
  }
  
  async createError(response) {
    const data = await response.json();
    const error = new Error(data.error?.message || 'API Error');
    error.status = response.status;
    error.type = this.getErrorType(response.status);
    return error;
  }
  
  getErrorType(status) {
    if (status === 401) return 'auth_error';
    if (status === 429) return 'rate_limit';
    if (status >= 500) return 'server_error';
    return 'api_error';
  }
}
```

---

## 💾 Сховище даних

### IndexedDB Schema

```javascript
const dbSchema = {
  name: 'AIAssistantHub',
  version: 1,
  stores: {
    conversations: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'mode', unique: false },
        { name: 'date', unique: false },
        { name: 'favorite', unique: false }
      ]
    },
    codeFiles: {
      keyPath: 'id',
      autoIncrement: true
    },
    memories: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'category', unique: false },
        { name: 'important', unique: false },
        { name: 'created', unique: false }
      ]
    },
    plans: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'status', unique: false },
        { name: 'deadline', unique: false }
      ]
    },
    settings: {
      keyPath: 'key'
    },
    cache: {
      keyPath: 'key',
      indexes: [
        { name: 'expires', unique: false }
      ]
    }
  }
};
```

### Storage Operations

```javascript
// Save conversation
await storageManager.add('conversations', {
  mode: 'gemini',
  title: 'My Chat',
  messages: [...],
  createdAt: new Date().toISOString()
});

// Query by index
const geminiChats = await storageManager.query(
  'conversations',
  'mode',
  'gemini'
);

// Update
await storageManager.update('conversations', {
  id: 123,
  favorite: true
});

// Delete
await storageManager.delete('conversations', 123);
```

### Caching Strategy

```javascript
class CacheManager {
  async get(key) {
    const cached = await storage.get('cache', key);
    
    if (!cached) return null;
    
    // Check expiration
    if (cached.expires < Date.now()) {
      await storage.delete('cache', key);
      return null;
    }
    
    return cached.value;
  }
  
  async set(key, value, ttl = 3600000) {
    await storage.set('cache', {
      key,
      value,
      expires: Date.now() + ttl
    });
  }
}
```

---

## 🔒 Безпека

### XSS Protection

**Sanitizer:**
```javascript
class HTMLSanitizer {
  sanitize(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    this.sanitizeNode(temp);
    
    return temp.innerHTML;
  }
  
  sanitizeNode(node) {
    // Remove dangerous tags
    const dangerous = ['script', 'iframe', 'object', 'embed'];
    dangerous.forEach(tag => {
      const elements = node.getElementsByTagName(tag);
      Array.from(elements).forEach(el => el.remove());
    });
    
    // Remove dangerous attributes
    const elements = node.getElementsByTagName('*');
    Array.from(elements).forEach(el => {
      this.sanitizeAttributes(el);
    });
  }
  
  sanitizeAttributes(element) {
    const dangerous = /^on|javascript:|data:text\/html/i;
    
    Array.from(element.attributes).forEach(attr => {
      if (dangerous.test(attr.name) || dangerous.test(attr.value)) {
        element.removeAttribute(attr.name);
      }
    });
  }
}
```

### API Key Encryption

```javascript
class Encryption {
  encrypt(text, secret) {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const secretChar = secret.charCodeAt(i % secret.length);
      encrypted += String.fromCharCode(textChar ^ secretChar);
    }
    return btoa(encrypted);
  }
  
  decrypt(encrypted, secret) {
    const decoded = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const encChar = decoded.charCodeAt(i);
      const secretChar = secret.charCodeAt(i % secret.length);
      decrypted += String.fromCharCode(encChar ^ secretChar);
    }
    return decrypted;
  }
}
```

### Input Validation

```javascript
class Validator {
  validate(input, rules) {
    const errors = [];
    
    if (rules.required && !input) {
      errors.push('Field is required');
    }
    
    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Max length is ${rules.maxLength}`);
    }
    
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Invalid format');
    }
    
    if (!rules.allowHTML && /<[^>]*>/g.test(input)) {
      errors.push('HTML not allowed');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

---

## 📈 Масштабування

### Performance Optimizations

1. **Lazy Loading** - завантаження модулів за потребою
2. **Code Splitting** - розділення на чанки
3. **Debouncing** - затримка виконання функцій
4. **Throttling** - обмеження частоти викликів
5. **Virtual Scrolling** - для великих списків
6. **Web Workers** - для важких обчислень

### Приклад: Debounce

```javascript
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', debounce((e) => {
  search(e.target.value);
}, 300));
```

### Memory Management

```javascript
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
  }
  
  set(key, value) {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  cleanup() {
    // Remove old entries
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (value.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

## 🧪 Тестування (майбутнє)

### Unit Tests
```javascript
// Example with Jest
describe('StateManager', () => {
  test('should update state', () => {
    const manager = new StateManager();
    manager.setState('ui.theme', 'dark');
    expect(manager.getState().ui.theme).toBe('dark');
  });
  
  test('should notify subscribers', () => {
    const manager = new StateManager();
    const callback = jest.fn();
    manager.subscribe('ui.theme', callback);
    manager.setState('ui.theme', 'light');
    expect(callback).toHaveBeenCalledWith('light');
  });
});
```

---

## 📚 Додаткові ресурси

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Security Best Practices](https://cheatsheetseries.owasp.org/)

---

**Дата оновлення:** 2025-01-XX  
**Версія документа:** 2.0
