const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API });
const NOTION_TABLE = process.env.NOTION_TABLE || '';
const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || '';

const PENDING_NOTION_VALUES = ['not started', 'pendiente', 'por hacer', 'to do'];
const VIEWED_NOTION_VALUES = ['visto', 'seen', 'read', 'done', 'completed'];

let resolvedNotionDataSourceId = NOTION_DATA_SOURCE_ID;
let resolvedNotionPendingFilter = null;
let resolvedNotionSchema = null;

// ---- Helpers ----

function extractNotionId(value) {
    if (!value) return '';
    const cleanValue = String(value).trim();
    const hyphenatedMatch = cleanValue.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (hyphenatedMatch) return hyphenatedMatch[0].toLowerCase();
    const compactMatch = cleanValue.match(/[a-f0-9]{32}/i);
    if (!compactMatch) return '';
    const c = compactMatch[0].toLowerCase();
    return `${c.slice(0,8)}-${c.slice(8,12)}-${c.slice(12,16)}-${c.slice(16,20)}-${c.slice(20)}`;
}

function normalizeNotionId(value) {
    return extractNotionId(value).replace(/-/g, '');
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

function parseTagsInput(value) {
    const rawTags = Array.isArray(value) ? value : [value];
    const normalizedTags = rawTags
        .flatMap((entry) => String(entry || '').split(','))
        .map((entry) => entry.trim())
        .filter(Boolean);
    return Array.from(new Map(normalizedTags.map((entry) => [normalizeNotionText(entry), entry])).values());
}

const NOTION_PAGE_ID = extractNotionId(NOTION_TABLE);

// ---- Schema resolution ----

async function resolveNotionDataSourceId() {
    if (resolvedNotionDataSourceId) return resolvedNotionDataSourceId;
    if (!NOTION_TABLE && !NOTION_PAGE_ID) {
        throw new Error('Falta configurar NOTION_TABLE o NOTION_DATA_SOURCE_ID en el entorno.');
    }

    const response = await notion.search({ page_size: 100, filter: { property: 'object', value: 'data_source' } });
    const targetPageId = normalizeNotionId(NOTION_PAGE_ID || NOTION_TABLE);
    const match = response.results.find((entry) => {
        return normalizeNotionId(entry.id) === targetPageId || normalizeNotionId(entry.url) === targetPageId;
    });

    if (!match) {
        throw new Error(
            `No se pudo resolver el data source de Notion para ${NOTION_TABLE}. ` +
            'Comparte esa base de datos con la integración o configura NOTION_DATA_SOURCE_ID.'
        );
    }

    resolvedNotionDataSourceId = match.id;
    console.log(`✅ Notion data source resuelto: ${resolvedNotionDataSourceId}`);
    return resolvedNotionDataSourceId;
}

async function resolveNotionSchema() {
    if (resolvedNotionSchema) return resolvedNotionSchema;

    const notionDataSourceId = await resolveNotionDataSourceId();
    const dataSource = await notion.dataSources.retrieve({ data_source_id: notionDataSourceId });
    const properties = dataSource.properties || {};
    const schema = {
        properties,
        pendingFilter: { property: null, filter: null },
        tagConfig: { property: null, availableTags: [], pendingTagName: 'Pendiente', viewedTagName: 'Visto' }
    };

    for (const property of Object.values(properties)) {
        if (!schema.pendingFilter.filter && property.type === 'status' && property.status?.options?.some((o) => isPendingNotionValue(o.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: { property: property.name, status: { equals: property.status.options.find((o) => isPendingNotionValue(o.name)).name } }
            };
        }

        if (!schema.pendingFilter.filter && property.type === 'select' && property.select?.options?.some((o) => isPendingNotionValue(o.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: { property: property.name, select: { equals: property.select.options.find((o) => isPendingNotionValue(o.name)).name } }
            };
        }

        if (!schema.pendingFilter.filter && property.type === 'multi_select' && property.multi_select?.options?.some((o) => isPendingNotionValue(o.name))) {
            schema.pendingFilter = {
                property: property.name,
                filter: { property: property.name, multi_select: { contains: property.multi_select.options.find((o) => isPendingNotionValue(o.name)).name } }
            };
        }

        if (property.type === 'multi_select') {
            const optionNames = (property.multi_select?.options || []).map((o) => o.name);
            const hasPending = optionNames.some((o) => isPendingNotionValue(o));
            const hasViewed = optionNames.some((o) => isViewedNotionValue(o));
            const looksLikeTags = normalizeNotionText(property.name).includes('tag') || normalizeNotionText(property.name).includes('etiqueta');

            if (!schema.tagConfig.property && (hasPending || hasViewed || looksLikeTags)) {
                schema.tagConfig = {
                    property: property.name,
                    availableTags: optionNames,
                    pendingTagName: optionNames.find((o) => isPendingNotionValue(o)) || 'Pendiente',
                    viewedTagName: optionNames.find((o) => isViewedNotionValue(o)) || 'Visto'
                };
            }
        }
    }

    resolvedNotionSchema = schema;
    resolvedNotionPendingFilter = schema.pendingFilter;
    return resolvedNotionSchema;
}

async function resolveNotionPendingFilter() {
    if (resolvedNotionPendingFilter) return resolvedNotionPendingFilter;
    const schema = await resolveNotionSchema();
    resolvedNotionPendingFilter = schema.pendingFilter || { property: null, filter: null };
    return resolvedNotionPendingFilter;
}

async function resolveNotionTagConfig() {
    const schema = await resolveNotionSchema();
    return schema.tagConfig || { property: null, availableTags: [], pendingTagName: 'Pendiente', viewedTagName: 'Visto' };
}

// ---- Data fetching ----

async function fetchAllPages(queryPayload) {
    const allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const response = await notion.dataSources.query({ ...queryPayload, start_cursor: startCursor });
        allResults.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor;
    }

    return allResults;
}

async function fetchNotionPendientes() {
    try {
        const notionDataSourceId = await resolveNotionDataSourceId();
        const pendingFilterConfig = await resolveNotionPendingFilter();
        const queryPayload = { data_source_id: notionDataSourceId };
        if (pendingFilterConfig.filter) queryPayload.filter = pendingFilterConfig.filter;

        const allResults = await fetchAllPages(queryPayload);
        const parsed = allResults.map(parseNotionPage);
        return pendingFilterConfig.filter ? parsed : parsed.filter((item) => item.isPending);
    } catch (error) {
        console.warn('⚠️ Filtro de Notion falló, intentando sin filtro:', error.message);
        try {
            const notionDataSourceId = await resolveNotionDataSourceId();
            const allResults = await fetchAllPages({ data_source_id: notionDataSourceId });
            return allResults.map(parseNotionPage).filter((item) => item.isPending);
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
        const queryPayload = { data_source_id: notionDataSourceId };

        if (tagConfig.property) {
            queryPayload.filter = {
                property: tagConfig.property,
                multi_select: { contains: tagConfig.viewedTagName || 'Visto' }
            };
        }

        const allResults = await fetchAllPages(queryPayload);
        return allResults.map(parseNotionPage).filter((item) => (item.tags || []).some((tag) => isViewedNotionValue(tag)));
    } catch (error) {
        console.warn('⚠️ Filtro de Notion para vistos falló, intentando sin filtro:', error.message);
        try {
            const notionDataSourceId = await resolveNotionDataSourceId();
            const allResults = await fetchAllPages({ data_source_id: notionDataSourceId });
            return allResults.map(parseNotionPage).filter((item) => (item.tags || []).some((tag) => isViewedNotionValue(tag)));
        } catch (fallbackError) {
            console.error('❌ Error consultando items vistos de Notion:', fallbackError);
            return [];
        }
    }
}

async function mergeNotionItemTags(pageId, extraTags = [], options = {}) {
    const tagConfig = await resolveNotionTagConfig();
    if (!tagConfig.property) throw new Error('No se encontró una propiedad de etiquetas compatible en Notion.');

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
        .filter((tagName) => !(options.removePending && isPendingNotionValue(tagName)));

    if (options.ensureViewed) {
        mergedTags.push(tagConfig.viewedTagName || 'Visto');
    }

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

async function markNotionItemAsViewed(pageId, extraTags = []) {
    await mergeNotionItemTags(pageId, extraTags, { ensureViewed: true, removePending: true });
}

// ---- Page parsing ----

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

        if (prop.type === 'title') item.title = value;

        if (!item.status && (prop.type === 'status' || prop.type === 'select') && value) {
            item.status = value;
        }

        if (!item.status && prop.type === 'multi_select' && typeof value === 'string') {
            const values = value.split(',').map((e) => e.trim()).filter(Boolean);
            const pendingTag = values.find((e) => isPendingNotionValue(e));
            if (pendingTag) item.status = pendingTag;
            item.tags = values;
        }

        if (prop.type === 'status' || prop.type === 'select') {
            item.isPending = item.isPending || isPendingNotionValue(value);
        }

        if (prop.type === 'multi_select' && typeof value === 'string') {
            const values = value.split(',').map((e) => e.trim());
            item.isPending = item.isPending || values.some((e) => isPendingNotionValue(e));
            if (!item.status) {
                const viewedTag = values.find((e) => isViewedNotionValue(e));
                if (viewedTag) item.status = viewedTag;
            }
        }

        if (!item.sourceUrl && prop.type === 'url' && value) {
            item.sourceUrl = value;
        }
    }

    if (!item.status && item.isPending) item.status = 'Pendiente';
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
            if (prop.formula) return prop.formula.string || prop.formula.number || prop.formula.boolean || '';
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

module.exports = {
    normalizeNotionText,
    parseTagsInput,
    fetchNotionPendientes,
    fetchNotionVistos,
    mergeNotionItemTags,
    markNotionItemAsViewed,
    resolveNotionTagConfig,
};
