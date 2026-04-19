const { Router } = require('express');
const { requireAdmin } = require('../middleware');
const { ITEMS_PER_PAGE } = require('../utils');
const {
    normalizeNotionText,
    parseTagsInput,
    fetchNotionPendientes,
    fetchNotionVistos,
    mergeNotionItemTags,
    markNotionItemAsViewed,
    resolveNotionTagConfig,
} = require('../notion');

const router = Router();

async function renderNotionPendingPage(res, options = {}) {
    const notionItems = await fetchNotionPendientes();
    const tagConfig = await resolveNotionTagConfig();
    res.render('notion-pending', {
        notionItems,
        availableTags: tagConfig.availableTags || [],
        error: options.error || null,
        success: options.success || null,
    });
}

async function renderNotionViewedPage(req, res, options = {}) {
    const currentSearch = String(req.query.search || '').trim();
    const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const allViewedItems = await fetchNotionVistos();
    const normalizedSearch = normalizeNotionText(currentSearch);

    const filteredItems = normalizedSearch
        ? allViewedItems.filter((item) => {
            const haystack = normalizeNotionText(`${item.title} ${(item.tags || []).join(' ')}`);
            return haystack.includes(normalizedSearch);
        })
        : allViewedItems;

    const totalItems = filteredItems.length;
    const totalPages = Math.max(Math.ceil(totalItems / ITEMS_PER_PAGE), 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const notionItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const tagConfig = await resolveNotionTagConfig();

    res.render('notion-table', {
        notionItems,
        availableTags: tagConfig.availableTags || [],
        currentSearch,
        currentPage,
        itemsPerPage: ITEMS_PER_PAGE,
        totalPages,
        totalItems,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
        error: options.error || null,
        success: options.success || null,
    });
}

router.get('/notion-pending', requireAdmin, async (req, res) => {
    try {
        await renderNotionPendingPage(res);
    } catch (error) {
        console.error('❌ Error cargando pendientes de Notion:', error);
        res.status(500).render('error', { error: 'Error cargando los pendientes de Notion' });
    }
});

router.get('/notion-table', requireAdmin, async (req, res) => {
    try {
        await renderNotionViewedPage(req, res);
    } catch (error) {
        console.error('❌ Error cargando tabla de Notion vista:', error);
        res.status(500).render('error', { error: 'Error cargando la tabla de items vistos de Notion' });
    }
});

router.get('/notion-pending/api/items', requireAdmin, async (req, res) => {
    try {
        const notionItems = await fetchNotionPendientes();
        const tagConfig = await resolveNotionTagConfig();
        res.json({ success: true, items: notionItems, availableTags: tagConfig.availableTags || [] });
    } catch (error) {
        console.error('❌ Error API Notion pending:', error);
        res.status(500).json({ success: false, error: 'Error cargando datos de Notion' });
    }
});

router.post('/notion-pending/:id/mark-viewed', requireAdmin, async (req, res) => {
    try {
        const extraTags = parseTagsInput(req.body.tags);
        await markNotionItemAsViewed(req.params.id, extraTags);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marcando item de Notion como visto:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudo actualizar el item de Notion.' });
    }
});

router.post('/notion-table/:id/tags', requireAdmin, async (req, res) => {
    try {
        const extraTags = parseTagsInput(req.body.tags);
        await mergeNotionItemTags(req.params.id, extraTags, { ensureViewed: true, removePending: true });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error actualizando etiquetas del item de Notion:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudieron actualizar las etiquetas del item de Notion.' });
    }
});

module.exports = router;
