const cron = require('node-cron');
const { runDuplicateReport } = require('./duplicateReport');
const { runUntaggedReport } = require('./untaggedReport');
const { runScrapeAnalyze } = require('./scrapeAnalyze');
const { appLogger, createTaskLogger } = require('../logger');

const TASK_REGISTRY = {
    duplicateUrls: {
        id: 'duplicateUrls',
        name: 'URLs duplicadas en pendientes',
        description: 'Agrupa artículos de la colección pendientes por URL y reporta por Telegram si hay duplicados exactos.',
        schedule: '30 10 * * 0',
        scheduleLabel: 'Domingos a las 10:30',
        timezone: 'Europe/Madrid',
        lastRun: null,
        lastStatus: null,
        lastMessage: null,
        lastResult: null,
        run: async () => {
            const dups = await runDuplicateReport();
            return dups;
        },
    },
    untaggedLinks: {
        id: 'untaggedLinks',
        name: 'Links sin etiqueta',
        description: 'Lista los links guardados en la colección "links" que no tienen ninguna etiqueta asignada y los reporta por Telegram.',
        schedule: '0 11 * * 0',
        scheduleLabel: 'Domingos a las 11:00',
        timezone: 'Europe/Madrid',
        lastRun: null,
        lastStatus: null,
        lastMessage: null,
        lastResult: null,
        run: async () => {
            const result = await runUntaggedReport();
            return result;
        },
    },
    scrapeAnalyze: {
        id: 'scrapeAnalyze',
        name: 'Scraping y análisis LLM',
        description: 'Accede a los artículos pendientes sin analizar, extrae su contenido mediante scraping y lo pasa por el LLM local configurado para generar un análisis automático.',
        schedule: '0 9 * * *',
        scheduleLabel: 'Diario a las 09:00',
        timezone: 'Europe/Madrid',
        lastRun: null,
        lastStatus: null,
        lastMessage: null,
        lastResult: null,
        run: async () => {
            const result = await runScrapeAnalyze();
            return result;
        },
    },
};

function summarizeTaskResult(taskId, result) {
    if (!result || typeof result !== 'object') {
        return 'Completada correctamente';
    }

    if (taskId === 'duplicateUrls') {
        return `${result.duplicateGroups || 0} URL duplicadas, ${result.removableItems || 0} elemento(s) eliminable(s)`;
    }

    if (taskId === 'untaggedLinks') {
        return `${result.count || 0} link(s) sin etiqueta`;
    }

    if (taskId === 'scrapeAnalyze') {
        return `${result.analyzed || 0}/${result.total || 0} analizados, ${result.errors || 0} error(es)`;
    }

    return 'Completada correctamente';
}

async function executeTask(task) {
    const log = createTaskLogger(task.id);
    task.lastRun = new Date();
    task.lastStatus = 'running';
    task.lastMessage = null;
    task.lastResult = null;
    appLogger.info(`Iniciando tarea programada: ${task.name} (${task.id})`);
    log.separator(`INICIO — ${task.name}`);
    log.info(`Tarea iniciada. Horario: ${task.scheduleLabel}`);
    try {
        const result = await task.run();
        task.lastStatus = 'ok';
        task.lastResult = result || null;
        task.lastMessage = summarizeTaskResult(task.id, result);
        const summary = result ? JSON.stringify(result) : '(sin resultado)';
        log.info(`Tarea completada con éxito. Resultado: ${summary}`);
        log.separator('FIN OK');
        appLogger.info(`Tarea "${task.name}" completada correctamente. ${summary}`);
    } catch (err) {
        task.lastStatus = 'error';
        task.lastMessage = err.message || 'Error desconocido';
        log.error(`Tarea fallida: ${err.message}`);
        if (err.stack) log.detail(`Stack: ${err.stack}`);
        log.separator('FIN ERROR');
        appLogger.error(`Tarea "${task.name}" falló: ${err.message}`);
    }
}

function initScheduler() {
    for (const task of Object.values(TASK_REGISTRY)) {
        cron.schedule(task.schedule, async () => {
            appLogger.info(`⏰ Cron disparado: ${task.name}`);
            await executeTask(task);
        }, { timezone: task.timezone });
    }

    appLogger.info(`Scheduler inicializado — ${Object.keys(TASK_REGISTRY).length} tarea(s) registradas`);
    console.log(`✅ Scheduler inicializado — ${Object.keys(TASK_REGISTRY).length} tarea(s) registradas`);
}

function getTaskRegistry() {
    return Object.values(TASK_REGISTRY).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        scheduleLabel: t.scheduleLabel,
        schedule: t.schedule,
        timezone: t.timezone,
        lastRun: t.lastRun,
        lastStatus: t.lastStatus,
        lastMessage: t.lastMessage,
        lastResult: t.lastResult,
    }));
}

function updateTaskState(id, updates = {}) {
    const task = TASK_REGISTRY[id];
    if (!task) throw new Error(`Tarea desconocida: ${id}`);
    Object.assign(task, updates);
}

async function runTaskById(id) {
    const task = TASK_REGISTRY[id];
    if (!task) throw new Error(`Tarea desconocida: ${id}`);
    await executeTask(task);
}

module.exports = { initScheduler, getTaskRegistry, runTaskById, updateTaskState };
