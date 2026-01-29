const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Configuración MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'tu_basedatos';
const collectionName = process.env.CollectionName || 'pendientes';
const ITEMS_PER_PAGE = parseInt(process.env.ITEMS_PER_PAGE) || 10;

console.log('MongoDB URL:', mongoUrl);

let db;
let collection;

// Conectar a MongoDB y crear índices
async function connectDB() {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        db = client.db(dbName);
        collection = db.collection(collectionName);
        
        // Crear índices para búsquedas más rápidas
        await collection.createIndex({ title: 'text', content: 'text', url: 'text', tags: 'text' });
        await collection.createIndex({ date: -1 });
        await collection.createIndex({ tags: 1 });
        
        console.log('✅ Conectado a MongoDB e índices creados');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        // No crear índices si ya existen
        if (error.code !== 85) { // Index already exists
            throw error;
        }
    }
}

// Definir categorías temáticas
const CATEGORIAS_TEMATICAS = {
    'tecnologia': {
        name: '🚀 Tecnología',
        keywords: ['big data', 'data', 'analytics', 'python', 'javascript', 'react', 'nextjs', 'api', 'github', 'open-source', 'library', 'selenium', 'go', 'whatsapp', 'multidevice']
    },
    'desarrollo': {
        name: '💻 Desarrollo',
        keywords: ['web', 'app', 'application', 'framework', 'programming', 'code', 'developer', 'frontend', 'backend', 'fullstack']
    },
    'seguridad': {
        name: '🔐 Seguridad',
        keywords: ['security', 'authentication', 'authorization', 'single sign-on', 'two-factor authentication', 'cifrar', 'encryption', 'secure']
    },
    'negocios': {
        name: '💼 Negocios',
        keywords: ['liderazgo', 'gestión', 'organización', 'toma de decisiones', 'management', 'business', 'empresa', 'estrategia']
    },
    'devops': {
        name: '⚙️ DevOps',
        keywords: ['self-hosted', 'paas', 'hosting', 'deployment', 'server', 'cloud', 'heroku', 'railway', 'render', 'docker', 'kubernetes']
    },
    'datos': {
        name: '📊 Datos & Analytics',
        keywords: ['big data', 'análisis de datos', 'data analysis', 'analytics', 'machine learning', 'ai', 'estadísticas']
    },
    'ecommerce': {
        name: '🛒 eCommerce',
        keywords: ['ecommerce', 'shopify', 'commerce', 'tienda', 'ventas', 'payment']
    }
};

// Función para categorizar tags automáticamente
function categorizarTags(tagsArray) {
    const categorias = {};
    
    // Inicializar categorías
    Object.keys(CATEGORIAS_TEMATICAS).forEach(key => {
        categorias[key] = {
            ...CATEGORIAS_TEMATICAS[key],
            tags: [],
            count: 0
        };
    });

    // Categoría para "otros"
    categorias.otros = {
        name: '📦 Otros',
        tags: [],
        count: 0
    };

    tagsArray.forEach(tagObj => {
        const tagName = tagObj.name.toLowerCase();
        let categoriaEncontrada = false;

        // Buscar en cada categoría
        for (const [categoriaKey, categoria] of Object.entries(CATEGORIAS_TEMATICAS)) {
            if (categoria.keywords.some(keyword => 
                tagName.includes(keyword.toLowerCase()) || 
                keyword.toLowerCase().includes(tagName)
            )) {
                categorias[categoriaKey].tags.push(tagObj);
                categorias[categoriaKey].count += tagObj.count;
                categoriaEncontrada = true;
                break;
            }
        }

        // Si no se encuentra categoría, ir a "otros"
        if (!categoriaEncontrada) {
            categorias.otros.tags.push(tagObj);
            categorias.otros.count += tagObj.count;
        }
    });

    // Filtrar categorías vacías y ordenar por count
    return Object.entries(categorias)
        .filter(([key, cat]) => cat.tags.length > 0)
        .sort(([,a], [,b]) => b.count - a.count);
}

function processTags(tagsArray) {    
    const tagCounts = {};
    
    tagsArray.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const popularTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25);

    return {
        tags: popularTags,
        totalCount: Object.keys(tagCounts).length
    };
}

// Función mejorada para búsqueda avanzada por todos los campos
function buildAdvancedSearchQuery(searchTerm) {
    if (!searchTerm) return {};
    
    // Dividir el término de búsqueda en palabras individuales
    const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
    
    // Si solo hay una palabra, búsqueda simple
    if (words.length === 1) {
        const regex = { $regex: searchTerm, $options: 'i' };
        return {
            $or: [
                { title: regex },
                { content: regex },
                { url: regex },
                { tags: regex },
                { tags: { $elemMatch: { $regex: searchTerm, $options: 'i' } } }
            ]
        };
    }
    
    // Para múltiples palabras, buscar que todas aparezcan en cualquier campo
    const wordConditions = words.map(word => ({
        $or: [
            { title: { $regex: word, $options: 'i' } },
            { content: { $regex: word, $options: 'i' } },
            { url: { $regex: word, $options: 'i' } },
            { tags: { $regex: word, $options: 'i' } },
            { tags: { $elemMatch: { $regex: word, $options: 'i' } } }
        ]
    }));
    
    return { $and: wordConditions };
}

// Función para buscar por etiqueta específica
function buildTagMatchQuery(value) {
    return {
        $or: [
            { tags: { $regex: value, $options: 'i' } },
            { tags: { $elemMatch: { $regex: value, $options: 'i' } } }
        ]
    };
}

// Función para calcular estadísticas de artículos por periodo
async function getArticleStats() {
    const now = new Date();
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const inicioEstaSemana = new Date(hoy);
    inicioEstaSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const inicioSemanaPasada = new Date(inicioEstaSemana);
    inicioSemanaPasada.setDate(inicioSemanaPasada.getDate() - 7);
    
    const finSemanaPasada = new Date(inicioSemanaPasada);
    finSemanaPasada.setDate(finSemanaPasada.getDate() + 6);
    
    const inicioEsteMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
        hoy: await collection.countDocuments({
            date: { $gte: hoy.toISOString() }
        }),
        ayer: await collection.countDocuments({
            date: { 
                $gte: ayer.toISOString(),
                $lt: hoy.toISOString()
            }
        }),
        estaSemana: await collection.countDocuments({
            date: { $gte: inicioEstaSemana.toISOString() }
        }),
        semanaPasada: await collection.countDocuments({
            date: { 
                $gte: inicioSemanaPasada.toISOString(),
                $lte: finSemanaPasada.toISOString()
            }
        }),
        esteMes: await collection.countDocuments({
            date: { $gte: inicioEsteMes.toISOString() }
        }),
        topViews: await collection.countDocuments({
            views: { $gt: 0 }
        })
    };

    return stats;
}

// Ruta principal optimizada con búsqueda mejorada
app.get('/', async (req, res) => {
    try {
        const { search, tag, categoria, page = 1, periodo, sort } = req.query;
        
        const filterClauses = [];
        const currentPage = parseInt(page);
        const skip = (currentPage - 1) * ITEMS_PER_PAGE;

        // Búsqueda avanzada por todos los campos
        if (search && search.trim()) {
            const searchQuery = buildAdvancedSearchQuery(search.trim());
            filterClauses.push(searchQuery);
        }

        // Filtro por etiqueta específica
        if (tag && tag.trim()) {
            filterClauses.push(buildTagMatchQuery(tag.trim()));
        }

        // Filtro por categoría
        if (categoria) {
            const categoriasArray = categoria.split(',').map(cat => cat.trim());
            const categoriaFilters = [];
            
            categoriasArray.forEach(catKey => {
                if (CATEGORIAS_TEMATICAS[catKey]) {
                    const categoriaInfo = CATEGORIAS_TEMATICAS[catKey];
                    categoriaInfo.keywords.forEach(keyword => {
                        categoriaFilters.push(...buildTagMatchQuery(keyword).$or);
                    });
                }
            });
            
            if (categoriaFilters.length > 0) {
                filterClauses.push({ $or: categoriaFilters });
            }
        }

        // Filtro por periodo de tiempo
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
                case 'semana-pasada':
                    const inicioEstaSemana = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                    fechaInicio = new Date(inicioEstaSemana);
                    fechaInicio.setDate(inicioEstaSemana.getDate() - 7);
                    fechaFin = new Date(inicioEstaSemana);
                    break;
            }

            if (fechaInicio) {
                const dateFilter = fechaFin 
                    ? { date: { $gte: fechaInicio.toISOString(), $lt: fechaFin.toISOString() } }
                    : { date: { $gte: fechaInicio.toISOString() } };
                filterClauses.push(dateFilter);
            }
        }

        const filter = filterClauses.length > 0 ? { $and: filterClauses } : {};

        // Determinar el orden
        let sortOption = { date: -1 }; // Por defecto, más recientes primero
        if (sort === 'views') {
            sortOption = { views: -1, date: -1 }; // Más vistos primero, luego por fecha
        }

        // Consultas optimizadas en paralelo
        const [totalArticulos, articulos, allArticles] = await Promise.all([
            collection.countDocuments(filter),
            collection
                .find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(ITEMS_PER_PAGE)
                .toArray(),
            collection.find({}, { projection: { tags: 1 } }).toArray()
        ]);

        // Calcular páginas
        const totalPages = Math.ceil(totalArticulos / ITEMS_PER_PAGE);
        const hasNextPage = currentPage < totalPages;
        const hasPrevPage = currentPage > 1;

        // Procesar tags
        const allTags = [];
        allArticles.forEach(article => {
            if (article.tags && Array.isArray(article.tags)) {
                allTags.push(...article.tags);
            }
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
            currentPage: currentPage,
            totalPages: totalPages,
            totalArticulos: totalArticulos,
            total: totalArticulos,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage,
            itemsPerPage: ITEMS_PER_PAGE,
            stats: stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo artículos:', error);
        res.status(500).render('error', { error: 'Error cargando los artículos' });
    }
});

// Ruta para artículo individual
app.get('/articulo/:id', async (req, res) => {
    try {
        const articulo = await collection.findOne({ _id: new ObjectId(req.params.id) });
        
        if (!articulo) {
            return res.status(404).render('error', { error: 'Artículo no encontrado' });
        }

        res.render('articulo', { articulo });
    } catch (error) {
        console.error('❌ Error obteniendo artículo:', error);
        res.status(500).render('error', { error: 'Error cargando el artículo' });
    }
});

// Ruta para incrementar vistas (llamada desde el botón "Leer más")
app.post('/api/articulo/:id/view', async (req, res) => {
    try {
        const result = await collection.findOneAndUpdate(
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

// API endpoint para búsqueda rápida (AJAX)
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ results: [], total: 0 });
        }

        const searchQuery = buildAdvancedSearchQuery(q.trim());
        const results = await collection
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

// Helper function para construir query strings
function buildQueryString(params) {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.tag) searchParams.append('tag', params.tag);
    if (params.categoria) searchParams.append('categoria', params.categoria);
    if (params.page) searchParams.append('page', params.page);
    
    return searchParams.toString();
}

// Hazla disponible en tus vistas EJS
app.use((req, res, next) => {
    res.locals.buildQueryString = buildQueryString;
    next();
});

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀Servidor corriendo en http://localhost:${port}`);
    });
});