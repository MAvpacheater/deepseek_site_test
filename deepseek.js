// Логіка взаємодії з DeepSeek AI через Groq API

let conversationHistory = [];

// Відправка повідомлення до AI
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Очищення поля вводу
    input.value = '';
    input.style.height = 'auto';

    // Додавання повідомлення користувача
    addMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

    // Блокування кнопки відправки
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

    try {
        const apiKey = localStorage.getItem('groq_api_key');
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            handleApiError(response.status, data);
            return;
        }

        const aiMessage = data.choices[0].message.content;
        
        // Додавання відповіді AI в історію
        conversationHistory.push({ role: 'assistant', content: aiMessage });
        
        // Відокремлення тексту від коду
        const textOnly = removeCodeBlocks(aiMessage);
        addMessage(textOnly, 'assistant');
        
        // Витягування та відображення коду
        extractAndDisplayCode(aiMessage);

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка з\'єднання: ' + error.message, 'assistant');
    } finally {
        // Розблокування кнопки
        sendBtn.disabled = false;
        sendBtn.textContent = 'Надіслати';
    }
}

// Обробка помилок API
function handleApiError(status, data) {
    let errorMessage = '';
    
    switch (status) {
        case 401:
            errorMessage = 'Невірний API ключ! Перевір ключ на console.groq.com';
            setTimeout(() => {
                if (confirm('Хочеш ввести новий API ключ?')) {
                    localStorage.removeItem('groq_api_key');
                    location.reload();
                }
            }, 500);
            break;
        case 429:
            errorMessage = 'Забагато запитів. Почекай хвилину і спробуй знову.';
            break;
        case 500:
            errorMessage = 'Помилка сервера API. Спробуй пізніше.';
            break;
        default:
            errorMessage = data.error?.message || `Помилка API: ${status}`;
    }
    
    addMessage('❌ Помилка: ' + errorMessage, 'assistant');
}

// Очищення історії розмови (можна додати кнопку в UI)
function clearConversation() {
    conversationHistory = [];
    document.getElementById('messages').innerHTML = '';
    codeFiles = {};
    document.getElementById('fileTabs').innerHTML = '';
    document.getElementById('codeContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3>Немає файлів</h3>
            <p>Код з'явиться тут після відповіді AI</p>
        </div>
    `;
}
