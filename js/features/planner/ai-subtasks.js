// 🤖 AI Subtasks Generator (200 lines)

class AISubtasksGenerator {
    constructor() {
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.isGenerating = false;
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        console.log('✅ AI Subtasks Generator initialized');
    }

    // ========================================
    // ГЕНЕРАЦІЯ ПІДЗАВДАНЬ
    // ========================================

    async generateSubtasks(planId) {
        if (this.isGenerating) {
            if (window.showToast) {
                showToast('⏳ AI вже генерує підзавдання', 'warning');
            }
            return null;
        }

        const plan = this.getPlan(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        // Перевірити API ключ
        const apiKey = this.getApiKey();
        if (!apiKey) {
            if (window.showToast) {
                showToast('🔑 Введи Groq API ключ у налаштуваннях!', 'error');
            }
            if (typeof switchMode === 'function') {
                switchMode('settings');
            }
            return null;
        }

        this.isGenerating = true;

        if (window.showToast) {
            showToast('🤖 AI генерує підзавдання...', 'info', 3000);
        }

        try {
            // Створити prompt
            const prompt = this.buildPrompt(plan);

            // Викликати API
            const subtasksText = await this.callAPI(apiKey, prompt);

            // Парсити результат
            const subtasks = this.parseSubtasks(subtasksText);

            if (subtasks.length === 0) {
                throw new Error('AI не згенерував підзавдання');
            }

            // Додати підзавдання до плану
            if (window.taskManager) {
                await taskManager.addMultipleTasks(planId, subtasks);
            }

            // Позначити що план має AI підзавдання
            if (window.plannerCore) {
                await plannerCore.updatePlan(planId, { aiGenerated: true });
            }

            if (window.showToast) {
                showToast(`✅ AI створив ${subtasks.length} підзавдань!`, 'success');
            }

            return subtasks;

        } catch (error) {
            this.handleError(error);
            return null;
        } finally {
            this.isGenerating = false;
        }
    }

    // ========================================
    // PROMPT GENERATION
    // ========================================

    buildPrompt(plan) {
        let prompt = `Розбий це завдання на конкретні, виконувані підзавдання (від 3 до 7 штук):\n\n`;
        prompt += `Завдання: ${plan.title}\n`;
        
        if (plan.description) {
            prompt += `Опис: ${plan.description}\n`;
        }

        if (plan.deadline) {
            const deadline = new Date(plan.deadline);
            prompt += `Дедлайн: ${deadline.toLocaleDateString('uk-UA')}\n`;
        }

        prompt += `\nВимоги:\n`;
        prompt += `- Кожне підзавдання має бути чітким та конкретним\n`;
        prompt += `- Підзавдання мають бути в логічному порядку виконання\n`;
        prompt += `- Кожне підзавдання має починатися з дієслова\n`;
        prompt += `- Формат: один підзавдання на рядок, без нумерації\n\n`;
        prompt += `Підзавдання:`;

        return prompt;
    }

    // ========================================
    // API CALL
    // ========================================

    async callAPI(apiKey, prompt) {
        const systemPrompt = 'Ти помічник для планування завдань. Створюй чіткі, конкретні підзавдання українською мовою.';

        const requestBody = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
        };

        try {
            let response;

            if (window.errorHandler) {
                response = await errorHandler.fetchWithRetry(
                    this.apiEndpoint,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody),
                        timeout: 30000
                    }
                );
            } else {
                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
                }
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response format');
            }

            return data.choices[0].message.content;

        } catch (error) {
            if (window.errorHandler) {
                errorHandler.logError({
                    type: 'ai_subtasks_error',
                    message: 'Failed to generate subtasks',
                    error: error.message,
                    severity: 'medium'
                });
            }
            throw error;
        }
    }

    // ========================================
    // ПАРСИНГ РЕЗУЛЬТАТУ
    // ========================================

    parseSubtasks(text) {
        if (!text) return [];

        const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Видалити нумерацію, маркери, тощо
                return line
                    .replace(/^[-•*\d.)\]]+\s*/, '')
                    .replace(/^\[[\sx]\]\s*/, '')
                    .trim();
            })
            .filter(line => {
                // Фільтрувати порожні та занадто короткі
                return line.length > 3 && line.length < 200;
            });

        // Обмежити до 10 підзавдань
        return lines.slice(0, 10);
    }

    // ========================================
    // ПОКРАЩЕННЯ ІСНУЮЧИХ ПІДЗАВДАНЬ
    // ========================================

    async improveSubtasks(planId) {
        const plan = this.getPlan(planId);
        if (!plan || !plan.subtasks || plan.subtasks.length === 0) {
            if (window.showToast) {
                showToast('⚠️ Немає підзавдань для покращення', 'warning');
            }
            return null;
        }

        const apiKey = this.getApiKey();
        if (!apiKey) return null;

        this.isGenerating = true;

        try {
            const prompt = this.buildImprovementPrompt(plan);
            const improvedText = await this.callAPI(apiKey, prompt);
            const improvedSubtasks = this.parseSubtasks(improvedText);

            if (improvedSubtasks.length === 0) {
                throw new Error('AI не покращив підзавдання');
            }

            // Замінити підзавдання
            if (window.plannerCore) {
                await plannerCore.updatePlan(planId, {
                    subtasks: improvedSubtasks.map(title => ({
                        id: Date.now() + Math.random(),
                        title: title,
                        completed: false,
                        created: new Date().toISOString()
                    }))
                });
            }

            if (window.showToast) {
                showToast('✅ AI покращив підзавдання!', 'success');
            }

            return improvedSubtasks;

        } catch (error) {
            this.handleError(error);
            return null;
        } finally {
            this.isGenerating = false;
        }
    }

    buildImprovementPrompt(plan) {
        let prompt = `Покращ ці підзавдання, зроби їх більш конкретними та виконуваними:\n\n`;
        prompt += `Завдання: ${plan.title}\n\n`;
        prompt += `Поточні підзавдання:\n`;
        
        plan.subtasks.forEach((task, i) => {
            prompt += `${i + 1}. ${task.title}\n`;
        });

        prompt += `\nПокращені підзавдання:`;

        return prompt;
    }

    // ========================================
    // ERROR HANDLING
    // ========================================

    handleError(error) {
        console.error('AI subtasks generation error:', error);

        let message = '❌ Помилка генерації: ';

        if (error.message.includes('API key')) {
            message += 'Невірний API ключ';
        } else if (error.message.includes('quota')) {
            message += 'Перевищено ліміт запитів';
        } else if (error.message.includes('network')) {
            message += 'Проблеми з інтернетом';
        } else {
            message += error.message || 'Щось пішло не так';
        }

        if (window.showToast) {
            showToast(message, 'error', 7000);
        }
    }

    // ========================================
    // UTILITY
    // ========================================

    getPlan(planId) {
        const plans = window.appState ? appState.getPlans() : [];
        return plans.find(p => p.id === planId);
    }

    getApiKey() {
        if (typeof getGroqApiKey === 'function') {
            return getGroqApiKey();
        }

        if (window.appState) {
            return appState.getApiKey('groq');
        }

        return localStorage.getItem('groq_api_key');
    }

    getStatus() {
        return {
            isGenerating: this.isGenerating,
            model: this.model
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const aiSubtasksGenerator = new AISubtasksGenerator();

// Експорт
window.aiSubtasksGenerator = aiSubtasksGenerator;
window.AISubtasksGenerator = AISubtasksGenerator;

// Compatibility function
window.generateSubtasks = (planId) => aiSubtasksGenerator.generateSubtasks(planId);

console.log('✅ AI Subtasks Generator loaded');
