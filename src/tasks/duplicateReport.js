const { getCollection } = require('../db');
const { createTaskLogger } = require('../logger');

async function findDuplicateUrls() {
    const collection = getCollection();
    const pipeline = [
        { $match: { url: { $exists: true, $ne: '' } } },
        { $sort: { url: 1, _id: 1 } },
        { $group: {
            _id: '$url',
            count: { $sum: 1 },
            titles: { $push: '$title' },
            items: {
                $push: {
                    id: { $toString: '$_id' },
                    title: '$title',
                    date: '$date',
                }
            },
        }},
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
    ];
    return collection.aggregate(pipeline).toArray();
}

function formatDuplicateGroups(duplicates) {
    return duplicates.map((dup) => {
        const items = Array.isArray(dup.items) ? dup.items : [];
        const keepItem = items[0] || null;
        const deleteItems = items.slice(1);

        return {
            url: dup._id,
            count: dup.count,
            keepItem,
            deleteItems,
            deleteCount: deleteItems.length,
        };
    });
}

function buildTelegramMessage(duplicates) {
    const groups = formatDuplicateGroups(duplicates);

    if (!groups.length) {
        return '✅ *Revisión semanal completada*\n\nNo se encontraron URLs duplicadas en la lista de pendientes.';
    }

    const lines = [
        `⚠️ *Revisión semanal de URLs duplicadas*\n`,
        `Se encontraron *${groups.length}* URL${groups.length === 1 ? '' : 's'} repetida${groups.length === 1 ? '' : 's'}:\n`,
    ];

    groups.forEach((dup, index) => {
        const url = String(dup.url || '').slice(0, 80);
        lines.push(`${index + 1}\\. \`${url}\``);
        lines.push(`   📄 Aparece *${dup.count}* veces:`);
        [dup.keepItem, ...(dup.deleteItems || [])].forEach((item) => {
            const title = item?.title;
            lines.push(`   \\- ${String(title || 'Sin título').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}`);
        });
        lines.push('');
    });

    return lines.join('\n');
}

async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('⚠️ TELEGRAM_TOKEN o TELEGRAM_CHAT_ID no configurados — omitiendo envío del reporte.');
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

    console.log('✅ Reporte de duplicados enviado por Telegram');
}

async function runDuplicateReport() {
    const log = createTaskLogger('duplicateUrls');
    log.separator('INICIO TAREA — URLs duplicadas en pendientes');
    log.info('Buscando URLs duplicadas en la colección "pendientes"...');
    try {
        const duplicates = await findDuplicateUrls();
        const groups = formatDuplicateGroups(duplicates);
        log.info(`URLs duplicadas encontradas: ${groups.length}`);
        groups.forEach((dup, i) => {
            log.detail(`${i + 1}. URL: ${String(dup.url).slice(0, 100)} — aparece ${dup.count} veces`);
            [dup.keepItem, ...(dup.deleteItems || [])].forEach((item) => log.detail(`   Título: ${item?.title || 'Sin título'}`));
        });

        const message = buildTelegramMessage(duplicates);
        log.info('Enviando reporte por Telegram...');
        await sendTelegramMessage(message);
        log.info('Reporte enviado correctamente por Telegram');
        log.separator('FIN TAREA OK');
        return {
            duplicateGroups: groups.length,
            removableItems: groups.reduce((total, group) => total + group.deleteCount, 0),
            groups,
        };
    } catch (error) {
        log.error(`Error en el reporte de duplicados: ${error.message}`);
        if (error.stack) log.detail(`Stack: ${error.stack}`);
        log.separator('FIN TAREA ERROR');
        throw error;
    }
}

module.exports = { runDuplicateReport, findDuplicateUrls, formatDuplicateGroups };
