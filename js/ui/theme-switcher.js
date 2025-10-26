// 🎨 Theme Switcher - Управління темами (FIXED)

class ThemeSwitcher {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                name: 'Темна',
                icon: '🌙'
            },
            light: {
                name: 'Світла',
                icon: '☀️'
            }
        };
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.loadTheme();
        this.setupListeners();
        console.log('✅ Theme Switcher initialized');
    }

    loadTheme() {
        try {
            // Спробувати завантажити з appState
            if (window.appState && window.appState.ui && window.appState.ui.theme) {
                this.currentTheme = appState.ui.theme;
            } else {
                // Fallback до localStorage
                const saved = localStorage.getItem('theme');
                if (saved && this.themes[saved]) {
                    this.currentTheme = saved;
                } else {
                    // Використати системну тему якщо доступна
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        this.currentTheme = 'dark';
                    } else {
                        this.currentTheme = 'dark'; // За замовчуванням
                    }
                }
            }

            this.applyTheme(this.currentTheme, false);
        } catch (error) {
            console.error('Error loading theme:', error);
            this.currentTheme = 'dark';
            this.applyTheme('dark', false);
        }
    }

    setupListeners() {
        try {
            // Підписатися на зміни в appState
            if (window.appState && typeof appState.on === 'function') {
                appState.on('theme:change', ({ theme }) => {
                    this.applyTheme(theme, false);
                });
            }

            // Відстежувати системні налаштування
            if (window.matchMedia) {
                const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
                
                // Використовуємо addEventListener якщо є, інакше addListener
                if (darkModeQuery.addEventListener) {
                    darkModeQuery.addEventListener('change', (e) => {
                        if (!localStorage.getItem('theme')) {
                            this.setTheme(e.matches ? 'dark' : 'light');
                        }
                    });
                } else if (darkModeQuery.addListener) {
                    darkModeQuery.addListener((e) => {
                        if (!localStorage.getItem('theme')) {
                            this.setTheme(e.matches ? 'dark' : 'light');
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error setting up theme listeners:', error);
        }
    }

    // ========================================
    // ЗАСТОСУВАТИ ТЕМУ
    // ========================================

    applyTheme(theme, save = true) {
        try {
            if (!this.themes[theme]) {
                console.warn(`Unknown theme: ${theme}`);
                return false;
            }

            this.currentTheme = theme;

            // Оновити body class
            if (theme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }

            // Оновити meta theme-color
            this.updateMetaThemeColor(theme);

            // Оновити іконку
            this.updateThemeIcon(theme);

            // Зберегти
            if (save) {
                try {
                    if (window.appState && typeof appState.setTheme === 'function') {
                        appState.setTheme(theme);
                    } else {
                        localStorage.setItem('theme', theme);
                    }
                } catch (error) {
                    console.error('Error saving theme:', error);
                    localStorage.setItem('theme', theme);
                }
            }

            // Dispatch event
            try {
                window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
            } catch (error) {
                console.error('Error dispatching theme event:', error);
            }

            return true;
        } catch (error) {
            console.error('Error applying theme:', error);
            return false;
        }
    }

    // ========================================
    // ПЕРЕМКНУТИ ТЕМУ
    // ========================================

    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        return this.setTheme(newTheme);
    }

    setTheme(theme) {
        return this.applyTheme(theme, true);
    }

    // ========================================
    // UI UPDATES
    // ========================================

    updateThemeIcon(theme) {
        try {
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.textContent = this.themes[theme].icon;
            }

            // Оновити всі theme buttons
            document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
                try {
                    btn.textContent = this.themes[theme].icon;
                    btn.title = `Перемкнути на ${theme === 'dark' ? 'світлу' : 'темну'} тему`;
                } catch (error) {
                    console.error('Error updating theme button:', error);
                }
            });
        } catch (error) {
            console.error('Error updating theme icon:', error);
        }
    }

    updateMetaThemeColor(theme) {
        try {
            let metaTheme = document.querySelector('meta[name="theme-color"]');
            
            if (!metaTheme) {
                metaTheme = document.createElement('meta');
                metaTheme.name = 'theme-color';
                document.head.appendChild(metaTheme);
            }

            const colors = {
                dark: '#0d1117',
                light: '#ffffff'
            };

            metaTheme.content = colors[theme] || colors.dark;
        } catch (error) {
            console.error('Error updating meta theme color:', error);
        }
    }

    // ========================================
    // GETTERS
    // ========================================

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeName() {
        return this.themes[this.currentTheme]?.name || 'Темна';
    }

    getThemeIcon() {
        return this.themes[this.currentTheme]?.icon || '🌙';
    }

    isDark() {
        return this.currentTheme === 'dark';
    }

    isLight() {
        return this.currentTheme === 'light';
    }

    // ========================================
    // AUTO THEME (за системою)
    // ========================================

    enableAutoTheme() {
        if (!window.matchMedia) {
            console.warn('matchMedia not supported');
            return false;
        }

        try {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
            
            // Видалити з localStorage щоб auto theme працювала
            localStorage.removeItem('theme');
            
            return true;
        } catch (error) {
            console.error('Error enabling auto theme:', error);
            return false;
        }
    }

    disableAutoTheme() {
        try {
            // Просто зберегти поточну тему
            localStorage.setItem('theme', this.currentTheme);
            return true;
        } catch (error) {
            console.error('Error disabling auto theme:', error);
            return false;
        }
    }

    // ========================================
    // TRANSITION ANIMATION
    // ========================================

    setThemeWithTransition(theme) {
        try {
            // Додати transition class
            document.documentElement.classList.add('theme-transition');

            // Застосувати тему
            this.setTheme(theme);

            // Видалити transition після анімації
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 300);
        } catch (error) {
            console.error('Error setting theme with transition:', error);
            this.setTheme(theme);
        }
    }

    // ========================================
    // DEBUG
    // ========================================

    debug() {
        console.group('🎨 Theme Switcher Debug');
        console.log('Current theme:', this.currentTheme);
        console.log('Theme name:', this.getThemeName());
        console.log('Is dark:', this.isDark());
        console.log('Body classes:', Array.from(document.body.classList));
        console.log('Saved theme:', localStorage.getItem('theme'));
        
        if (window.appState && window.appState.ui) {
            console.log('AppState theme:', appState.ui.theme);
        }
        
        console.groupEnd();
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const themeSwitcher = new ThemeSwitcher();

// Експорт
window.themeSwitcher = themeSwitcher;

// Backward compatibility
window.toggleTheme = () => themeSwitcher.toggle();
window.setTheme = (theme) => themeSwitcher.setTheme(theme);

console.log('✅ Theme Switcher loaded');
