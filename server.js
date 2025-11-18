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

// Conectar a MongoDB
async function connectDB() {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        db = client.db(dbName);
        console.log('Conectado a MongoDB');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error);
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
    popularTags.slice(0, 15).forEach(tag => {
        //console.log(`"${tag.name}": ${tag.count} artículos`);
    });

    return {
        tags: popularTags,
        totalCount: Object.keys(tagCounts).length
    };
}


// Añade esta función en tu server.js
app.use((req, res, next) => {
    res.locals.buildQueryString = (overrides = {}) => {
        const params = {
            search: currentSearch,
            tag: currentTag,
            categoria: currentCategoria,
            page: currentPage > 1 ? currentPage : null,
            ...overrides
        };
        
        const queryString = Object.entries(params)
            .filter(([key, value]) => value && value !== '')
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
            
        return queryString ? `?${queryString}` : '';
    };
    next();
});

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
        hoy: await db.collection(collectionName).countDocuments({
            date: { $gte: hoy.toISOString() }
        }),
        ayer: await db.collection(collectionName).countDocuments({
            date: { 
                $gte: ayer.toISOString(),
                $lt: hoy.toISOString()
            }
        }),
        estaSemana: await db.collection(collectionName).countDocuments({
            date: { $gte: inicioEstaSemana.toISOString() }
        }),
        semanaPasada: await db.collection(collectionName).countDocuments({
            date: { 
                $gte: inicioSemanaPasada.toISOString(),
                $lte: finSemanaPasada.toISOString()
            }
        }),
        esteMes: await db.collection(collectionName).countDocuments({
            date: { $gte: inicioEsteMes.toISOString() }
        })
    };

    return stats;
}

app.get('/', async (req, res) => {
    try {
        const { 
            search, 
            tag, 
            categoria, 
            page = 1 
        } = req.query;
        
        let filter = {};
        const currentPage = parseInt(page);
        const skip = (currentPage - 1) * ITEMS_PER_PAGE;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (tag) {
            filter.tags = { $regex: tag, $options: 'i' };
        }

        if (categoria) {
            const categoriasArray = categoria.split(',').map(cat => cat.trim());
            const categoriaFilters = [];
            
            categoriasArray.forEach(catKey => {
                if (CATEGORIAS_TEMATICAS[catKey]) {
                    const categoriaInfo = CATEGORIAS_TEMATICAS[catKey];
                    categoriaInfo.keywords.forEach(keyword => {
                        categoriaFilters.push({
                            tags: { $regex: keyword, $options: 'i' }
                        });
                    });
                }
            });
            
            if (categoriaFilters.length > 0) {
                if (!filter.$or) filter.$or = [];
                filter.$or.push(...categoriaFilters);
                
                if (filter.$or.length > 0) {
                    filter = { $and: [filter] };
                    filter.$and.push({ $or: categoriaFilters });
                }
            }
        }

        // Obtener total de artículos para paginación
        const totalArticulos = await db.collection(collectionName)
            .countDocuments(filter);

        // Obtener artículos paginados
        const articulos = await db.collection(collectionName)
            .find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(ITEMS_PER_PAGE)
            .toArray();

        // Calcular páginas
        const totalPages = Math.ceil(totalArticulos / ITEMS_PER_PAGE);
        const hasNextPage = currentPage < totalPages;
        const hasPrevPage = currentPage > 1;

        // Obtener todos los artículos para procesar tags
        const allArticles = await db.collection(collectionName).find({}).toArray();
        const allTags = [];

        allArticles.forEach(article => {
            if (article.tags && Array.isArray(article.tags)) {
                allTags.push(...article.tags);
            }
        });

        const processedTags = processTags(allTags);
        const categoriasAgrupadas = categorizarTags(processedTags.tags);

        // OBTENER ESTADÍSTICAS - dentro de la función async
        const stats = await getArticleStats();

        res.render('index', {
            articulos,
            tags: processedTags.tags,
            totalTagsCount: processedTags.totalCount,
            categorias: categoriasAgrupadas,
            currentSearch: search || '',
            currentTag: tag || '',
            currentCategoria: categoria || '',
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
        console.error('Error obteniendo artículos:', error);
        res.status(500).render('error', { error: 'Error cargando los artículos' });
    }
});

// Resto del código igual...
app.get('/articulo/:id', async (req, res) => {
    try {
        const articulo = await db.collection(collectionName)
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!articulo) {
            return res.status(404).render('error', { error: 'Artículo no encontrado' });
        }

        res.render('articulo', { articulo });
    } catch (error) {
        console.error('Error obteniendo artículo:', error);
        res.status(500).render('error', { error: 'Error cargando el artículo' });
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