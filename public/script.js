// Funcionalidades de la página de artículos
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const articlesContainer = document.querySelector('.articles-container');
    const searchForm = document.querySelector('.search-form');

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