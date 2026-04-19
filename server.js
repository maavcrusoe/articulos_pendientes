const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'articulosPendientes_s3cr3t_k3y_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Hacer session disponible en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Notion client
const notion = new Client({ auth: process.env.NOTION_API });
const NOTION_TABLE = process.env.NOTION_TABLE || '';
const NOTION_PAGE_ID = extractNotionId(NOTION_TABLE);
const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || '';

let resolvedNotionDataSourceId = NOTION_DATA_SOURCE_ID;
let resolvedNotionPendingFilter = null;
let resolvedNotionSchema = null;

const PENDING_NOTION_VALUES = ['not started', 'pendiente', 'por hacer', 'to do'];
const VIEWED_NOTION_VALUES = ['visto', 'seen', 'read', 'done', 'completed'];

function extractNotionId(value) {
    if (!value) return '';

    const cleanValue = String(value).trim();
    const hyphenatedMatch = cleanValue.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (hyphenatedMatch) {
        return hyphenatedMatch[0].toLowerCase();
    }

    const compactMatch = cleanValue.match(/[a-f0-9]{32}/i);
    if (!compactMatch) return '';

    const compactId = compactMatch[0].toLowerCase();
    return `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20)}`;
}

function normalizeNotionId(value) {
    return extractNotionId(value).replace(/-/g, '');
}

// Configuración MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'tu_basedatos';
const collectionName = process.env.CollectionName || 'pendientes';
const ITEMS_PER_PAGE = parseInt(process.env.ITEMS_PER_PAGE) || 10;

console.log('MongoDB URL:', mongoUrl);
console.log('Notion table:', NOTION_TABLE || '(no configurada)');
if (NOTION_DATA_SOURCE_ID) {
    console.log('Notion data source ID explícito:', NOTION_DATA_SOURCE_ID);
}

let db;
let collection;
let usersCollection;

// Conectar a MongoDB y crear índices
async function connectDB() {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        db = client.db(dbName);
        collection = db.collection(collectionName);
        usersCollection = db.collection('users');
        
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

// ========== AUTH MIDDLEWARE ==========
function requireLogin(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/admin/login');
}

function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    if (req.session.user) {
        return res.status(403).render('error', { error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    res.redirect('/admin/login');
}

// ========== AUTH ROUTES ==========

// Login page
app.get('/admin/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('login', { error: null });
});

// Login POST
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('login', { error: 'Usuario y contraseña son requeridos' });
        }

        const user = await usersCollection.findOne({ username: username.toLowerCase().trim() });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.render('login', { error: 'Credenciales incorrectas' });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role
        };
        res.redirect('/admin');
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.render('login', { error: 'Error del servidor' });
    }
});

// Register page
app.get('/admin/register', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('register', { error: null, success: null });
});

// Register POST
app.post('/admin/register', async (req, res) => {
    try {
        const { username, password, password2 } = req.body;
        if (!username || !password || !password2) {
            return res.render('register', { error: 'Todos los campos son requeridos', success: null });
        }
        if (password !== password2) {
            return res.render('register', { error: 'Las contraseñas no coinciden', success: null });
        }
        if (password.length < 6) {
            return res.render('register', { error: 'La contraseña debe tener al menos 6 caracteres', success: null });
        }

        const existing = await usersCollection.findOne({ username: username.toLowerCase().trim() });
        if (existing) {
            return res.render('register', { error: 'El usuario ya existe', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.insertOne({
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            role: 'user',
            createdAt: new Date()
        });

        res.render('register', { error: null, success: 'Usuario creado correctamente. Ahora puedes iniciar sesión.' });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.render('register', { error: 'Error del servidor', success: null });
    }
});

// Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function parseTagsInput(value) {
    const rawTags = Array.isArray(value) ? value : [value];
    const normalizedTags = rawTags
        .flatMap((entry) => String(entry || '').split(','))
        .map((entry) => entry.trim())
        .filter(Boolean);

    return Array.from(new Map(normalizedTags.map((entry) => [normalizeNotionText(entry), entry])).values());
}

async function getAdminUsers() {
    const users = await usersCollection
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

    return users.map((user) => ({
        ...user,
        id: user._id.toString()
    }));
}

async function renderAdminUsers(res, options = {}) {
    const users = await getAdminUsers();
    const totalAdmins = users.filter((user) => user.role === 'admin').length;

    res.render('admin', {
        users,
        totalAdmins,
        error: options.error || null,
        success: options.success || null
    });
}

async function renderNotionPendingPage(res, options = {}) {
    const notionItems = await fetchNotionPendientes();
    const tagConfig = await resolveNotionTagConfig();

    res.render('notion-pending', {
        notionItems,
        availableTags: tagConfig.availableTags || [],
        error: options.error || null,
        success: options.success || null
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
        success: options.success || null
    });
}

// ========== ADMIN PANEL (solo admins) ==========
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        await renderAdminUsers(res);
    } catch (error) {
        console.error('❌ Error cargando panel admin:', error);
        res.status(500).render('error', { error: 'Error cargando los usuarios' });
    }
});

app.post('/admin/users', requireAdmin, async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || '');
        const role = req.body.role === 'admin' ? 'admin' : 'user';

        if (!username || !password) {
            return renderAdminUsers(res, { error: 'Usuario y contraseña son obligatorios.' });
        }

        if (password.length < 6) {
            return renderAdminUsers(res, { error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return renderAdminUsers(res, { error: 'Ese nombre de usuario ya existe.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.insertOne({
            username,
            password: hashedPassword,
            role,
            createdAt: new Date()
        });

        await renderAdminUsers(res, { success: 'Usuario creado correctamente.' });
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo crear el usuario.' });
    }
});

app.post('/admin/users/:id/update', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || '');
        const role = req.body.role === 'admin' ? 'admin' : 'user';
        const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!existingUser) {
            return renderAdminUsers(res, { error: 'El usuario no existe.' });
        }

        if (!username) {
            return renderAdminUsers(res, { error: 'El nombre de usuario es obligatorio.' });
        }

        const duplicatedUser = await usersCollection.findOne({
            username,
            _id: { $ne: new ObjectId(userId) }
        });
        if (duplicatedUser) {
            return renderAdminUsers(res, { error: 'Ya existe otro usuario con ese nombre.' });
        }

        const adminCount = await usersCollection.countDocuments({ role: 'admin' });
        const isSelf = String(existingUser._id) === String(req.session.user.id);
        if (existingUser.role === 'admin' && role !== 'admin' && adminCount <= 1) {
            return renderAdminUsers(res, { error: 'Debe existir al menos un administrador.' });
        }

        if (isSelf && role !== 'admin') {
            return renderAdminUsers(res, { error: 'No puedes quitarte a ti mismo el rol de administrador.' });
        }

        const update = {
            username,
            role
        };

        if (password) {
            if (password.length < 6) {
                return renderAdminUsers(res, { error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            update.password = await bcrypt.hash(password, 10);
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: update }
        );

        if (isSelf) {
            req.session.user.username = username;
            req.session.user.role = role;
        }

        await renderAdminUsers(res, { success: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo actualizar el usuario.' });
    }
});

app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!existingUser) {
            return renderAdminUsers(res, { error: 'El usuario no existe.' });
        }

        if (String(existingUser._id) === String(req.session.user.id)) {
            return renderAdminUsers(res, { error: 'No puedes eliminar tu propio usuario.' });
        }

        const adminCount = await usersCollection.countDocuments({ role: 'admin' });
        if (existingUser.role === 'admin' && adminCount <= 1) {
            return renderAdminUsers(res, { error: 'No puedes eliminar el último administrador.' });
        }

        await usersCollection.deleteOne({ _id: new ObjectId(userId) });
        await renderAdminUsers(res, { success: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo eliminar el usuario.' });
    }
});

// ========== NOTION PENDING PANEL ==========
app.get('/notion-pending', requireAdmin, async (req, res) => {
    try {
        await renderNotionPendingPage(res);
    } catch (error) {
        console.error('❌ Error cargando pendientes de Notion:', error);
        res.status(500).render('error', { error: 'Error cargando los pendientes de Notion' });
    }
});

app.get('/notion-table', requireAdmin, async (req, res) => {
    try {
        await renderNotionViewedPage(req, res);
    } catch (error) {
        console.error('❌ Error cargando tabla de Notion vista:', error);
        res.status(500).render('error', { error: 'Error cargando la tabla de items vistos de Notion' });
    }
});

app.get('/notion-pending/api/items', requireAdmin, async (req, res) => {
    try {
        const notionItems = await fetchNotionPendientes();
        const tagConfig = await resolveNotionTagConfig();
        res.json({ success: true, items: notionItems, availableTags: tagConfig.availableTags || [] });
    } catch (error) {
        console.error('❌ Error API Notion pending:', error);
        res.status(500).json({ success: false, error: 'Error cargando datos de Notion' });
    }
});

app.post('/notion-pending/:id/mark-viewed', requireAdmin, async (req, res) => {
    try {
        const extraTags = parseTagsInput(req.body.tags);
        await markNotionItemAsViewed(req.params.id, extraTags);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marcando item de Notion como visto:', error);
        res.status(500).json({ success: false, error: error.message || 'No se pudo actualizar el item de Notion.' });
    }
});

// ========== NOTION INTEGRATION ==========
async function resolveNotionDataSourceId() {
    if (resolvedNotionDataSourceId) {
        return resolvedNotionDataSourceId;
    }

    if (!NOTION_TABLE && !NOTION_PAGE_ID) {
        throw new Error('Falta configurar NOTION_TABLE o NOTION_DATA_SOURCE_ID en el entorno.');
    }

    const response = await notion.search({
        page_size: 100,
        filter: { property: 'object', value: 'data_source' }
    });

    const targetPageId = normalizeNotionId(NOTION_PAGE_ID || NOTION_TABLE);
    const match = response.results.find((entry) => {
        const entryId = normalizeNotionId(entry.id);
        const entryUrlId = normalizeNotionId(entry.url);
        return entryId === targetPageId || entryUrlId === targetPageId;
    });

    if (!match) {
        throw new Error(
            `No se pudo resolver el data source de Notion para ${NOTION_TABLE}. ` +
            'Comparte esa base de datos con la integración o configura NOTION_DATA_SOURCE_ID explícitamente.'
        );
    }

    resolvedNotionDataSourceId = match.id;
    console.log(`✅ Notion data source resuelto: ${resolvedNotionDataSourceId}`);
    return resolvedNotionDataSourceId;
}

async function resolveNotionSchema() {
    if (resolvedNotionSchema) {
        return resolvedNotionSchema;
    }

    const notionDataSourceId = await resolveNotionDataSourceId();
    const dataSource = await notion.dataSources.retrieve({
        data_source_id: notionDataSourceId
    });
    const properties = dataSource.properties || {};
    const schema = {
        properties,
        pendingFilter: { property: null, filter: null },
        tagConfig: {
            property: null,
            availableTags: [],
            pendingTagName: 'Pendiente',
            viewedTagName: 'Visto'
        }
    };

    for (const property of Object.values(properties)) {
        if (!schema.pendingFilter.filter && property.type === 'status' && property.status?.options?.some((option) => isPendingNotionValue(option.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: {
                    property: property.name,
                    status: {
                        equals: property.status.options.find((option) => isPendingNotionValue(option.name)).name
                    }
                }
            };
        }

        if (!schema.pendingFilter.filter && property.type === 'select' && property.select?.options?.some((option) => isPendingNotionValue(option.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: {
                    property: property.name,
                    select: {
                        equals: property.select.options.find((option) => isPendingNotionValue(option.name)).name
                    }
                }
            };
        }

        if (!schema.pendingFilter.filter && property.type === 'multi_select' && property.multi_select?.options?.some((option) => isPendingNotionValue(option.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: {
                    property: property.name,
                    multi_select: {
                        contains: property.multi_select.options.find((option) => isPendingNotionValue(option.name)).name
                    }
                }
            };
        }

        if (property.type === 'multi_select') {
            const optionNames = (property.multi_select?.options || []).map((option) => option.name);
            const hasPendingOption = optionNames.some((option) => isPendingNotionValue(option));
            const hasViewedOption = optionNames.some((option) => isViewedNotionValue(option));
            const looksLikeTagsProperty = normalizeNotionText(property.name).includes('tag') || normalizeNotionText(property.name).includes('etiqueta');

            if (!schema.tagConfig.property && (hasPendingOption || hasViewedOption || looksLikeTagsProperty)) {
                const matchedPendingTag = optionNames.find((option) => isPendingNotionValue(option));
                const matchedViewedTag = optionNames.find((option) => isViewedNotionValue(option));
                schema.tagConfig = {
                    property: property.name,
                    availableTags: optionNames,
                    pendingTagName: matchedPendingTag || schema.tagConfig.pendingTagName,
                    viewedTagName: matchedViewedTag || schema.tagConfig.viewedTagName
                };
            }
        }
    }

    resolvedNotionSchema = schema;
    resolvedNotionPendingFilter = schema.pendingFilter;
    return resolvedNotionSchema;
}

function normalizeNotionText(value) {
    return String(value || '').trim().toLowerCase();
}

function isPendingNotionValue(value) {
    return PENDING_NOTION_VALUES.includes(normalizeNotionText(value));
}

function isViewedNotionValue(value) {
    return VIEWED_NOTION_VALUES.includes(normalizeNotionText(value));
}

async function resolveNotionPendingFilter() {
    if (resolvedNotionPendingFilter) {
        return resolvedNotionPendingFilter;
    }

    const schema = await resolveNotionSchema();
    resolvedNotionPendingFilter = schema.pendingFilter || { property: null, filter: null };
    return resolvedNotionPendingFilter;
}

async function resolveNotionTagConfig() {
    const schema = await resolveNotionSchema();
    return schema.tagConfig || {
        property: null,
        availableTags: [],
        pendingTagName: 'Pendiente',
        viewedTagName: 'Visto'
    };
}

async function fetchNotionPendientes() {
    try {
        const notionDataSourceId = await resolveNotionDataSourceId();
        const pendingFilterConfig = await resolveNotionPendingFilter();
        const allResults = [];
        let hasMore = true;
        let startCursor = undefined;

        while (hasMore) {
            const queryPayload = {
                data_source_id: notionDataSourceId,
                start_cursor: startCursor
            };

            if (pendingFilterConfig.filter) {
                queryPayload.filter = pendingFilterConfig.filter;
            }

            const response = await notion.dataSources.query(queryPayload);
            allResults.push(...response.results);
            hasMore = response.has_more;
            startCursor = response.next_cursor;
        }

        const parsed = allResults.map(page => parseNotionPage(page));
        return pendingFilterConfig.filter
            ? parsed
            : parsed.filter((item) => item.isPending);
    } catch (error) {
        // Si el filtro falla (por tipos de propiedad), intentar sin filtro y filtrar manualmente
        console.warn('⚠️ Filtro de Notion falló, intentando sin filtro:', error.message);
        try {
            const notionDataSourceId = await resolveNotionDataSourceId();
            const allResults = [];
            let hasMore = true;
            let startCursor = undefined;

            while (hasMore) {
                const response = await notion.dataSources.query({
                    data_source_id: notionDataSourceId,
                    start_cursor: startCursor,
                });
                allResults.push(...response.results);
                hasMore = response.has_more;
                startCursor = response.next_cursor;
            }

            // Filtrar manualmente los pendientes
            const parsed = allResults.map(page => parseNotionPage(page));
            return parsed.filter((item) => item.isPending);
        } catch (fallbackError) {
            console.error('❌ Error consultando Notion:', fallbackError);
            return [];
        }
    }
}

async function fetchNotionVistos() {
    try {
        const notionDataSourceId = await resolveNotionDataSourceId();
        const tagConfig = await resolveNotionTagConfig();
        const allResults = [];
        let hasMore = true;
        let startCursor = undefined;

        while (hasMore) {
            const queryPayload = {
                data_source_id: notionDataSourceId,
                start_cursor: startCursor
            };

            if (tagConfig.property) {
                queryPayload.filter = {
                    property: tagConfig.property,
                    multi_select: {
                        contains: tagConfig.viewedTagName || 'Visto'
                    }
                };
            }

            const response = await notion.dataSources.query(queryPayload);
            allResults.push(...response.results);
            hasMore = response.has_more;
            startCursor = response.next_cursor;
        }

        const parsed = allResults.map((page) => parseNotionPage(page));
        return tagConfig.property
            ? parsed.filter((item) => (item.tags || []).some((tag) => isViewedNotionValue(tag)))
            : parsed.filter((item) => (item.tags || []).some((tag) => isViewedNotionValue(tag)));
    } catch (error) {
        console.warn('⚠️ Filtro de Notion para vistos falló, intentando sin filtro:', error.message);
        try {
            const notionDataSourceId = await resolveNotionDataSourceId();
            const allResults = [];
            let hasMore = true;
            let startCursor = undefined;

            while (hasMore) {
                const response = await notion.dataSources.query({
                    data_source_id: notionDataSourceId,
                    start_cursor: startCursor
                });
                allResults.push(...response.results);
                hasMore = response.has_more;
                startCursor = response.next_cursor;
            }

            return allResults
                .map((page) => parseNotionPage(page))
                .filter((item) => (item.tags || []).some((tag) => isViewedNotionValue(tag)));
        } catch (fallbackError) {
            console.error('❌ Error consultando items vistos de Notion:', fallbackError);
            return [];
        }
    }
}

async function markNotionItemAsViewed(pageId, extraTags = []) {
    const tagConfig = await resolveNotionTagConfig();

    if (!tagConfig.property) {
        throw new Error('No se encontró una propiedad de etiquetas compatible en Notion.');
    }

    const page = await notion.pages.retrieve({ page_id: pageId });
    const tagProperty = page.properties?.[tagConfig.property];
    const currentTags = tagProperty?.type === 'multi_select'
        ? tagProperty.multi_select.map((entry) => entry.name)
        : [];

    const canonicalTagNames = new Map(
        (tagConfig.availableTags || []).map((tagName) => [normalizeNotionText(tagName), tagName])
    );

    const mergedTags = [...currentTags, ...extraTags]
        .map((tagName) => String(tagName || '').trim())
        .filter(Boolean)
        .filter((tagName) => !isPendingNotionValue(tagName));

    mergedTags.push(tagConfig.viewedTagName || 'Visto');

    const finalTags = Array.from(new Map(
        mergedTags.map((tagName) => {
            const normalized = normalizeNotionText(tagName);
            return [normalized, canonicalTagNames.get(normalized) || tagName];
        })
    ).values());

    await notion.pages.update({
        page_id: pageId,
        properties: {
            [tagConfig.property]: {
                multi_select: finalTags.map((tagName) => ({ name: tagName }))
            }
        }
    });

    resolvedNotionSchema = null;
    resolvedNotionPendingFilter = null;
}

function parseNotionPage(page) {
    const props = page.properties || {};
    const item = {
        id: page.id,
        url: page.url,
        createdTime: page.created_time,
        lastEdited: page.last_edited_time,
        status: '',
        isPending: false,
        title: '',
        tags: [],
        sourceUrl: '',
        properties: {}
    };

    for (const [key, prop] of Object.entries(props)) {
        const value = extractNotionValue(prop);
        item.properties[key] = value;

        // Detectar título
        if (prop.type === 'title') {
            item.title = value;
        }

        if (!item.status && (prop.type === 'status' || prop.type === 'select') && value) {
            item.status = value;
        }

        if (!item.status && prop.type === 'multi_select' && typeof value === 'string') {
            const values = value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean);
            const pendingTag = values.find((entry) => isPendingNotionValue(entry));
            if (pendingTag) {
                item.status = pendingTag;
            }
            item.tags = values;
        }

        if (prop.type === 'status' || prop.type === 'select') {
            item.isPending = item.isPending || isPendingNotionValue(value);
        }

        if (prop.type === 'multi_select' && typeof value === 'string') {
            const values = value.split(',').map((entry) => entry.trim());
            item.isPending = item.isPending || values.some((entry) => isPendingNotionValue(entry));
            if (!item.status) {
                const viewedTag = values.find((entry) => isViewedNotionValue(entry));
                if (viewedTag) {
                    item.status = viewedTag;
                }
            }
        }

        if (!item.sourceUrl && prop.type === 'url' && value) {
            item.sourceUrl = value;
        }
    }

    if (!item.status && item.isPending) {
        item.status = 'Pendiente';
    }

    return item;
}

function extractNotionValue(prop) {
    switch (prop.type) {
        case 'title':
            return (prop.title || []).map(t => t.plain_text).join('');
        case 'rich_text':
            return (prop.rich_text || []).map(t => t.plain_text).join('');
        case 'number':
            return prop.number;
        case 'select':
            return prop.select ? prop.select.name : '';
        case 'multi_select':
            return (prop.multi_select || []).map(s => s.name).join(', ');
        case 'status':
            return prop.status ? prop.status.name : '';
        case 'date':
            return prop.date ? prop.date.start : '';
        case 'checkbox':
            return prop.checkbox;
        case 'url':
            return prop.url || '';
        case 'email':
            return prop.email || '';
        case 'phone_number':
            return prop.phone_number || '';
        case 'formula':
            if (prop.formula) {
                return prop.formula.string || prop.formula.number || prop.formula.boolean || '';
            }
            return '';
        case 'relation':
            return (prop.relation || []).map(r => r.id).join(', ');
        case 'people':
            return (prop.people || []).map(p => p.name || p.id).join(', ');
        case 'created_time':
            return prop.created_time || '';
        case 'last_edited_time':
            return prop.last_edited_time || '';
        default:
            return '';
    }
}

connectDB().then(async () => {
    // Seed admin user if none exists
    try {
        const adminExists = await usersCollection.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await usersCollection.insertOne({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date()
            });
            console.log('✅ Usuario admin creado (usuario: admin, contraseña: admin123)');
        }
    } catch (e) {
        console.error('⚠️ Error creando usuario admin:', e.message);
    }

    app.listen(port, () => {
        console.log(`🚀Servidor corriendo en http://localhost:${port}`);
    });
});