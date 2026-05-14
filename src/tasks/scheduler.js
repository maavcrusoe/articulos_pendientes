const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { runDuplicateReport } = require('./duplicateReport');
const { runUntaggedReport } = require('./untaggedReport');
const { runScrapeAnalyze } = require('./scrapeAnalyze');
const { runTagMergeProposals } = require('./tagMerge');
const { appLogger, createTaskLogger } = require('../logger');

const CUSTOM_TASKS_DIR = path.join(__dirname, 'custom');

// Map of active cron job handles keyed by task id, used to stop dynamic tasks
const _cronHandles = {};

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
    tagMergeProposals: {
        id: 'tagMergeProposals',
        name: 'Propuestas de fusión de etiquetas',
        description: 'Analiza las etiquetas de "pendientes" y "links", detecta pares similares (plurales, variantes ortográficas) y crea propuestas en la BD. Notifica por Telegram y espera aprobación manual en Admin → Fusión de etiquetas.',
        schedule: '0 12 * * 0',
        scheduleLabel: 'Domingos a las 12:00',
        timezone: 'Europe/Madrid',
        lastRun: null,
        lastStatus: null,
        lastMessage: null,
        lastResult: null,
        run: async () => {
            const result = await runTagMergeProposals();
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

    if (taskId === 'tagMergeProposals') {
        return `${result.newProposals || 0} nueva(s) propuesta(s), ${result.totalPending || 0} pendiente(s) de revisión`;
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
    // Load persisted dynamic tasks first
    loadCustomTasks();

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

/**
 * Register a dynamic task from a plain JS script string.
 * The script must export a function via module.exports = async function run() { ... }
 * Returns the registered task object.
 */
function registerDynamicTask({ id, name, description, schedule, scheduleLabel, timezone, scriptBody }) {
    if (!cron.validate(schedule)) {
        throw new Error(`Expresión cron inválida: "${schedule}"`);
    }

    // Safely build a run function by writing to a temp module and require-ing it
    fs.mkdirSync(CUSTOM_TASKS_DIR, { recursive: true });
    const scriptPath = path.join(CUSTOM_TASKS_DIR, `${id}.js`);

    // Wrap the user body so it always returns something
    const wrappedScript = `// Auto-generated dynamic task: ${id}\nmodule.exports = async function run() {\n${scriptBody}\n};\n`;
    fs.writeFileSync(scriptPath, wrappedScript, 'utf8');

    // Persist task metadata alongside the script
    const metaPath = path.join(CUSTOM_TASKS_DIR, `${id}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({ id, name, description, schedule, scheduleLabel, timezone }, null, 2), 'utf8');

    // If a previous version exists, stop it
    unregisterTask(id);

    // Load the freshly written module (delete from cache first so re-register picks up changes)
    delete require.cache[require.resolve(scriptPath)];
    const runFn = require(scriptPath);

    const task = {
        id,
        name,
        description,
        schedule,
        scheduleLabel,
        timezone: timezone || 'Europe/Madrid',
        lastRun: null,
        lastStatus: null,
        lastMessage: null,
        lastResult: null,
        dynamic: true,
        run: runFn,
    };

    TASK_REGISTRY[id] = task;

    _cronHandles[id] = cron.schedule(schedule, async () => {
        appLogger.info(`⏰ Cron disparado (dinámico): ${task.name}`);
        await executeTask(task);
    }, { timezone: task.timezone });

    appLogger.info(`✅ Tarea dinámica registrada: ${id} (${scheduleLabel})`);
    return task;
}

/**
 * Stop and remove a task from the registry and cron scheduler.
 * Does NOT delete the persisted script file; use deleteDynamicTask for that.
 */
function unregisterTask(id) {
    if (_cronHandles[id]) {
        try { _cronHandles[id].stop(); } catch (_) {}
        delete _cronHandles[id];
    }
    delete TASK_REGISTRY[id];
}

/**
 * Load all persisted dynamic tasks from src/tasks/custom/ at startup.
 */
function loadCustomTasks() {
    if (!fs.existsSync(CUSTOM_TASKS_DIR)) return;
    const files = fs.readdirSync(CUSTOM_TASKS_DIR).filter((f) => f.endsWith('.meta.json'));
    for (const file of files) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(CUSTOM_TASKS_DIR, file), 'utf8'));
            const scriptPath = path.join(CUSTOM_TASKS_DIR, `${meta.id}.js`);
            if (!fs.existsSync(scriptPath)) continue;
            const scriptBody = fs.readFileSync(scriptPath, 'utf8')
                .replace(/^\/\/ Auto-generated.*\n/, '')
                .replace(/^module\.exports = async function run\(\) \{\n/, '')
                .replace(/\};\n?$/, '');
            registerDynamicTask({ ...meta, scriptBody });
            appLogger.info(`🚀 Tarea dinámica restaurada: ${meta.id}`);
        } catch (err) {
            appLogger.error(`❌ No se pudo cargar tarea dinámica "${file}": ${err.message}`);
        }
    }
}

module.exports = { initScheduler, getTaskRegistry, runTaskById, updateTaskState, registerDynamicTask, unregisterTask, loadCustomTasks };
