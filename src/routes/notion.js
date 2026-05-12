const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { requireAdmin } = require('../middleware');
const { ITEMS_PER_PAGE, escapeRegex, isValidObjectId } = require('../utils');
const {
    parseTagsInput,
    fetchNotionPendientes,
    fetchNotionVistos,
    deleteNotionPage,
    resolveNotionTagConfig,
} = require('../notion');
const { getLinksCollection } = require('../db');

const SYSTEM_TAGS = new Set(['visto', 'seen', 'read', 'done', 'completed', 'pendiente', 'por hacer', 'to do', 'not started']);

function cleanTags(tags) {
    return tags.filter((t) => !SYSTEM_TAGS.has(String(t || '').trim().toLowerCase()));
}

function toValidDate(...values) {
    for (const value of values) {
        if (!value) {
            continue;
        }

        const parsed = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function formatDateTime(value) {
    const parsed = toValidDate(value);
    if (!parsed) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(parsed);
}

function mapPendingItems(items) {
    return items
        .map((item) => {
            const sortDate = toValidDate(item.createdTime, item.lastEdited);
            return {
                ...item,
                dateValue: sortDate ? sortDate.toISOString() : '',
                dateLabel: formatDateTime(sortDate),
            };
        })
        .sort((left, right) => {
            const leftTime = toValidDate(left.dateValue)?.getTime() || 0;
            const rightTime = toValidDate(right.dateValue)?.getTime() || 0;
            return rightTime - leftTime;
        });
}

const router = Router();

async function getAvailableTags() {
    const linksCol = getLinksCollection();
    const mongoTags = await linksCol.distinct('tags', {});
    // Merge with Notion tags for wider suggestions
    let notionTags = [];
    try {
        const tagConfig = await resolveNotionTagConfig();
        notionTags = tagConfig.availableTags || [];
    } catch (_) { /* Notion may be unreachable */ }
    const merged = Array.from(new Set([
        ...mongoTags.filter((t) => !SYSTEM_TAGS.has(String(t || '').trim().toLowerCase())),
        ...notionTags.filter((t) => !SYSTEM_TAGS.has(String(t || '').trim().toLowerCase())),
    ])).sort();
    return merged;
}

async function renderNotionPendingPage(res, options = {}) {
    const notionItems = mapPendingItems(await fetchNotionPendientes());
    const availableTags = await getAvailableTags();
    res.render('notion-pending', {
        notionItems,
        availableTags,
        error: options.error || null,
        success: options.success || null,
    });
}

async function renderNotionViewedPage(req, res, options = {}) {
    const currentSearch = String(req.query.search || '').trim();
    const currentFilter = String(req.query.filter || '').trim().toLowerCase();
    const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const linksCol = getLinksCollection();

    const query = {};
    if (currentFilter === 'untagged') {
        query.$or = [{ tags: { $exists: false } }, { tags: { $size: 0 } }];
    }
    if (currentSearch) {
        const searchQuery = { $or: [
            { title: { $regex: escapeRegex(currentSearch), $options: 'i' } },
            { tags: { $regex: escapeRegex(currentSearch), $options: 'i' } },
        ] };
        if (Object.keys(query).length) {
            query.$and = [searchQuery, { $or: query.$or }];
            delete query.$or;
        } else {
            Object.assign(query, searchQuery);
        }
    }

    const totalItems = await linksCol.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalItems / ITEMS_PER_PAGE), 1);
    const currentPage = Math.min(requestedPage, totalPages);

    const rawItems = await linksCol.find(query)
        .sort({ viewedAt: -1 })
        .skip((currentPage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .toArray();

    const notionItems = rawItems.map((item) => {
        const viewedAt = toValidDate(item.viewedAt);
        return {
            id: item._id.toString(),
            title: item.title || 'Sin título',
            sourceUrl: item.sourceUrl || '',
            notionUrl: item.notionUrl || '',
            tags: item.tags || [],
            status: 'Visto',
            viewedAt,
            dateValue: viewedAt ? viewedAt.toISOString() : '',
            dateLabel: formatDateTime(viewedAt),
        };
    });

    const availableTags = await linksCol.distinct('tags', {});

    res.render('notion-table', {
        notionItems,
        availableTags: availableTags.sort(),
        currentSearch,
        currentFilter,
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

router.get('/links-vistos', requireAdmin, async (req, res) => {
    try {
        await renderNotionViewedPage(req, res);
    } catch (error) {
        console.error('❌ Error cargando tabla de vistos:', error);
        res.status(500).render('error', { error: 'Error cargando la tabla de links vistos' });
    }
});

router.get('/notion-pending/api/items', requireAdmin, async (req, res) => {
    try {
        const notionItems = mapPendingItems(await fetchNotionPendientes());
        const availableTags = await getAvailableTags();
        res.json({ success: true, items: notionItems, availableTags });
    } catch (error) {
        console.error('❌ Error API Notion pending:', error);
        res.status(500).json({ success: false, error: 'Error cargando datos de Notion' });
    }
});

// Migrate all Notion "visto" items to MongoDB links (upsert by notionId)
router.post('/notion-pending/migrate-vistos', requireAdmin, async (req, res) => {
    try {
        const vistos = await fetchNotionVistos();
        const linksCol = getLinksCollection();
        let inserted = 0;
        let skipped = 0;

        for (const item of vistos) {
            const result = await linksCol.updateOne(
                { notionId: item.id },
                { $setOnInsert: {
                    notionId: item.id,
                    title: item.title || 'Sin título',
                    sourceUrl: item.sourceUrl || '',
                    notionUrl: item.url || '',
                    tags: cleanTags(item.tags || []),
                    viewedAt: new Date(item.createdTime || Date.now()),
                }},
                { upsert: true }
            );
            if (result.upsertedCount > 0) { inserted++; } else { skipped++; }
        }

        console.log(`✅ Migración Notion→Mongo: ${inserted} nuevos, ${skipped} ya existían`);
        res.json({ success: true, inserted, skipped });
    } catch (error) {
        console.error('❌ Error migrando vistos de Notion:', error);
        res.status(500).json({ success: false, error: error.message || 'Error en la migración.' });
    }
});

// Mark a Notion pending item as viewed: save to MongoDB links, then update Notion
router.post('/notion-pending/:id/mark-viewed', requireAdmin, async (req, res) => {
    try {
        const notionId = req.params.id;
        const { title, sourceUrl, notionUrl } = req.body;
        const extraTags = cleanTags(parseTagsInput(req.body.tags));

        const linksCol = getLinksCollection();
        await linksCol.updateOne(
            { notionId },
            { $set: {
                notionId,
                title: String(title || '').trim() || 'Sin título',
                sourceUrl: String(sourceUrl || '').trim(),
                notionUrl: String(notionUrl || '').trim(),
                tags: extraTags,
                viewedAt: new Date(),
            }},
            { upsert: true }
        );

        // Best-effort: archive (delete) the page from Notion so it disappears from pending list
        try {
            await deleteNotionPage(notionId);
        } catch (notionErr) {
            console.warn('⚠️ No se pudo archivar en Notion (item guardado en MongoDB):', notionErr.message);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error guardando link en MongoDB:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudo guardar el item.' });
    }
});

// Update tags of a saved link in MongoDB
router.post('/links-vistos/:id/tags', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }
        const newTags = cleanTags(parseTagsInput(req.body.tags));
        const linksCol = getLinksCollection();
        const item = await linksCol.findOne({ _id: new ObjectId(id) });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Link no encontrado.' });
        }
        const tagMap = new Map((item.tags || []).map((t) => [t.toLowerCase(), t]));
        newTags.forEach((t) => tagMap.set(t.toLowerCase(), t));
        await linksCol.updateOne({ _id: new ObjectId(id) }, { $set: { tags: Array.from(tagMap.values()) } });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error actualizando etiquetas del link:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudieron actualizar las etiquetas.' });
    }
});

// Eliminar un link visto de MongoDB
router.delete('/links-vistos/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }
        const linksCol = getLinksCollection();
        const result = await linksCol.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Link no encontrado.' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error eliminando link:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudo eliminar el link.' });
    }
});

module.exports = router;
