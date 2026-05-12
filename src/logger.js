const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../log');
const TASKS_LOG_DIR = path.join(LOG_DIR, 'tasks');

function ensureDirs() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.mkdirSync(TASKS_LOG_DIR, { recursive: true });
}

function ts() {
    return new Date().toISOString();
}

function formatLine(level, message) {
    return `[${ts()}] [${level.padEnd(5)}] ${message}\n`;
}

function appendLine(filePath, line) {
    try {
        ensureDirs();
        fs.appendFileSync(filePath, line, 'utf8');
    } catch (_) { /* never crash the app due to logging */ }
}

const APP_LOG = path.join(LOG_DIR, 'app.log');

const appLogger = {
    info(msg) {
        console.log(`ℹ️  ${msg}`);
        appendLine(APP_LOG, formatLine('INFO', msg));
    },
    warn(msg) {
        console.warn(`⚠️  ${msg}`);
        appendLine(APP_LOG, formatLine('WARN', msg));
    },
    error(msg) {
        console.error(`❌ ${msg}`);
        appendLine(APP_LOG, formatLine('ERROR', msg));
    },
};

/**
 * Returns a logger scoped to a specific task.
 * Writes to log/tasks/<taskId>.log AND to app.log for errors.
 */
function createTaskLogger(taskId) {
    const logFile = path.join(TASKS_LOG_DIR, `${taskId}.log`);
    const tag = `[${taskId}]`;

    return {
        separator(label = '') {
            const line = label
                ? `\n${'═'.repeat(80)}\n  ${ts()} — ${label}\n${'═'.repeat(80)}\n`
                : `\n${'─'.repeat(80)}\n`;
            appendLine(logFile, line);
        },
        info(msg) {
            console.log(`⏰ ${tag} ${msg}`);
            appendLine(logFile, formatLine('INFO', `${tag} ${msg}`));
        },
        warn(msg) {
            console.warn(`⚠️  ${tag} ${msg}`);
            appendLine(logFile, formatLine('WARN', `${tag} ${msg}`));
        },
        error(msg) {
            console.error(`❌ ${tag} ${msg}`);
            appendLine(logFile, formatLine('ERROR', `${tag} ${msg}`));
            appendLine(APP_LOG, formatLine('ERROR', `${tag} ${msg}`));
        },
        detail(msg) {
            appendLine(logFile, formatLine('DETAIL', `${tag} ${msg}`));
        },
        data(label, value) {
            const line = typeof value === 'object'
                ? JSON.stringify(value, null, 2).replace(/\n/g, '\n    ')
                : String(value);
            appendLine(logFile, formatLine('DATA', `${tag} ${label}: ${line}`));
        },
    };
}

module.exports = { appLogger, createTaskLogger };
