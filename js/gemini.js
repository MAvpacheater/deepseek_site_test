// Gemini Chat Logic
let geminiHistory = [];

// Відправка повідомлення в Gemini
async function sendGeminiMessage() {
    const input = document.getElementById('geminiInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;

    // Використовувати безпечну функцію отримання ключа
    const apiKey = typeof getGeminiApiKey === 'function' ? getGeminiApiKey() : localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('⚠️ Введи Gemini API ключ у налаштуваннях!');
        switchMode('settings');
        return;
    }

    input.value = '';
    input.style.height = 'auto';

    addMessage(message, 'user', 'geminiMessages');
    geminiHistory.push({ role: 'user', parts: [{ text: message }] });

    // Обмеження історії до 20 повідомлень
    if (geminiHistory.length > 20) {
        geminiHistory = geminiHistory.slice(-20);
    }

    const sendBtn = document.getElementById('geminiSendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    }

    try {
        const systemPrompt = localStorage.getItem('gemini_system_prompt') || 'Ти корисний AI асістент.';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: geminiHistory,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Помилка API');
        }

        const aiMessage = data.candidates[0].content.parts[0].text;
        
        geminiHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
        addMessage(aiMessage, 'assistant', 'geminiMessages');
        
        // Оновити статистику
        stats.geminiRequests++;
        stats.totalTokens += estimateTokens(message + aiMessage);
        saveStats();

    } catch (error) {
        console.error('Помилка:', error);
        addMessage('❌ Помилка: ' + error.message, 'assistant', 'geminiMessages');
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Надіслати';
        }
    }
}
