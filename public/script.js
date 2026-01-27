// Funcionalidades de la página de artículos
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const articlesContainer = document.querySelector('.articles-container');

    // Debounce para búsqueda en tiempo real
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (this.value.length >= 3 || this.value.length === 0) {
                    this.form.submit();
                }
            }, 500);
        });
    }

    // Efectos visuales
    const articles = document.querySelectorAll('.article-card');
    articles.forEach((article, index) => {
        article.style.animationDelay = `${index * 0.1}s`;
    });

    // Funcionalidad para "Leer más" y click en la tarjeta
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const articleId = this.getAttribute('data-id');
            if (articleId) {
                window.location.href = '/articulo/' + articleId;
            }
        });
    });

    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('a') && !e.target.closest('button')) {
                const articleId = this.getAttribute('data-id');
                if (articleId) {
                    window.location.href = '/articulo/' + articleId;
                }
            }
        });
    });

    // Atajos de teclado para paginación
    document.addEventListener('keydown', function(e) {
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
    });
});