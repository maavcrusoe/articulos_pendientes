// Funcionalidades de la página de artículos
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const articlesContainer = document.querySelector('.articles-container');
    const searchForm = document.querySelector('.search-form');
    const adminPage = document.querySelector('[data-admin-page]');

    initColumnPickers();

    if (adminPage?.dataset.adminPage === 'notion-pending') {
        initNotionPendingPage();
    }

    if (adminPage?.dataset.adminPage === 'notion-table') {
        initNotionTablePage();
    }

    // Mostrar tooltip informativo si hay filtros activos
    if (searchInput) {
        const hasActiveFilters = document.querySelector('.active-filters-inline');
        
        if (hasActiveFilters) {
            searchInput.setAttribute('title', 'Los filtros de etiqueta/categoría se mantendrán al buscar');
        }
        
        // Debounce mejorado para búsqueda en tiempo real
        let searchTimeout;
        
        // Mostrar indicador de búsqueda
        const showSearching = () => {
            searchInput.classList.add('searching');
        };
        
        const hideSearching = () => {
            searchInput.classList.remove('searching');
        };
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            
            const searchValue = this.value.trim();
            
            // Si está vacío o tiene menos de 2 caracteres, limpiar
            if (searchValue.length === 0) {
                searchTimeout = setTimeout(() => {
                    this.form.submit();
                }, 300);
                return;
            }
            
            // Búsqueda para términos de 2+ caracteres
            if (searchValue.length >= 2) {
                showSearching();
                searchTimeout = setTimeout(() => {
                    hideSearching();
                    this.form.submit();
                }, 500);
            }
        });
        
        // Búsqueda al presionar Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                hideSearching();
                this.form.submit();
            }
        });
        
        // Animación al enfocar con filtros activos
        searchInput.addEventListener('focus', function() {
            if (hasActiveFilters) {
                hasActiveFilters.style.transform = 'scale(1.02)';
                hasActiveFilters.style.transition = 'transform 0.2s';
            }
        });
        
        searchInput.addEventListener('blur', function() {
            if (hasActiveFilters) {
                hasActiveFilters.style.transform = 'scale(1)';
            }
        });
    }

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
        selectedTags: []
    };

    const normalizeTag = (value) => String(value || '').trim().toLowerCase();

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
            });

            pill.appendChild(removeButton);
            selectedTagsNode.appendChild(pill);
        });
    };

    const filterSuggestions = () => {
        const searchValue = normalizeTag(tagSearchInput.value);
        tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
            const matches = !searchValue || normalizeTag(button.dataset.tagValue).includes(searchValue);
            button.classList.toggle('is-hidden', !matches);
        });
    };

    const addTags = (tags) => {
        state.selectedTags = uniqueTags([...state.selectedTags, ...tags]);
        renderSelectedTags();
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
        state.selectedTags = uniqueTags(
            String(button.dataset.currentTags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag && normalizeTag(tag) !== 'pendiente')
        );
        titleNode.textContent = `Marcar como visto: ${state.title}`;
        customTagsInput.value = '';
        tagSearchInput.value = '';
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
        state.selectedTags = [];
    };

    document.querySelectorAll('.mark-viewed-btn').forEach((button) => {
        button.addEventListener('click', () => openModal(button));
    });

    tagSuggestionList.querySelectorAll('.tag-suggestion').forEach((button) => {
        button.addEventListener('click', () => addTags([button.dataset.tagValue]));
    });

    addSuggestedTagButton?.addEventListener('click', () => {
        const tag = String(tagSearchInput.value || '').trim();
        if (!tag) {
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
                body: JSON.stringify({ tags: state.selectedTags })
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
    const pageRoot = document.querySelector('[data-admin-page="notion-table"]');
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
            const response = await fetch(`/notion-table/${state.pageId}/tags`, {
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