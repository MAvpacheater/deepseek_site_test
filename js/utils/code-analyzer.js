// 🔍 Code Analyzer - Аналіз коду

class CodeAnalyzer {
    constructor() {
        this.securityPatterns = this.initSecurityPatterns();
        this.qualityPatterns = this.initQualityPatterns();
    }

    // ========================================
    // SECURITY ANALYSIS
    // ========================================

    initSecurityPatterns() {
        return [
            {
                name: 'eval',
                pattern: /eval\s*\(/gi,
                severity: 'critical',
                message: 'eval() може виконувати довільний код',
                category: 'security'
            },
            {
                name: 'innerHTML',
                pattern: /\.innerHTML\s*=/gi,
                severity: 'high',
                message: 'innerHTML може призвести до XSS атак',
                category: 'security'
            },
            {
                name: 'document.write',
                pattern: /document\.write\s*\(/gi,
                severity: 'medium',
                message: 'document.write() застаріла та небезпечна',
                category: 'security'
            },
            {
                name: 'dangerouslySetInnerHTML',
                pattern: /dangerouslySetInnerHTML/gi,
                severity: 'high',
                message: 'Використання dangerouslySetInnerHTML без санітизації',
                category: 'security'
            },
            {
                name: 'exec',
                pattern: /exec\s*\(/gi,
                severity: 'critical',
                message: 'exec() може виконувати системні команди',
                category: 'security'
            },
            {
                name: 'localStorage password',
                pattern: /localStorage\.(setItem|getItem).*password/gi,
                severity: 'critical',
                message: 'Збереження паролів в localStorage',
                category: 'security'
            },
            {
                name: 'http requests',
                pattern: /fetch\s*\([^)]*http:\/\//gi,
                severity: 'medium',
                message: 'Використання HTTP замість HTTPS',
                category: 'security'
            },
            {
                name: 'SQL injection',
                pattern: /query.*\+.*user|SELECT.*\+/gi,
                severity: 'critical',
                message: 'Потенційна SQL injection вразливість',
                category: 'security'
            }
        ];
    }

    analyzeSecurity(code) {
        const issues = [];

        this.securityPatterns.forEach(({ name, pattern, severity, message, category }) => {
            const matches = code.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const lineNumber = this.getLineNumber(code, match);
                    issues.push({
                        name,
                        severity,
                        message,
                        category,
                        match,
                        line: lineNumber
                    });
                });
            }
        });

        return issues;
    }

    // ========================================
    // CODE QUALITY ANALYSIS
    // ========================================

    initQualityPatterns() {
        return [
            {
                name: 'console.log',
                pattern: /console\.(log|warn|error|debug)/gi,
                severity: 'low',
                message: 'Залишено console.log()',
                category: 'quality'
            },
            {
                name: 'debugger',
                pattern: /debugger;/gi,
                severity: 'low',
                message: 'Залишено debugger',
                category: 'quality'
            },
            {
                name: 'TODO',
                pattern: /(TODO|FIXME|HACK|XXX):/gi,
                severity: 'info',
                message: 'Коментар TODO/FIXME',
                category: 'quality'
            },
            {
                name: 'var keyword',
                pattern: /\bvar\s+/g,
                severity: 'low',
                message: 'Використання var замість let/const',
                category: 'quality'
            },
            {
                name: 'function length',
                pattern: null, // Custom check
                severity: 'medium',
                message: 'Функція занадто довга (>50 рядків)',
                category: 'quality'
            }
        ];
    }

    analyzeQuality(code) {
        const issues = [];

        // Pattern-based checks
        this.qualityPatterns.forEach(({ name, pattern, severity, message, category }) => {
            if (!pattern) return;

            const matches = code.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const lineNumber = this.getLineNumber(code, match);
                    issues.push({
                        name,
                        severity,
                        message,
                        category,
                        match,
                        line: lineNumber
                    });
                });
            }
        });

        // Check function length
        const functionLengthIssues = this.checkFunctionLength(code);
        issues.push(...functionLengthIssues);

        // Check complexity
        const complexityIssues = this.checkComplexity(code);
        issues.push(...complexityIssues);

        return issues;
    }

    // ========================================
    // CODE METRICS
    // ========================================

    getMetrics(code) {
        const lines = code.split('\n');
        
        return {
            totalLines: lines.length,
            codeLines: this.countCodeLines(code),
            commentLines: this.countCommentLines(code),
            blankLines: this.countBlankLines(code),
            functions: this.countFunctions(code),
            classes: this.countClasses(code),
            complexity: this.calculateComplexity(code),
            size: code.length,
            sizeFormatted: this.formatBytes(code.length)
        };
    }

    countCodeLines(code) {
        const lines = code.split('\n');
        return lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
        }).length;
    }

    countCommentLines(code) {
        const singleLine = (code.match(/\/\/.*/g) || []).length;
        const multiLine = (code.match(/\/\*[\s\S]*?\*\//g) || [])
            .reduce((count, comment) => count + comment.split('\n').length, 0);
        return singleLine + multiLine;
    }

    countBlankLines(code) {
        const lines = code.split('\n');
        return lines.filter(line => line.trim() === '').length;
    }

    countFunctions(code) {
        const functionPatterns = [
            /function\s+\w+/g,
            /\w+\s*:\s*function/g,
            /=>\s*{/g,
            /const\s+\w+\s*=\s*\(/g
        ];

        let count = 0;
        functionPatterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) count += matches.length;
        });

        return count;
    }

    countClasses(code) {
        const classPattern = /class\s+\w+/g;
        const matches = code.match(classPattern);
        return matches ? matches.length : 0;
    }

    calculateComplexity(code) {
        // Simplified cyclomatic complexity
        const patterns = [
            /if\s*\(/g,
            /else\s+if/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /&&/g,
            /\|\|/g,
            /\?/g
        ];

        let complexity = 1;
        patterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) complexity += matches.length;
        });

        return complexity;
    }

    // ========================================
    // SPECIALIZED CHECKS
    // ========================================

    checkFunctionLength(code) {
        const issues = [];
        const functionRegex = /function\s+(\w+)[^{]*{([^}]*{[^}]*}[^}]*)*}/g;
        
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            const functionBody = match[0];
            const lines = functionBody.split('\n').length;
            
            if (lines > 50) {
                const lineNumber = this.getLineNumber(code, match[0]);
                issues.push({
                    name: 'long function',
                    severity: 'medium',
                    message: `Функція ${match[1]} занадто довга (${lines} рядків)`,
                    category: 'quality',
                    line: lineNumber
                });
            }
        }

        return issues;
    }

    checkComplexity(code) {
        const issues = [];
        const complexity = this.calculateComplexity(code);
        
        if (complexity > 10) {
            issues.push({
                name: 'high complexity',
                severity: 'medium',
                message: `Висока складність коду (${complexity})`,
                category: 'quality',
                line: 1
            });
        }

        return issues;
    }

    // ========================================
    // COMPLETE ANALYSIS
    // ========================================

    analyze(code, options = {}) {
        const {
            checkSecurity = true,
            checkQuality = true,
            getMetrics = true
        } = options;

        const result = {
            issues: [],
            metrics: null,
            summary: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0
            }
        };

        // Security analysis
        if (checkSecurity) {
            const securityIssues = this.analyzeSecurity(code);
            result.issues.push(...securityIssues);
        }

        // Quality analysis
        if (checkQuality) {
            const qualityIssues = this.analyzeQuality(code);
            result.issues.push(...qualityIssues);
        }

        // Metrics
        if (getMetrics) {
            result.metrics = this.getMetrics(code);
        }

        // Count by severity
        result.issues.forEach(issue => {
            result.summary[issue.severity]++;
        });

        // Sort by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        result.issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return result;
    }

    // ========================================
    // REPORT GENERATION
    // ========================================

    generateReport(analysisResult) {
        const { issues, metrics, summary } = analysisResult;

        let report = '🔍 ЗВІТ АНАЛІЗУ КОДУ\n\n';

        // Summary
        report += '📊 ПІДСУМОК:\n';
        report += `   🔴 Критичні: ${summary.critical}\n`;
        report += `   🟠 Високі: ${summary.high}\n`;
        report += `   🟡 Середні: ${summary.medium}\n`;
        report += `   🟢 Низькі: ${summary.low}\n`;
        report += `   ℹ️  Інфо: ${summary.info}\n\n`;

        // Metrics
        if (metrics) {
            report += '📈 МЕТРИКИ:\n';
            report += `   Всього рядків: ${metrics.totalLines}\n`;
            report += `   Рядків коду: ${metrics.codeLines}\n`;
            report += `   Коментарів: ${metrics.commentLines}\n`;
            report += `   Функцій: ${metrics.functions}\n`;
            report += `   Класів: ${metrics.classes}\n`;
            report += `   Складність: ${metrics.complexity}\n`;
            report += `   Розмір: ${metrics.sizeFormatted}\n\n`;
        }

        // Issues
        if (issues.length > 0) {
            report += '⚠️ ЗНАЙДЕНІ ПРОБЛЕМИ:\n\n';
            
            issues.forEach((issue, i) => {
                const icon = this.getSeverityIcon(issue.severity);
                report += `${i + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.message}\n`;
                report += `   Рядок: ${issue.line}\n`;
                if (issue.match) {
                    report += `   Код: ${issue.match.substring(0, 50)}...\n`;
                }
                report += '\n';
            });
        } else {
            report += '✅ Проблем не знайдено!\n';
        }

        return report;
    }

    // ========================================
    // HELPERS
    // ========================================

    getLineNumber(code, searchString) {
        const index = code.indexOf(searchString);
        if (index === -1) return 0;
        
        return code.substring(0, index).split('\n').length;
    }

    getSeverityIcon(severity) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            info: 'ℹ️'
        };
        return icons[severity] || '⚪';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Експорт
const codeAnalyzer = new CodeAnalyzer();
window.codeAnalyzer = codeAnalyzer;

// Backward compatibility
window.analyzeCode = (code) => codeAnalyzer.analyze(code);

console.log('✅ Code Analyzer loaded');
