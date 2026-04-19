const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const {
    ITEMS_PER_PAGE,
    CATEGORIAS_TEMATICAS,
    isValidObjectId,
    categorizarTags,
    processTags,
    buildAdvancedSearchQuery,
    buildTagMatchQuery,
    getArticleStats,
} = require('../utils');

const router = Router();

// Ruta principal
router.get('/', async (req, res) => {
    try {
        const collection = getCollection();
        const { search, tag, categoria, page = 1, periodo, sort } = req.query;
        const filterClauses = [];
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const skip = (currentPage - 1) * ITEMS_PER_PAGE;

        if (search && search.trim()) {
            filterClauses.push(buildAdvancedSearchQuery(search.trim()));
        }

        if (tag && tag.trim()) {
            filterClauses.push(buildTagMatchQuery(tag.trim()));
        }

        if (categoria) {
            const categoriasArray = categoria.split(',').map(cat => cat.trim());
            const categoriaFilters = [];
            categoriasArray.forEach(catKey => {
                if (CATEGORIAS_TEMATICAS[catKey]) {
                    CATEGORIAS_TEMATICAS[catKey].keywords.forEach(keyword => {
                        categoriaFilters.push(...buildTagMatchQuery(keyword).$or);
                    });
                }
            });
            if (categoriaFilters.length > 0) {
                filterClauses.push({ $or: categoriaFilters });
            }
        }

        if (periodo) {
            const now = new Date();
            let fechaInicio, fechaFin;
            switch (periodo) {
                case 'hoy':
                    fechaInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'ayer':
                    fechaInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    fechaFin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'semana':
                    fechaInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                    break;
                case 'mes':
                    fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'semana-pasada': {
                    const inicioEstaSemana = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                    fechaInicio = new Date(inicioEstaSemana);
                    fechaInicio.setDate(inicioEstaSemana.getDate() - 7);
                    fechaFin = new Date(inicioEstaSemana);
                    break;
                }
            }
            if (fechaInicio) {
                filterClauses.push(
                    fechaFin
                        ? { date: { $gte: fechaInicio.toISOString(), $lt: fechaFin.toISOString() } }
                        : { date: { $gte: fechaInicio.toISOString() } }
                );
            }
        }

        const filter = filterClauses.length > 0 ? { $and: filterClauses } : {};
        let sortOption = { date: -1 };
        if (sort === 'views') sortOption = { views: -1, date: -1 };

        const [totalArticulos, articulos, allArticles] = await Promise.all([
            collection.countDocuments(filter),
            collection.find(filter).sort(sortOption).skip(skip).limit(ITEMS_PER_PAGE).toArray(),
            collection.find({}, { projection: { tags: 1 } }).toArray()
        ]);

        const totalPages = Math.ceil(totalArticulos / ITEMS_PER_PAGE) || 1;
        const allTags = [];
        allArticles.forEach(article => {
            if (Array.isArray(article.tags)) allTags.push(...article.tags);
        });

        const processedTags = processTags(allTags);
        const categoriasAgrupadas = categorizarTags(processedTags.tags);
        const stats = await getArticleStats();

        res.render('index', {
            articulos,
            tags: processedTags.tags,
            totalTagsCount: processedTags.totalCount,
            categorias: categoriasAgrupadas,
            currentSearch: search || '',
            currentTag: tag || '',
            currentCategoria: categoria || '',
            currentPeriodo: periodo || '',
            currentSort: sort || '',
            currentPage,
            totalPages,
            totalArticulos,
            total: totalArticulos,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            itemsPerPage: ITEMS_PER_PAGE,
            stats,
        });
    } catch (error) {
        console.error('❌ Error obteniendo artículos:', error);
        res.status(500).render('error', { error: 'Error cargando los artículos' });
    }
});

// Artículo individual
router.get('/articulo/:id', async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).render('error', { error: 'ID de artículo no válido' });
        }

        const articulo = await getCollection().findOne({ _id: new ObjectId(req.params.id) });
        if (!articulo) {
            return res.status(404).render('error', { error: 'Artículo no encontrado' });
        }
        res.render('articulo', { articulo });
    } catch (error) {
        console.error('❌ Error obteniendo artículo:', error);
        res.status(500).render('error', { error: 'Error cargando el artículo' });
    }
});

module.exports = router;
