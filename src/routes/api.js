const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { isValidObjectId, buildAdvancedSearchQuery } = require('../utils');

const router = Router();

// Búsqueda rápida AJAX
router.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ results: [], total: 0 });
        }

        const searchQuery = buildAdvancedSearchQuery(q.trim());
        const results = await getCollection()
            .find(searchQuery)
            .sort({ date: -1 })
            .limit(10)
            .project({ title: 1, url: 1, date: 1, tags: 1 })
            .toArray();

        res.json({ results, total: results.length });
    } catch (error) {
        console.error('❌ Error en búsqueda API:', error);
        res.status(500).json({ error: 'Error en búsqueda' });
    }
});

// Incrementar vistas
router.post('/api/articulo/:id/view', async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'ID no válido' });
        }

        const result = await getCollection().findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $inc: { views: 1 } },
            { returnDocument: 'after', upsert: false }
        );

        if (!result) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }

        res.json({ success: true, views: result.views || 1 });
    } catch (error) {
        console.error('❌ Error incrementando vistas:', error);
        res.status(500).json({ error: 'Error incrementando vistas' });
    }
});

module.exports = router;
