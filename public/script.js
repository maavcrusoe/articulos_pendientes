const UI_ICON_SVGS = Object.freeze({
    dashboard: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 3h6v6H3z"></path><path d="M11 3h6v4h-6z"></path><path d="M11 9h6v8h-6z"></path><path d="M3 11h6v6H3z"></path></svg>',
    home: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 9.5 10 4l7 5.5"></path><path d="M5.5 8.5V16h9V8.5"></path></svg>',
    users: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M13.5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M3.5 16c.5-2.3 2.4-3.5 4.5-3.5s4 1.2 4.5 3.5"></path><path d="M12 15.5c.3-1.5 1.5-2.4 3-2.4 1 0 1.9.4 2.5 1.2"></path></svg>',
    tasks: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 4h11"></path><path d="M6 10h11"></path><path d="M6 16h11"></path><path d="M3 4h.01"></path><path d="M3 10h.01"></path><path d="M3 16h.01"></path></svg>',
    settings: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"></path><path d="M16.2 11.2a1 1 0 0 0 .2-1.1l-.8-1.8a1 1 0 0 0-.9-.6l-1.1-.1a4.9 4.9 0 0 0-.7-.7l-.1-1.1a1 1 0 0 0-.6-.9l-1.8-.8a1 1 0 0 0-1.1.2l-.8.7a4.7 4.7 0 0 0-1 0l-.8-.7a1 1 0 0 0-1.1-.2l-1.8.8a1 1 0 0 0-.6.9l-.1 1.1c-.3.2-.5.4-.7.7l-1.1.1a1 1 0 0 0-.9.6l-.8 1.8a1 1 0 0 0 .2 1.1l.7.8a4.7 4.7 0 0 0 0 1l-.7.8a1 1 0 0 0-.2 1.1l.8 1.8a1 1 0 0 0 .9.6l1.1.1c.2.3.4.5.7.7l.1 1.1a1 1 0 0 0 .6.9l1.8.8a1 1 0 0 0 1.1-.2l.8-.7a4.7 4.7 0 0 0 1 0l.8.7a1 1 0 0 0 1.1.2l1.8-.8a1 1 0 0 0 .6-.9l.1-1.1c.3-.2.5-.4.7-.7l1.1-.1a1 1 0 0 0 .9-.6l.8-1.8a1 1 0 0 0-.2-1.1l-.7-.8a4.7 4.7 0 0 0 0-1l.7-.8Z"></path></svg>',
    pending: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 4v6l4 2"></path><circle cx="10" cy="10" r="7"></circle></svg>',
    viewed: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M2.5 10s3-4.5 7.5-4.5S17.5 10 17.5 10 14.5 14.5 10 14.5 2.5 10 2.5 10Z"></path><circle cx="10" cy="10" r="2.2"></circle></svg>',
    app: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 5.5h12"></path><path d="M4 10h12"></path><path d="M4 14.5h8"></path></svg>',
    logout: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8"></path><path d="M11 6.5 14.5 10 11 13.5"></path><path d="M7 10h7.5"></path></svg>',
    search: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="8.5" cy="8.5" r="4.5"></circle><path d="m12 12 4.5 4.5"></path></svg>',
    clear: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 14.5 14.5 4"></path><path d="M8 4h8v8"></path><path d="M3.5 16.5h13"></path></svg>',
    refresh: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M16 6v4h-4"></path><path d="M4 14v-4h4"></path><path d="M15 10a5 5 0 0 0-8.5-3.5L4 10"></path><path d="M5 10a5 5 0 0 0 8.5 3.5L16 10"></path></svg>',
    migrate: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 5.5h7"></path><path d="M3 10h10"></path><path d="M3 14.5h7"></path><path d="M12 6.5 16 10l-4 3.5"></path></svg>',
    open: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M11 4h5v5"></path><path d="M9 11 16 4"></path><path d="M16 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4"></path></svg>',
    notion: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 4.5 14.5 4l1.5 1.5v10L6 16 4 14.5v-9Z"></path><path d="M7 7v6"></path><path d="M7 7c2.8 0 4.2 3.2 6 6"></path><path d="M13 7v6"></path></svg>',
    tags: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 4H5a1 1 0 0 0-1 1v5l6.5 6.5a1.5 1.5 0 0 0 2.1 0l3.9-3.9a1.5 1.5 0 0 0 0-2.1Z"></path><circle cx="7" cy="7" r="1"></circle></svg>',
    save: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 4h9l3 3v9H4z"></path><path d="M7 4v5h6V4"></path><path d="M7 14h6"></path></svg>',
    create: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 4v12"></path><path d="M4 10h12"></path></svg>',
    delete: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 6h11"></path><path d="M7 6V4.5h6V6"></path><path d="M6.5 6l.7 9h5.6l.7-9"></path></svg>',
    run: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m7 5 8 5-8 5Z"></path></svg>',
    login: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8"></path><path d="M11 6.5 14.5 10 11 13.5"></path><path d="M7 10h7.5"></path></svg>',
    register: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="8" cy="7" r="2.5"></circle><path d="M3.5 16c.5-2.3 2.4-3.5 4.5-3.5s4 1.2 4.5 3.5"></path><path d="M15 7v4"></path><path d="M13 9h4"></path></svg>',
    article: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 4.5h10v11H5z"></path><path d="M7.5 7.5h5"></path><path d="M7.5 10h5"></path><path d="M7.5 12.5h3"></path></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 5.5 3.5 10 8 14.5"></path><path d="M4 10h12"></path></svg>',
    previous: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12.5 5.5 8 10l4.5 4.5"></path></svg>',
    next: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.5 5.5 12 10l-4.5 4.5"></path></svg>',
    close: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5 15 15"></path><path d="M15 5 5 15"></path></svg>'
});

function normalizeUiLabel(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveUiIconName(element) {
    const explicitIcon = element.dataset.icon;
    if (explicitIcon && UI_ICON_SVGS[explicitIcon]) {
        return explicitIcon;
    }

    const text = normalizeUiLabel(element.textContent);
    const href = normalizeUiLabel(element.getAttribute('href'));
    const ariaLabel = normalizeUiLabel(element.getAttribute('aria-label'));
    const classes = normalizeUiLabel(element.className);
    const signal = `${text} ${href} ${ariaLabel} ${classes}`;

    if (signal.includes('admin-navbar-logo') || signal.includes('panel privado')) return 'dashboard';
    if (signal.includes('cerrar sesion') || signal.includes('/admin/logout')) return 'logout';
    if (signal.includes('inicio app')) return 'app';
    if (signal.includes('/admin/users') || signal.includes('usuarios')) return 'users';
    if (signal.includes('/admin/tasks') || signal.includes('tareas')) return 'tasks';
    if (signal.includes('/admin/config') || signal.includes('configuracion')) return 'settings';
    if (signal.includes('/notion-pending') || signal.includes('pendientes')) return 'pending';
    if (signal.includes('/links-vistos') || signal.includes('visto')) return 'viewed';
    if (signal.includes('buscar')) return 'search';
    if (signal.includes('limpiar')) return 'clear';
    if (signal.includes('refrescar')) return 'refresh';
    if (signal.includes('migrar')) return 'migrate';
    if (signal.includes('abrir notion')) return 'notion';
    if (signal.includes('abrir url') || signal.includes('original') || signal.includes('visitar')) return 'open';
    if (signal.includes('anadir etiqueta') || signal.includes('etiquetas')) return 'tags';
    if (signal.includes('guardar')) return 'save';
    if (signal.includes('crear')) return 'create';
    if (signal.includes('eliminar') || signal.includes('borrar')) return 'delete';
    if (signal.includes('ejecutar')) return 'run';
    if (signal.includes('entrar') || signal.includes('/admin/login')) return 'login';
    if (signal.includes('registr')) return 'register';
    if (signal.includes('leer mas') || signal.includes('leer más')) return 'article';
    if (signal.includes('anterior')) return 'previous';
    if (signal.includes('siguiente')) return 'next';
    if (signal.includes('volver')) return 'back';
    if (signal.includes('cerrar')) return 'close';
    if (signal.includes('inicio') || href === '/admin' || href === '/') return 'home';

    return '';
}

function initInterfaceIcons() {
    const controls = document.querySelectorAll([
        '.admin-link-btn',
        '.auth-btn',
        '.auth-links a',
        '.admin-btn',
        '.table-link-btn',
        '.admin-navbar-logo',
        '.admin-navbar-link',
        '.admin-navbar-logout',
        '.back-home',
        '.back-btn',
        '.original-link',
        '.visit-original',
        '.read-more-btn',
        '.clear-all-filters',
        '.clear-filter',
        '.pagination-btn'
    ].join(','));

    controls.forEach((element) => {
        if (element.querySelector('.ui-icon')) {
            return;
        }

        if (/[\u2190-\u2BFF\u{1F300}-\u{1FAFF}]/u.test(element.textContent || '')) {
            return;
        }

        const iconName = resolveUiIconName(element);
        const svg = UI_ICON_SVGS[iconName];

        if (!svg) {
            return;
        }

        element.classList.add('has-ui-icon');
        element.insertAdjacentHTML('afterbegin', `<span class="ui-icon" aria-hidden="true">${svg}</span>`);
    });
}

// Funcionalidades de la página de artículos
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const articlesContainer = document.querySelector('.articles-container');
    const searchForm = document.querySelector('.search-form');
    const adminPage = document.querySelector('[data-admin-page]');

    initInterfaceIcons();

    initColumnPickers();

    if (adminPage?.dataset.adminPage === 'notion-pending') {
        initNotionPendingPage();
    }

    if (adminPage?.dataset.adminPage === 'links-vistos') {
        initNotionTablePage();
    }

    // Mostrar tooltip informativo si hay filtros activos
    if (searchInput) {
        const hasActiveFilters = document.querySelector('.active-filters-inline');
        if (hasActiveFilters) {
            searchInput.setAttribute('title', 'Los filtros de categoría se mantendrán al buscar');
        }
    }

    initTagFilter();

    // Efectos visuales con animación escalonada
    const articles = document.querySelectorAll('.article-card');
    articles.forEach((article, index) => {
        article.style.animationDelay = `${index * 0.05}s`;
    });

    // Funcionalidad para "Leer más" y click en la tarjeta
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const articleId = this.getAttribute('data-id');
            if (articleId) {
                // Incrementar contador de vistas antes de navegar
                fetch(`/api/articulo/${articleId}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).then(() => {
                    window.location.href = '/articulo/' + articleId;
                }).catch(err => {
                    console.error('Error incrementando vistas:', err);
                    // Navegar de todos modos
                    window.location.href = '/articulo/' + articleId;
                });
            }
        });
    });

    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Evitar navegación si se hace clic en enlaces o botones
            if (!e.target.closest('a') && !e.target.closest('button')) {
                const articleId = this.getAttribute('data-id');
                if (articleId) {
                    // Incrementar vistas también en el click de la tarjeta
                    fetch(`/api/articulo/${articleId}/view`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    }).then(() => {
                        window.location.href = '/articulo/' + articleId;
                    }).catch(err => {
                        console.error('Error incrementando vistas:', err);
                        window.location.href = '/articulo/' + articleId;
                    });
                }
            }
        });
        
        // Efecto hover mejorado
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Atajos de teclado para paginación
    document.addEventListener('keydown', function(e) {
        // Solo si no estamos escribiendo en un input
        if (e.ctrlKey && !e.target.matches('input, textarea, select')) {
            const currentPage = parseInt(document.body.dataset.currentPage || '1', 10);
            const hasPrev = document.body.dataset.hasPrev === 'true';
            const hasNext = document.body.dataset.hasNext === 'true';

            if (e.key === 'ArrowLeft' && hasPrev) {
                e.preventDefault();
                if (typeof window.jumpToPage === 'function') {
                    window.jumpToPage(currentPage - 1);
                }
            } else if (e.key === 'ArrowRight' && hasNext) {
                e.preventDefault();
                if (typeof window.jumpToPage === 'function') {
                    window.jumpToPage(currentPage + 1);
                }
            }
        }
        
        // Atajo para enfocar la búsqueda (Ctrl+K o Cmd+K)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });
    
    // Resaltar términos de búsqueda en los resultados
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    
    if (searchTerm && searchTerm.trim()) {
        highlightSearchTerms(searchTerm.trim());
    }
});

// Función para resaltar términos de búsqueda
function highlightSearchTerms(searchTerm) {
    const words = searchTerm.split(/\s+/).filter(w => w.length > 0);
    const articles = document.querySelectorAll('.article-card');
    
    articles.forEach(article => {
        const title = article.querySelector('.article-title');
        const content = article.querySelector('.article-content-preview p');
        
        if (title) highlightInElement(title, words);
        if (content) highlightInElement(content, words);
    });
}

function highlightInElement(element, words) {
    let html = element.innerHTML;
    
    words.forEach(word => {
        const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
        html = html.replace(regex, '<mark>$1</mark>');
    });
    
    element.innerHTML = html;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initColumnPickers() {
    document.querySelectorAll('.column-picker').forEach((picker) => {
        const tableId = picker.dataset.tableId;
        const storageKey = picker.dataset.storageKey || `columns:${tableId}`;
        const trigger = picker.querySelector('.column-picker-trigger');
        const menu = picker.querySelector('.column-picker-menu');
        const table = document.getElementById(tableId);

        if (!table || !trigger || !menu) {
            return;
        }

        const headers = Array.from(table.querySelectorAll('thead th[data-column-key]'));
        const persistedHiddenColumns = new Set(
            JSON.parse(localStorage.getItem(storageKey) || '[]')
        );

        const getColumnCells = (key) => Array.from(table.querySelectorAll(`[data-column-key="${key}"]`));

        const applyVisibility = () => {
            headers.forEach((header) => {
                const key = header.dataset.columnKey;
                const locked = header.dataset.columnLocked === 'true';
                const hidden = !locked && persistedHiddenColumns.has(key);
                getColumnCells(key).forEach((cell) => {
                    cell.classList.toggle('is-column-hidden', hidden);
                });
            });

            localStorage.setItem(storageKey, JSON.stringify(Array.from(persistedHiddenColumns)));
        };

        const buildMenu = () => {
            menu.innerHTML = '';
            headers.forEach((header) => {
                const key = header.dataset.columnKey;
                const label = header.dataset.columnLabel || header.textContent.trim();
                const locked = header.dataset.columnLocked === 'true';
                const item = document.createElement('label');
                item.className = `column-picker-option${locked ? ' is-locked' : ''}`;

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = !persistedHiddenColumns.has(key);
                input.disabled = locked;
                input.addEventListener('change', () => {
                    if (input.checked) {
                        persistedHiddenColumns.delete(key);
                    } else {
                        persistedHiddenColumns.add(key);
                    }
                    applyVisibility();
                });

                const text = document.createElement('span');
                text.textContent = label;

                item.appendChild(input);
                item.appendChild(text);
                menu.appendChild(item);
            });
        };

        const closeMenu = () => {
            picker.classList.remove('is-open');
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        };

        const openMenu = () => {
            picker.classList.add('is-open');
            menu.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
        };

        buildMenu();
        applyVisibility();

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            if (picker.classList.contains('is-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (!picker.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    });
}

function initTagFilter() {
    const tagsInput = document.getElementById('selectedTagsInput');
    const chipsContainer = document.getElementById('selectedTagsChips');
    const searchInput = document.querySelector('.search-input');
    const suggestBox = document.getElementById('tagSuggest');
    if (!tagsInput || !chipsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    let selectedTags = (urlParams.get('tag') || '')
        .split(',').map(function(t) { return t.trim(); }).filter(Boolean);

    // All available tag names collected from sidebar bubbles
    const allTagNames = Array.from(
        document.querySelectorAll('.tag-bubble[data-tag-name]')
    ).map(function(el) { return el.dataset.tagName; });

    let highlightedIndex = -1;
    let currentSuggestions = [];

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // --- Chips ---
    function renderChips() {
        chipsContainer.innerHTML = '';
        selectedTags.forEach(function(tag) {
            var chip = document.createElement('span');
            chip.className = 'tag-chip-selected';
            chip.innerHTML =
                '<span class="tag-chip-label">' + escapeHtml(tag) + '</span>' +
                '<button type="button" class="tag-chip-remove" aria-label="Quitar ' + escapeHtml(tag) + '">\u00d7</button>';
            chip.querySelector('.tag-chip-remove').addEventListener('click', function() {
                removeTag(tag);
            });
            chipsContainer.appendChild(chip);
        });
        chipsContainer.classList.toggle('has-chips', selectedTags.length > 0);
    }

    function updateBubbles() {
        document.querySelectorAll('.tag-bubble[data-tag-name]').forEach(function(bubble) {
            bubble.classList.toggle('active', selectedTags.includes(bubble.dataset.tagName));
        });
    }

    function syncState() {
        tagsInput.value = selectedTags.join(',');
        renderChips();
        updateBubbles();
    }

    function addTag(tag) {
        if (!selectedTags.includes(tag)) {
            selectedTags.push(tag);
            syncState();
        }
    }

    function removeTag(tag) {
        selectedTags = selectedTags.filter(function(t) { return t !== tag; });
        syncState();
    }

    function toggleTag(tag) {
        if (selectedTags.includes(tag)) { removeTag(tag); } else { addTag(tag); }
    }

    // --- Autocomplete ---
    function getSuggestions(query) {
        if (!query || query.length < 1) return [];
        var q = query.toLowerCase();
        return allTagNames
            .filter(function(name) {
                return name.toLowerCase().includes(q) && !selectedTags.includes(name);
            })
            .slice(0, 8);
    }

    function highlightMatch(text, query) {
        var idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.slice(0, idx)) +
            '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' +
            escapeHtml(text.slice(idx + query.length));
    }

    function renderSuggestions(suggestions, query) {
        if (!suggestBox) return;
        currentSuggestions = suggestions;
        highlightedIndex = -1;
        if (suggestions.length === 0) {
            suggestBox.hidden = true;
            suggestBox.innerHTML = '';
            return;
        }
        suggestBox.innerHTML = '';
        suggestions.forEach(function(tag) {
            var item = document.createElement('div');
            item.className = 'tag-suggest-item';
            item.setAttribute('role', 'option');
            item.dataset.tagName = tag;
            item.innerHTML =
                '<span class="tag-suggest-icon">\ud83c\udff7\ufe0f</span>' +
                '<span class="tag-suggest-text">' + highlightMatch(tag, query) + '</span>' +
                '<kbd class="tag-suggest-hint">Enter</kbd>';
            item.addEventListener('mousedown', function(e) {
                e.preventDefault(); // prevent blur before click fires
                addTag(tag);
                if (searchInput) { searchInput.value = ''; searchInput.focus(); }
                closeSuggestions();
            });
            suggestBox.appendChild(item);
        });
        suggestBox.hidden = false;
    }

    function closeSuggestions() {
        if (suggestBox) { suggestBox.hidden = true; suggestBox.innerHTML = ''; }
        currentSuggestions = [];
        highlightedIndex = -1;
    }

    function setHighlight(index) {
        var items = suggestBox ? Array.from(suggestBox.querySelectorAll('.tag-suggest-item')) : [];
        items.forEach(function(el, i) { el.classList.toggle('highlighted', i === index); });
        highlightedIndex = index;
    }

    // --- Search input events ---
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderSuggestions(getSuggestions(this.value), this.value);
        });

        searchInput.addEventListener('keydown', function(e) {
            var items = suggestBox ? Array.from(suggestBox.querySelectorAll('.tag-suggest-item')) : [];
            var suggestOpen = suggestBox && !suggestBox.hidden && items.length > 0;

            if (e.key === 'ArrowDown') {
                if (!suggestOpen) return;
                e.preventDefault();
                setHighlight((highlightedIndex + 1) % items.length);
            } else if (e.key === 'ArrowUp') {
                if (!suggestOpen) return;
                e.preventDefault();
                setHighlight(highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestOpen && highlightedIndex >= 0 && currentSuggestions[highlightedIndex]) {
                    addTag(currentSuggestions[highlightedIndex]);
                    this.value = '';
                    closeSuggestions();
                } else {
                    closeSuggestions();
                    this.form.submit();
                }
            } else if (e.key === 'Tab' && suggestOpen && currentSuggestions.length === 1) {
                e.preventDefault();
                addTag(currentSuggestions[0]);
                this.value = '';
                closeSuggestions();
            } else if (e.key === 'Escape') {
                closeSuggestions();
            } else if (e.key === 'Backspace' && this.value === '' && selectedTags.length > 0) {
                removeTag(selectedTags[selectedTags.length - 1]);
            }
        });

        searchInput.addEventListener('blur', function() {
            setTimeout(closeSuggestions, 150);
        });
    }

    // Init from URL
    syncState();

    // Sidebar tag bubble clicks
    document.querySelectorAll('.tag-bubble[data-tag-name]').forEach(function(bubble) {
        bubble.addEventListener('click', function(e) {
            e.preventDefault();
            toggleTag(this.dataset.tagName);
        });
    });
}

function initNotionPendingPage() {
    const pageRoot = document.querySelector('[data-admin-page="notion-pending"]');
    const overlay = document.getElementById('loadingOverlay');
    const refreshButton = document.getElementById('refreshNotionButton');
    const modal = document.getElementById('notionTagModal');
    const closeButton = document.getElementById('closeNotionModal');
    const cancelButton = document.getElementById('cancelNotionModal');
    const confirmButton = document.getElementById('confirmMarkViewedButton');
    const titleNode = document.getElementById('modalTitle');
    const customTagsInput = document.getElementById('notionTagsInput');
    const selectedTagsNode = document.getElementById('selectedTags');
    const tagSuggestionList = document.getElementById('tagSuggestionList');
    const availableTags = (() => {
        try {
            const raw = decodeURIComponent(pageRoot?.dataset.availableTags || '%5B%5D');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    })();

    if (!modal || !confirmButton) {
        return;
    }

    const state = {
        pageId: '',
        title: '',
        selectedTags: []
    };

    const normalizeTag = (value) => String(value || '').trim().toLowerCase();

    const isSystemTag = (value) => {
        const normalized = normalizeTag(value);
        return normalized === 'visto'
            || normalized === 'seen'
            || normalized === 'read'
            || normalized === 'done'
            || normalized === 'completed'
            || normalized === 'pendiente'
            || normalized === 'por hacer'
            || normalized === 'to do'
            || normalized === 'not started';
    };

    const uniqueTags = (tags) => Array.from(new Map(
        tags
            .map((tag) => String(tag || '').trim())
            .filter(Boolean)
            .map((tag) => [normalizeTag(tag), tag])
    ).values());

    const renderSelectedTags = () => {
        selectedTagsNode.innerHTML = '';

        if (!state.selectedTags.length) {
            selectedTagsNode.innerHTML = '<span class="muted-text">Todavía no has seleccionado etiquetas extra.</span>';
            return;
        }

        state.selectedTags.forEach((tag) => {
            const pill = document.createElement('span');
            pill.className = 'selected-tag-pill';
            pill.textContent = tag;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'selected-tag-remove';
            removeButton.textContent = '×';
            removeButton.setAttribute('aria-label', `Quitar ${tag}`);
            removeButton.addEventListener('click', () => {
                state.selectedTags = state.selectedTags.filter((entry) => normalizeTag(entry) !== normalizeTag(tag));
                renderSelectedTags();
                filterSuggestions();
            });

            pill.appendChild(removeButton);
            selectedTagsNode.appendChild(pill);
        });
    };

    const filterSuggestions = () => {
        const searchValue = normalizeTag(customTagsInput?.value);
        tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
            const tagValue = button.dataset.tagValue || '';
            const normalized = normalizeTag(tagValue);
            const alreadySelected = state.selectedTags.some((tag) => normalizeTag(tag) === normalized);
            const matches = !searchValue || normalized.includes(searchValue);
            button.classList.toggle('is-hidden', !matches || alreadySelected || isSystemTag(tagValue));
        });
    };

    const addTags = (tags) => {
        const filteredTags = tags.filter((tag) => {
            const normalized = normalizeTag(tag);
            return normalized && !isSystemTag(tag)
                && !state.selectedTags.some((entry) => normalizeTag(entry) === normalized);
        });

        state.selectedTags = uniqueTags([...state.selectedTags, ...filteredTags]);
        renderSelectedTags();
        filterSuggestions();
    };

    const collectCustomTags = () => {
        const tags = String(customTagsInput.value || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        customTagsInput.value = '';
        return tags;
    };

    const openModal = (button) => {
        state.pageId = button.dataset.pageId;
        state.title = button.dataset.pageTitle || 'Sin título';
        state.sourceUrl = button.dataset.sourceUrl || '';
        state.notionUrl = button.dataset.notionUrl || '';
        state.selectedTags = uniqueTags(
            String(button.dataset.currentTags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag && !isSystemTag(tag))
        );
        titleNode.textContent = `Marcar como visto: ${state.title}`;
        customTagsInput.value = '';
        renderSelectedTags();
        filterSuggestions();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        customTagsInput.focus();
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        state.pageId = '';
        state.title = '';
        state.sourceUrl = '';
        state.notionUrl = '';
        state.selectedTags = [];
    };

    document.querySelectorAll('.mark-viewed-btn').forEach((button) => {
        button.addEventListener('click', () => openModal(button));
    });

    document.querySelectorAll('#notionTable .table-link-btn').forEach((link) => {
        link.addEventListener('click', () => {
            document.querySelectorAll('#notionTable .table-link-btn.is-last-opened').forEach((entry) => {
                entry.classList.remove('is-last-opened');
            });
            document.querySelectorAll('#notionTable tr.is-link-opened').forEach((row) => {
                row.classList.remove('is-link-opened');
            });

            link.classList.add('is-last-opened');
            link.closest('tr')?.classList.add('is-link-opened');
        });
    });

    tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
        button.addEventListener('click', () => {
            addTags([button.dataset.tagValue]);
            customTagsInput.value = '';
            filterSuggestions();
        });
    });

    customTagsInput?.addEventListener('input', filterSuggestions);

    customTagsInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addTags(collectCustomTags());
        }
    });

    refreshButton?.addEventListener('click', async () => {
        overlay?.classList.add('active');
        try {
            const response = await fetch('/notion-pending/api/items');
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo refrescar la lista.');
            }
            window.location.reload();
        } catch (error) {
            alert(error.message || 'Error de conexión');
            overlay?.classList.remove('active');
        }
    });

    const migrateButton = document.getElementById('migrateVistosButton');
    migrateButton?.addEventListener('click', async () => {
        if (!confirm('¿Migrar todos los items marcados como vistos en Notion hacia MongoDB?\nLos que ya existan serán omitidos.')) return;
        overlay?.classList.add('active');
        try {
            const response = await fetch('/notion-pending/migrate-vistos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error en la migración');
            alert(`Migración completada: ${data.inserted} nuevos, ${data.skipped} ya existían.`);
            window.location.reload();
        } catch (error) {
            alert(error.message || 'Error de conexión');
            overlay?.classList.remove('active');
        }
    });

    confirmButton.addEventListener('click', async () => {
        const customTags = collectCustomTags();
        if (customTags.length) {
            addTags(customTags);
        }

        if (!state.pageId) {
            return;
        }

        overlay?.classList.add('active');
        confirmButton.disabled = true;

        try {
            const response = await fetch(`/notion-pending/${state.pageId}/mark-viewed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tags: state.selectedTags,
                    title: state.title,
                    sourceUrl: state.sourceUrl,
                    notionUrl: state.notionUrl,
                })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo marcar el item como visto.');
            }

            window.location.reload();
        } catch (error) {
            alert(error.message || 'Error de conexión');
            overlay?.classList.remove('active');
            confirmButton.disabled = false;
        }
    });

    closeButton?.addEventListener('click', closeModal);
    cancelButton?.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    renderSelectedTags();
    filterSuggestions();
}

function initNotionTablePage() {
    const pageRoot = document.querySelector('[data-admin-page="links-vistos"]');
    const overlay = document.getElementById('loadingOverlay');
    const modal = document.getElementById('notionTagModal');
    const closeButton = document.getElementById('closeNotionModal');
    const cancelButton = document.getElementById('cancelNotionModal');
    const confirmButton = document.getElementById('confirmAddTagsButton');
    const titleNode = document.getElementById('modalTitle');
    const existingTagsNode = document.getElementById('existingTagsPreview');
    const customTagsInput = document.getElementById('notionTagsInput');
    const tagSearchInput = document.getElementById('notionTagSearch');
    const addSuggestedTagButton = document.getElementById('addSuggestedTagButton');
    const selectedTagsNode = document.getElementById('selectedTags');
    const tagSuggestionList = document.getElementById('tagSuggestionList');
    const availableTags = (() => {
        try {
            const raw = decodeURIComponent(pageRoot?.dataset.availableTags || '%5B%5D');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    })();

    if (!modal || !confirmButton) {
        return;
    }

    const state = {
        pageId: '',
        title: '',
        currentTags: [],
        selectedTags: []
    };

    const normalizeTag = (value) => String(value || '').trim().toLowerCase();

    const isSystemTag = (value) => {
        const normalized = normalizeTag(value);
        return normalized === 'visto'
            || normalized === 'seen'
            || normalized === 'read'
            || normalized === 'done'
            || normalized === 'completed'
            || normalized === 'pendiente'
            || normalized === 'por hacer'
            || normalized === 'to do'
            || normalized === 'not started';
    };

    const uniqueTags = (tags) => Array.from(new Map(
        tags
            .map((tag) => String(tag || '').trim())
            .filter(Boolean)
            .map((tag) => [normalizeTag(tag), tag])
    ).values());

    const renderExistingTags = () => {
        existingTagsNode.innerHTML = '';

        if (!state.currentTags.length) {
            existingTagsNode.innerHTML = '<span class="muted-text">Este elemento no tiene etiquetas extra todavía.</span>';
            return;
        }

        state.currentTags.forEach((tag) => {
            const pill = document.createElement('span');
            pill.className = 'selected-tag-pill';
            pill.textContent = tag;
            existingTagsNode.appendChild(pill);
        });
    };

    const renderSelectedTags = () => {
        selectedTagsNode.innerHTML = '';

        if (!state.selectedTags.length) {
            selectedTagsNode.innerHTML = '<span class="muted-text">Todavía no has preparado etiquetas nuevas.</span>';
            return;
        }

        state.selectedTags.forEach((tag) => {
            const pill = document.createElement('span');
            pill.className = 'selected-tag-pill';
            pill.textContent = tag;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'selected-tag-remove';
            removeButton.textContent = '×';
            removeButton.setAttribute('aria-label', `Quitar ${tag}`);
            removeButton.addEventListener('click', () => {
                state.selectedTags = state.selectedTags.filter((entry) => normalizeTag(entry) !== normalizeTag(tag));
                renderSelectedTags();
                filterSuggestions();
            });

            pill.appendChild(removeButton);
            selectedTagsNode.appendChild(pill);
        });
    };

    const filterSuggestions = () => {
        const searchValue = normalizeTag(tagSearchInput.value);
        tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
            const tagValue = button.dataset.tagValue || '';
            const normalized = normalizeTag(tagValue);
            const alreadyPresent = state.currentTags.some((tag) => normalizeTag(tag) === normalized)
                || state.selectedTags.some((tag) => normalizeTag(tag) === normalized)
                || isSystemTag(tagValue);
            const matches = !searchValue || normalized.includes(searchValue);
            button.classList.toggle('is-hidden', !matches || alreadyPresent);
        });
    };

    const addTags = (tags) => {
        const filteredTags = tags.filter((tag) => {
            const normalized = normalizeTag(tag);
            return normalized
                && !isSystemTag(tag)
                && !state.currentTags.some((entry) => normalizeTag(entry) === normalized)
                && !state.selectedTags.some((entry) => normalizeTag(entry) === normalized);
        });

        state.selectedTags = uniqueTags([...state.selectedTags, ...filteredTags]);
        renderSelectedTags();
        filterSuggestions();
    };

    const collectCustomTags = () => {
        const tags = String(customTagsInput.value || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .filter((tag) => !isSystemTag(tag));

        customTagsInput.value = '';
        return tags;
    };

    const openModal = (button) => {
        state.pageId = button.dataset.pageId;
        state.title = button.dataset.pageTitle || 'Sin título';
        state.currentTags = uniqueTags(
            String(button.dataset.currentTags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag && !isSystemTag(tag))
        );
        state.selectedTags = [];

        titleNode.textContent = `Añadir etiquetas: ${state.title}`;
        customTagsInput.value = '';
        tagSearchInput.value = '';
        renderExistingTags();
        renderSelectedTags();
        filterSuggestions();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        customTagsInput.focus();
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        state.pageId = '';
        state.title = '';
        state.currentTags = [];
        state.selectedTags = [];
    };

    document.querySelectorAll('.add-tags-btn').forEach((button) => {
        button.addEventListener('click', () => openModal(button));
    });

    document.querySelectorAll('.delete-link-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const pageId = button.dataset.pageId;
            const pageTitle = button.dataset.pageTitle || 'este link';
            if (!confirm(`¿Eliminar "${pageTitle}" de la base de datos? Esta acción no se puede deshacer.`)) return;
            button.disabled = true;
            try {
                const response = await fetch(`/links-vistos/${pageId}`, { method: 'DELETE' });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'Error al eliminar.');
                const row = button.closest('tr');
                if (row) row.remove();
            } catch (error) {
                alert(error.message || 'Error de conexión');
                button.disabled = false;
            }
        });
    });

    tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
        button.addEventListener('click', () => addTags([button.dataset.tagValue]));
    });

    addSuggestedTagButton?.addEventListener('click', () => {
        const tag = String(tagSearchInput.value || '').trim();
        if (!tag || isSystemTag(tag)) {
            return;
        }

        addTags([tag]);
        tagSearchInput.value = '';
        filterSuggestions();
    });

    tagSearchInput?.addEventListener('input', filterSuggestions);

    tagSearchInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addSuggestedTagButton?.click();
        }
    });

    customTagsInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addTags(collectCustomTags());
        }
    });

    confirmButton.addEventListener('click', async () => {
        const customTags = collectCustomTags();
        if (customTags.length) {
            addTags(customTags);
        }

        if (!state.pageId || !state.selectedTags.length) {
            if (!state.selectedTags.length) {
                alert('Añade al menos una etiqueta antes de guardar.');
            }
            return;
        }

        overlay?.classList.add('active');
        confirmButton.disabled = true;

        try {
            const response = await fetch(`/links-vistos/${state.pageId}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags: state.selectedTags })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudieron actualizar las etiquetas.');
            }

            window.location.reload();
        } catch (error) {
            alert(error.message || 'Error de conexión');
            overlay?.classList.remove('active');
            confirmButton.disabled = false;
        }
    });

    closeButton?.addEventListener('click', closeModal);
    cancelButton?.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    renderExistingTags();
    renderSelectedTags();
    filterSuggestions();
}