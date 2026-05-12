const { getLinksCollection } = require('../db');
const { createTaskLogger } = require('../logger');

async function findUntaggedLinks() {
    const linksCol = getLinksCollection();
    return linksCol.find(
        { $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] },
        { projection: { title: 1, sourceUrl: 1, viewedAt: 1 } }
    ).sort({ viewedAt: -1 }).toArray();
}

function buildTelegramMessage(links) {
    const escape = (s) => String(s || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

    if (!links.length) {
        return '✅ *Revisión semanal completada*\n\nTodos los links guardados tienen al menos una etiqueta asignada\\.';
    }

    const lines = [
        `🏷 *Links sin etiqueta*\n`,
        `Hay *${links.length}* link${links.length === 1 ? '' : 's'} sin etiquetar en la colección de vistos:\n`,
    ];

    links.slice(0, 30).forEach((item, index) => {
        lines.push(`${index + 1}\\. ${escape(item.title || 'Sin título')}`);
        if (item.sourceUrl) {
            lines.push(`   🔗 ${escape(item.sourceUrl.slice(0, 80))}`);
        }
        lines.push('');
    });

    if (links.length > 30) {
        lines.push(`_\\.\\.\\. y ${links.length - 30} más_`);
    }

    return lines.join('\n');
}

async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('⚠️ TELEGRAM_TOKEN o TELEGRAM_CHAT_ID no configurados — omitiendo envío del reporte de links sin etiqueta.');
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

    console.log('✅ Reporte de links sin etiqueta enviado por Telegram');
}

async function runUntaggedReport() {
    const log = createTaskLogger('untaggedLinks');
    log.separator('INICIO TAREA — Links sin etiqueta');
    log.info('Buscando links guardados sin etiquetas en la colección "links"...');
    try {
        const links = await findUntaggedLinks();
        log.info(`Links sin etiqueta encontrados: ${links.length}`);
        links.slice(0, 50).forEach((item, i) => {
            log.detail(`${i + 1}. ${item.title || 'Sin título'}`);
            if (item.sourceUrl) log.detail(`   URL: ${item.sourceUrl.slice(0, 120)}`);
        });
        if (links.length > 50) {
            log.detail(`... y ${links.length - 50} más`);
        }

        const message = buildTelegramMessage(links);
        log.info('Enviando reporte por Telegram...');
        await sendTelegramMessage(message);
        log.info('Reporte enviado correctamente por Telegram');
        log.separator('FIN TAREA OK');
        return {
            count: links.length,
            filterUrl: '/links-vistos?filter=untagged',
        };
    } catch (error) {
        log.error(`Error en el reporte de links sin etiqueta: ${error.message}`);
        if (error.stack) log.detail(`Stack: ${error.stack}`);
        log.separator('FIN TAREA ERROR');
        throw error;
    }
}

module.exports = { runUntaggedReport };
