// 🛠️ AI Agent Tools - Інструменти для автономної роботи

const AgentTools = {
    // 📝 Аналіз тексту
    textAnalyzer: {
        name: 'Text Analyzer',
        execute(text) {
            const analysis = {
                length: text.length,
                words: text.split(/\s+/).filter(w => w).length,
                sentences: text.split(/[.!?]+/).filter(s => s.trim()).length,
                keywords: this.extractKeywords(text),
                sentiment: this.analyzeSentiment(text)
            };
            return analysis;
        },
        
        extractKeywords(text) {
            const words = text.toLowerCase()
                .replace(/[^\w\s\u0400-\u04FF]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3);
            
            const stopWords = ['і', 'в', 'на', 'з', 'до', 'це', 'як', 'що', 'та', 'або'];
            const filtered = words.filter(w => !stopWords.includes(w));
            
            const freq = {};
            filtered.forEach(word => {
                freq[word] = (freq[word] || 0) + 1;
            });
            
            return Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
        },
        
        analyzeSentiment(text) {
            const positive = ['добре', 'чудово', 'супер', 'класно', 'відмінно', 'збив'];
            const negative = ['погано', 'жахливо', 'поганий', 'проблема', 'помилка', 'грішити'];
            
            let score = 0;
            const lowerText = text.toLowerCase();
            
            positive.forEach(word => {
                if (lowerText.includes(word)) score += 1;
            });
            
            negative.forEach(word => {
                if (lowerText.includes(word)) score -= 1;
            });
            
            return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
        }
    },

    // 🔍 Аналіз коду
    codeAnalyzer: {
        name: 'Code Analyzer',
        execute(code, language) {
            const analysis = {
                language: language,
                lines: code.split('\n').length,
                issues: [],
                suggestions: [],
                quality: 'good'
            };
            
            if (language === 'javascript' || language === 'js') {
                if (code.includes('var ')) {
                    analysis.issues.push('❌ var - використай let/const');
                }
                if (code.match(/console\.log/g)?.length > 3) {
                    analysis.suggestions.push('💡 Забагато console.log');
                }
                if (code.match(/==/g) && !code.match(/===/g)) {
                    analysis.issues.push('❌ == замість ===');
                }
            }
            
            if (language === 'html') {
                if (!code.includes('<!DOCTYPE')) {
                    analysis.issues.push('❌ Відсутній DOCTYPE');
                }
                if (code.includes('<img') && !code.match(/<img[^>]+alt=/)) {
                    analysis.issues.push('❌ img без alt атрибуту');
                }
            }
            
            analysis.quality = analysis.issues.length === 0 ? 'good' : 'needs_improvement';
            return analysis;
        }
    },

    // 📋 Розбиття завдання на підзавдання
    taskPlanner: {
        name: 'Task Planner',
        execute(task) {
            const steps = [];
            const lower = task.toLowerCase();
            
            if (lower.includes('створ') || lower.includes('зроб')) {
                steps.push('📋 Проаналізувати вимоги');
                steps.push('🎨 Створити дизайн/структуру');
                steps.push('💻 Написати код');
                steps.push('🧪 Протестувати');
                steps.push('✅ Завершити');
            } else if (lower.includes('виправ') || lower.includes('баг')) {
                steps.push('🔍 Знайти проблему');
                steps.push('📊 Проаналізувати причину');
                steps.push('🔧 Виправити код');
                steps.push('🧪 Протестувати виправлення');
            } else if (lower.includes('навчи') || lower.includes('запам')) {
                steps.push('📚 Зібрати інформацію');
                steps.push('📝 Структурувати знання');
                steps.push('💾 Зберегти в пам\'ять');
            } else {
                steps.push('🤔 Аналізувати');
                steps.push('💡 Знайти рішення');
                steps.push('✅ Виконати');
            }
            
            return steps.map((desc, i) => ({
                id: i + 1,
                description: desc,
                status: 'pending'
            }));
        }
    },

    // 💾 Простий калькулятор
    calculator: {
        name: 'Calculator',
        execute(expression) {
            try {
                const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
                const result = Function(`'use strict'; return (${sanitized})`)();
                
                return {
                    expression: expression,
                    result: result,
                    success: true
                };
            } catch (error) {
                return {
                    expression: expression,
                    error: error.message,
                    success: false
                };
            }
        }
    },

    // 🎯 Витяг ключової інформації
    infoExtractor: {
        name: 'Info Extractor',
        execute(text, type = 'general') {
            const extracted = {
                emails: text.match(/[\w\.-]+@[\w\.-]+\.\w+/g) || [],
                urls: text.match(/https?:\/\/[^\s]+/g) || [],
                phones: text.match(/[\d\s\-\+\(\)]{10,}/g) || [],
                numbers: text.match(/\d+/g) || []
            };
            
            if (type === 'code') {
                extracted.functions = text.match(/function\s+(\w+)|const\s+(\w+)\s*=/g) || [];
                extracted.variables = text.match(/(?:let|const|var)\s+(\w+)/g) || [];
            }
            
            return extracted;
        }
    },

    // 📊 Генератор звіту
    reportGenerator: {
        name: 'Report Generator',
        execute(data, type = 'summary') {
            let report = `📊 Звіт - ${new Date().toLocaleString('uk-UA')}\n\n`;
            
            if (type === 'summary' && data.stats) {
                report += '📈 Статистика:\n';
                Object.entries(data.stats).forEach(([key, value]) => {
                    report += `  • ${key}: ${value}\n`;
                });
            }
            
            if (data.items && Array.isArray(data.items)) {
                report += '\n📋 Позиції:\n';
                data.items.forEach((item, i) => {
                    report += `  ${i + 1}. ${item}\n`;
                });
            }
            
            return report;
        }
    }
};

// Ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    console.log('🛠️ Agent Tools завантажено');
});

window.AgentTools = AgentTools;
