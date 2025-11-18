// Funcionalidad adicional para búsqueda en tiempo real (opcional)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const articlesContainer = document.querySelector('.articles-container');
    
    // Debounce para búsqueda en tiempo real
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.length >= 3 || this.value.length === 0) {
                this.form.submit();
            }
        }, 500);
    });
    
    // Efectos visuales
    const articles = document.querySelectorAll('.article-card');
    articles.forEach((article, index) => {
        article.style.animationDelay = `${index * 0.1}s`;
    });
});


// Funcionalidad para "Leer más"
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const articleId = this.getAttribute('data-id');
            window.location.href = '/articulo/' + articleId;
        });
    });
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('a') && !e.target.closest('button')) {
                const articleId = this.getAttribute('data-id');
                window.location.href = '/articulo/' + articleId;
            }
        });
    });
    // Atajos de teclado para paginación
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && !e.target.matches('input, textarea, select')) {
            const currentPage = <%= currentPage %>;
            const hasPrev = <%= hasPrevPage %>;
            const hasNext = <%= hasNextPage %>;
            
            if (e.key === 'ArrowLeft' && hasPrev) {
                e.preventDefault();
                jumpToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight' && hasNext) {
                e.preventDefault();
                jumpToPage(currentPage + 1);
            }
        }
    });
});