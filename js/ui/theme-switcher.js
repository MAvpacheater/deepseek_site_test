// 🎨 Theme Switcher - Управління темами

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
        this.init();
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
        // Спробувати завантажити з appState
        if (window.appState) {
            this.currentTheme = appState.ui.theme;
        } else {
            // Fallback до localStorage
            const saved = localStorage.getItem('theme');
            this.currentTheme = saved || 'dark';
        }

        this.applyTheme(this.currentTheme, false);
    }

    setupListeners() {
        // Підписатися на зміни в appState
        if (window.appState) {
            appState.on('theme:change', ({ theme }) => {
                this.applyTheme(theme, false);
            });
        }

        // Відстежувати системні налаштування
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // ========================================
    // ЗАСТОСУВАТИ ТЕМУ
    // ========================================

    applyTheme(theme, save = true) {
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
            if (window.appState) {
                appState.setTheme(theme);
            } else {
                localStorage.setItem('theme', theme);
            }
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));

        return true;
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
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = this.themes[theme].icon;
        }

        // Оновити всі theme buttons
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.textContent = this.themes[theme].icon;
            btn.title = `Перемкнути на ${theme === 'dark' ? 'світлу' : 'темну'} тему`;
        });
    }

    updateMetaThemeColor(theme) {
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
    }

    // ========================================
    // GETTERS
    // ========================================

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeName() {
        return this.themes[this.currentTheme].name;
    }

    getThemeIcon() {
        return this.themes[this.currentTheme].icon;
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

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
        
        // Видалити з localStorage щоб auto theme працювала
        localStorage.removeItem('theme');
        
        return true;
    }

    disableAutoTheme() {
        // Просто зберегти поточну тему
        localStorage.setItem('theme', this.currentTheme);
    }

    // ========================================
    // TRANSITION ANIMATION
    // ========================================

    setThemeWithTransition(theme) {
        // Додати transition class
        document.documentElement.classList.add('theme-transition');

        // Застосувати тему
        this.setTheme(theme);

        // Видалити transition після анімації
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
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

console.log('✅ Theme Switcher initialized');
