const { getCollection, getLinksCollection, getProposalsCollection } = require('../db');
const { createTaskLogger } = require('../logger');

// ---------------------------------------------------------------------------
// Tag similarity helpers
// ---------------------------------------------------------------------------

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) {
        dp[i] = [i];
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                i === 0
                    ? j
                    : a[i - 1] === b[j - 1]
                      ? dp[i - 1][j - 1]
                      : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Returns true when two distinct tags are candidates for merging.
 * Rules (case-insensitive):
 *   1. One tag equals the other plus a common suffix (s, es, ies, ing, ed, er, ers, d, r).
 *   2. -y → -ies pluralisation (e.g. "category" → "categories").
 *   3. Drop trailing -e + "ing" (e.g. "write" → "writing").
 *   4. Levenshtein distance = 1 for tags ≥ 6 chars (catches typos and slight variants).
 */
function areSimilar(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a === b) return false;
    const la = a.toLowerCase();
    const lb = b.toLowerCase();
    if (la === lb) return false;

    const [shorter, longer] = la.length <= lb.length ? [la, lb] : [lb, la];

    const simpleSuffixes = ['s', 'es', 'ing', 'ed', 'er', 'ers', 'd', 'r'];
    for (const suf of simpleSuffixes) {
        if (longer === shorter + suf) return true;
    }

    // -y → -ies: "category" → "categories"
    if (shorter.endsWith('y') && longer === shorter.slice(0, -1) + 'ies') return true;

    // -e + "ing": "write" → "writing", "use" → "using"
    if (shorter.endsWith('e') && longer === shorter.slice(0, -1) + 'ing') return true;

    // Levenshtein distance = 1 for longer tags (avoids false positives on short words)
    if (shorter.length >= 6 && levenshtein(la, lb) === 1) return true;

    return false;
}

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

/**
 * Returns a Map<tag, { pendientes: number, links: number }> with counts across both collections.
 */
async function getAllTagCounts() {
    const [pendientesAgg, linksAgg] = await Promise.all([
        getCollection()
            .aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }])
            .toArray(),
        getLinksCollection()
            .aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }])
            .toArray(),
    ]);

    const tagMap = new Map();
    for (const { _id: tag, count } of pendientesAgg) {
        if (!tag || typeof tag !== 'string') continue;
        if (!tagMap.has(tag)) tagMap.set(tag, { pendientes: 0, links: 0 });
        tagMap.get(tag).pendientes = count;
    }
    for (const { _id: tag, count } of linksAgg) {
        if (!tag || typeof tag !== 'string') continue;
        if (!tagMap.has(tag)) tagMap.set(tag, { pendientes: 0, links: 0 });
        tagMap.get(tag).links = count;
    }
    return tagMap;
}

/**
 * Builds the list of candidate merge pairs from a tag map.
 * keepTag = the more popular tag (kept); dropTag = the less popular one (merged into keepTag).
 */
function buildCandidates(tagMap) {
    const tags = [...tagMap.keys()];
    const candidates = [];
    const seen = new Set();

    for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
            const a = tags[i];
            const b = tags[j];
            if (!areSimilar(a, b)) continue;

            const key = [a, b].sort().join('\x00');
            if (seen.has(key)) continue;
            seen.add(key);

            const ca = (tagMap.get(a).pendientes || 0) + (tagMap.get(a).links || 0);
            const cb = (tagMap.get(b).pendientes || 0) + (tagMap.get(b).links || 0);

            // keepTag = the more popular tag
            const [keepTag, dropTag] = ca >= cb ? [a, b] : [b, a];
            const kc = tagMap.get(keepTag);
            const dc = tagMap.get(dropTag);

            candidates.push({
                keepTag,
                dropTag,
                keepPendientes: kc.pendientes,
                keepLinks: kc.links,
                dropPendientes: dc.pendientes,
                dropLinks: dc.links,
            });
        }
    }
    return candidates;
}

/**
 * Filters out pairs that already have an open (pending) proposal in the DB.
 */
async function filterNewCandidates(candidates) {
    const proposals = getProposalsCollection();
    const newCandidates = [];
    for (const c of candidates) {
        const existing = await proposals.findOne({
            $or: [
                { keepTag: c.keepTag, dropTag: c.dropTag },
                { keepTag: c.dropTag, dropTag: c.keepTag },
            ],
            status: 'pending',
        });
        if (!existing) newCandidates.push(c);
    }
    return newCandidates;
}

// ---------------------------------------------------------------------------
// Telegram notification
// ---------------------------------------------------------------------------

function escapeMarkdown(text) {
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function buildTelegramMessage(newProposals, totalPending) {
    if (newProposals.length === 0 && totalPending === 0) {
        return '✅ *Revisión semanal de etiquetas*\n\nNo se encontraron etiquetas similares para combinar\\.';
    }

    const lines = ['⚠️ *Revisión semanal — Etiquetas similares*\n'];

    if (newProposals.length > 0) {
        lines.push(
            `Se detectaron *${newProposals.length}* nueva${newProposals.length === 1 ? '' : 's'} sugerencia${newProposals.length === 1 ? '' : 's'} de fusión:\n`,
        );
        const preview = newProposals.slice(0, 15);
        preview.forEach((p, i) => {
            const keep = escapeMarkdown(p.keepTag);
            const drop = escapeMarkdown(p.dropTag);
            const total = p.keepPendientes + p.keepLinks + p.dropPendientes + p.dropLinks;
            lines.push(`${i + 1}\\. \`${drop}\` → \`${keep}\` \\(${total} doc${total === 1 ? '' : 's'}\\)`);
        });
        if (newProposals.length > 15) {
            lines.push(`_\\.\\.\\. y ${newProposals.length - 15} más_`);
        }
    }

    if (totalPending > 0) {
        lines.push(`\n📋 Pendiente de revisión: *${totalPending}* propuesta${totalPending === 1 ? '' : 's'}`);
    }

    lines.push('\nRevisa y aprueba en el panel: *Admin → Fusión de etiquetas*');
    return lines.join('\n');
}

async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.warn('⚠️ TELEGRAM_TOKEN o TELEGRAM_CHAT_ID no configurados — omitiendo notificación.');
        return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'MarkdownV2' }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Telegram API error ${response.status}: ${body}`);
    }
}

// ---------------------------------------------------------------------------
// Main task entry point
// ---------------------------------------------------------------------------

async function runTagMergeProposals() {
    const log = createTaskLogger('tagMergeProposals');
    log.separator('INICIO TAREA — Propuestas de fusión de etiquetas similares');

    log.info('Recopilando conteos de etiquetas en "pendientes" y "links"...');
    const tagMap = await getAllTagCounts();
    log.info(`Total etiquetas únicas encontradas: ${tagMap.size}`);

    const candidates = buildCandidates(tagMap);
    log.info(`Pares similares detectados: ${candidates.length}`);

    const newCandidates = await filterNewCandidates(candidates);
    log.info(`Nuevas propuestas a insertar: ${newCandidates.length}`);

    if (newCandidates.length > 0) {
        await getProposalsCollection().insertMany(
            newCandidates.map((c) => ({ ...c, status: 'pending', createdAt: new Date() })),
        );
        log.info(`${newCandidates.length} propuesta(s) insertada(s) en la base de datos.`);
        newCandidates.forEach((p) => {
            log.detail(`  "${p.dropTag}" → "${p.keepTag}"  (pendientes: ${p.dropPendientes}+${p.keepPendientes}, links: ${p.dropLinks}+${p.keepLinks})`);
        });
    }

    const totalPending = await getProposalsCollection().countDocuments({ status: 'pending' });
    log.info(`Total propuestas pendientes de revisión: ${totalPending}`);

    const message = buildTelegramMessage(newCandidates, totalPending);
    if (newCandidates.length > 0 || totalPending > 0) {
        log.info('Enviando notificación por Telegram...');
        await sendTelegramMessage(message);
        log.info('Notificación enviada correctamente.');
    } else {
        log.info('Sin novedades — omitiendo notificación Telegram.');
    }

    log.separator('FIN TAREA OK');
    return { newProposals: newCandidates.length, totalPending };
}

module.exports = { runTagMergeProposals };
