// 🔍 Library Filters - Розширена фільтрація та сортування бібліотеки (150 lines)

class LibraryFilters {
    constructor() {
        this.currentFilter = 'all';
        this.currentSort = 'date';
        this.searchQuery = '';
        this.tags = [];
        
        this.init();
    }

    // ========================================
    // ІНІЦІАЛІЗАЦІЯ
    // ========================================

    init() {
        this.setupEventListeners();
        console.log('✅ Library Filters initialized');
    }

    setupEventListeners() {
        // Пошук
        const searchInput = document.getElementById('librarySearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.setSearch(e.target.value);
                }, 300);
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('librarySort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSort(e.target.value);
            });
        }
    }

    // ========================================
    // ФІЛЬТРИ
    // ========================================

    setFilter(filterType) {
        this.currentFilter = filterType;
        this.updateFilterButtons();
        this.applyFilters();
    }

    setSort(sortType) {
        this.currentSort = sortType;
        this.applySorting();
    }

    setSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.applyFilters();
    }

    updateFilterButtons() {
        document.querySelectorAll('.library-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(
            `.filter-btn[onclick*="${this.currentFilter}"]`
        );
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    // ========================================
    // ЗАСТОСУВАННЯ ФІЛЬТРІВ
    // ========================================

    async applyFilters() {
        if (!window.libraryCore) return;

        const items = await this.getFilteredItems();
        this.renderItems(items);
    }

    async getFilteredItems() {
        if (!window.libraryCore) return [];

        const allItems = await libraryCore.getAllItems();
        let filtered = [...allItems];

        // Фільтр за типом
        filtered = this.filterByType(filtered);

        // Пошук
        filtered = this.filterBySearch(filtered);

        // Фільтр за тегами
        filtered = this.filterByTags(filtered);

        // Сортування
        filtered = this.sortItems(filtered);

        return filtered;
    }

    filterByType(items) {
        switch (this.currentFilter) {
            case 'gemini':
                return items.filter(item => item.mode === 'gemini');
            case 'deepseek':
                return items.filter(item => item.mode === 'deepseek');
            case 'code':
                return items.filter(item => item.type === 'code');
            case 'conversations':
                return items.filter(item => item.type === 'conversation');
            case 'favorites':
                return items.filter(item => item.favorite);
            case 'all':
            default:
                return items;
        }
    }

    filterBySearch(items) {
        if (!this.searchQuery) return items;

        return items.filter(item => {
            const searchText = (
                item.title + ' ' + 
                item.preview + ' ' + 
                (item.tags || []).join(' ')
            ).toLowerCase();
            
            return searchText.includes(this.searchQuery);
        });
    }

    filterByTags(items) {
        if (this.tags.length === 0) return items;

        return items.filter(item => {
            const itemTags = item.tags || [];
            return this.tags.some(tag => itemTags.includes(tag));
        });
    }

    // ========================================
    // СОРТУВАННЯ
    // ========================================

    sortItems(items) {
        const sorted = [...items];

        switch (this.currentSort) {
            case 'date':
                return sorted.sort((a, b) => {
                    const dateA = new Date(a.date || 0).getTime();
                    const dateB = new Date(b.date || 0).getTime();
                    return dateB - dateA;
                });

            case 'title':
                return sorted.sort((a, b) => 
                    (a.title || '').localeCompare(b.title || '')
                );

            case 'type':
                return sorted.sort((a, b) => {
                    const typeCompare = (a.type || '').localeCompare(b.type || '');
                    if (typeCompare === 0) {
                        const dateA = new Date(a.date || 0).getTime();
                        const dateB = new Date(b.date || 0).getTime();
                        return dateB - dateA;
                    }
                    return typeCompare;
                });

            case 'messages':
                return sorted.sort((a, b) => 
                    (b.messageCount || 0) - (a.messageCount || 0)
                );

            case 'files':
                return sorted.sort((a, b) => 
                    (b.fileCount || 0) - (a.fileCount || 0)
                );

            default:
                return sorted;
        }
    }

    applySorting() {
        this.applyFilters();
    }

    // ========================================
    // ТЕГИ
    // ========================================

    addTagFilter(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.applyFilters();
            this.updateTagsUI();
        }
    }

    removeTagFilter(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        this.applyFilters();
        this.updateTagsUI();
    }

    clearTagFilters() {
        this.tags = [];
        this.applyFilters();
        this.updateTagsUI();
    }

    updateTagsUI() {
        const container = document.getElementById('activeTagFilters');
        if (!container) return;

        if (this.tags.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = this.tags.map(tag => `
            <span class="active-tag-filter">
                #${tag}
                <button onclick="libraryFilters.removeTagFilter('${tag}')" class="remove-tag-btn">✕</button>
            </span>
        `).join('');
    }

    // ========================================
    // РЕНДЕРИНГ
    // ========================================

    renderItems(items) {
        if (window.libraryUI) {
            libraryUI.render(items);
        } else if (window.libraryCore) {
            libraryCore.displayItems(items);
        }
    }

    // ========================================
    // RESET
    // ========================================

    reset() {
        this.currentFilter = 'all';
        this.currentSort = 'date';
        this.searchQuery = '';
        this.tags = [];

        // Очистити UI
        const searchInput = document.getElementById('librarySearch');
        if (searchInput) searchInput.value = '';

        const sortSelect = document.getElementById('librarySort');
        if (sortSelect) sortSelect.value = 'date';

        this.updateFilterButtons();
        this.updateTagsUI();
        this.applyFilters();
    }

    // ========================================
    // СТАТИСТИКА
    // ========================================

    getStats() {
        return {
            currentFilter: this.currentFilter,
            currentSort: this.currentSort,
            searchQuery: this.searchQuery,
            activeTags: this.tags.length
        };
    }
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ
// ========================================

const libraryFilters = new LibraryFilters();

// Експорт
window.libraryFilters = libraryFilters;
window.LibraryFilters = LibraryFilters;

// Compatibility function
window.filterByType = (type) => libraryFilters.setFilter(type);

console.log('✅ Library Filters loaded');
