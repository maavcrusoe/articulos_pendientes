const { Router } = require('express');
const { ObjectId } = require('mongodb');
const rateLimit = require('express-rate-limit');
const { getCollection } = require('../db');
const { isValidObjectId, buildAdvancedSearchQuery } = require('../utils');

const router = Router();

// Rate limiter para búsqueda AJAX: 60 peticiones/minuto por IP
const apiSearchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones de búsqueda. Intenta de nuevo en un momento.' },
});

// Rate limiter para incremento de vistas: 30 peticiones/minuto por IP
const viewLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Límite de peticiones alcanzado.' },
});

// Búsqueda rápida AJAX
router.get('/api/search', apiSearchLimiter, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ results: [], total: 0 });
        }
        // Limitar longitud máxima del término de búsqueda
        if (q.trim().length > 200) {
            return res.status(400).json({ error: 'Término de búsqueda demasiado largo' });
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
router.post('/api/articulo/:id/view', viewLimiter, async (req, res) => {
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
