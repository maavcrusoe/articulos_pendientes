const { ObjectId } = require('mongodb');
const { getCollection } = require('./db');

const ITEMS_PER_PAGE = parseInt(process.env.ITEMS_PER_PAGE) || 10;

// Escapa caracteres especiales de regex para evitar ReDoS / inyección
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidObjectId(id) {
    return /^[a-f0-9]{24}$/i.test(id);
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

function categorizarTags(tagsArray) {
    const categorias = {};

    Object.keys(CATEGORIAS_TEMATICAS).forEach(key => {
        categorias[key] = { ...CATEGORIAS_TEMATICAS[key], tags: [], count: 0 };
    });

    categorias.otros = { name: '📦 Otros', tags: [], count: 0 };

    tagsArray.forEach(tagObj => {
        const tagName = tagObj.name.toLowerCase();
        let found = false;

        for (const [categoriaKey, categoria] of Object.entries(CATEGORIAS_TEMATICAS)) {
            if (categoria.keywords.some(kw =>
                tagName.includes(kw.toLowerCase()) || kw.toLowerCase().includes(tagName)
            )) {
                categorias[categoriaKey].tags.push(tagObj);
                categorias[categoriaKey].count += tagObj.count;
                found = true;
                break;
            }
        }

        if (!found) {
            categorias.otros.tags.push(tagObj);
            categorias.otros.count += tagObj.count;
        }
    });

    return Object.entries(categorias)
        .filter(([, cat]) => cat.tags.length > 0)
        .sort(([, a], [, b]) => b.count - a.count);
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

    return { tags: popularTags, totalCount: Object.keys(tagCounts).length };
}

function buildAdvancedSearchQuery(searchTerm) {
    if (!searchTerm) return {};

    const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 1) {
        const escaped = escapeRegex(words[0]);
        const regex = { $regex: escaped, $options: 'i' };
        return {
            $or: [
                { title: regex },
                { content: regex },
                { url: regex },
                { tags: regex },
                { tags: { $elemMatch: { $regex: escaped, $options: 'i' } } }
            ]
        };
    }

    const wordConditions = words.map(word => {
        const escaped = escapeRegex(word);
        return {
            $or: [
                { title: { $regex: escaped, $options: 'i' } },
                { content: { $regex: escaped, $options: 'i' } },
                { url: { $regex: escaped, $options: 'i' } },
                { tags: { $regex: escaped, $options: 'i' } },
                { tags: { $elemMatch: { $regex: escaped, $options: 'i' } } }
            ]
        };
    });

    return { $and: wordConditions };
}

function buildTagMatchQuery(value) {
    const escaped = escapeRegex(value);
    return {
        $or: [
            { tags: { $regex: escaped, $options: 'i' } },
            { tags: { $elemMatch: { $regex: escaped, $options: 'i' } } }
        ]
    };
}

async function getArticleStats() {
    const collection = getCollection();
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

    const [hoyCount, ayerCount, estaSemanaCount, semanaPasadaCount, esteMesCount, topViewsCount] =
        await Promise.all([
            collection.countDocuments({ date: { $gte: hoy.toISOString() } }),
            collection.countDocuments({ date: { $gte: ayer.toISOString(), $lt: hoy.toISOString() } }),
            collection.countDocuments({ date: { $gte: inicioEstaSemana.toISOString() } }),
            collection.countDocuments({ date: { $gte: inicioSemanaPasada.toISOString(), $lte: finSemanaPasada.toISOString() } }),
            collection.countDocuments({ date: { $gte: inicioEsteMes.toISOString() } }),
            collection.countDocuments({ views: { $gt: 0 } }),
        ]);

    return {
        hoy: hoyCount,
        ayer: ayerCount,
        estaSemana: estaSemanaCount,
        semanaPasada: semanaPasadaCount,
        esteMes: esteMesCount,
        topViews: topViewsCount,
    };
}

function buildQueryString(params) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.tag) searchParams.append('tag', params.tag);
    if (params.categoria) searchParams.append('categoria', params.categoria);
    if (params.page) searchParams.append('page', params.page);
    return searchParams.toString();
}

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

module.exports = {
    ITEMS_PER_PAGE,
    CATEGORIAS_TEMATICAS,
    escapeRegex,
    isValidObjectId,
    categorizarTags,
    processTags,
    buildAdvancedSearchQuery,
    buildTagMatchQuery,
    getArticleStats,
    buildQueryString,
    normalizeUsername,
};
