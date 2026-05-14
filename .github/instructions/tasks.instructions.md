---
description: "Use when adding or modifying scheduled cron tasks, task runners, or background jobs. Covers src/tasks/scheduler.js, TASK_REGISTRY structure, Telegram reporting, and LLM integration patterns."
applyTo: "src/tasks/**"
---
# Scheduled Tasks Rules

## Two Ways to Create a Task

| Method | When to use |
|--------|-------------|
| **Static task** (code file) | Complex logic, needs its own module, reusable helpers |
| **Dynamic task** (admin UI form) | Simple one-off scripts, no deployment needed |

---

## Method 1 — Static Task (code file)

### TASK_REGISTRY Structure (src/tasks/scheduler.js)

Every task entry must have all these fields:
```js
{
    id: 'camelCaseId',              // unique, used as key and in logs
    name: 'Human readable name',
    description: 'What it does and what it reports',
    schedule: '0 9 * * *',         // cron expression (minute hour dom month dow)
    scheduleLabel: 'Daily at 09:00',  // human-readable schedule for UI
    timezone: 'Europe/Madrid',
    lastRun: null,                  // updated by scheduler after run
    lastStatus: null,               // 'success' | 'error'
    lastMessage: null,              // short status message
    lastResult: null,               // task-specific result data
    run: async () => {
        const result = await runMyTask();
        return result;
    }
}
```

### Task File Pattern

Create `src/tasks/<name>.js`:
```js
const { appLogger, createTaskLogger } = require('../logger');

async function runMyTask() {
    const logger = createTaskLogger('myTask');
    try {
        logger.info('🚀 Starting myTask');
        // ... task logic
        logger.info('✅ myTask completed');
        return { success: true, count: n };
    } catch (error) {
        logger.error(`❌ myTask failed: ${error.message}`);
        throw error;
    }
}

module.exports = { runMyTask };
```

### Checklist for Static Tasks
1. Create `src/tasks/<name>.js` exporting `run<Name>()`
2. Import at top of `src/tasks/scheduler.js`
3. Add entry to `TASK_REGISTRY`
4. Update `docs/synctasks.md`
5. Update `CHANGELOG.md`

---

## Method 2 — Dynamic Task (Admin UI)

### How it works
Go to **Admin → Tareas programadas** and scroll to "Crear nueva tarea automática".

| Field | Required | Notes |
|-------|----------|-------|
| ID único | ✅ | Letters/numbers/`_`/`-`, starts with letter, 2–40 chars |
| Nombre visible | ✅ | Shown in the task list |
| Descripción | – | Shown under name |
| Expresión cron | ✅ | 5-field cron, e.g. `0 9 * * 1` |
| Etiqueta horario | – | Human-readable label, e.g. "Lunes a las 09:00" |
| Zona horaria | – | Default: `Europe/Madrid` |
| Código JavaScript | ✅ | Body of `async function run() { ... }` |

### Script body rules
- The code runs as the **body** of `async function run() { }` — no wrapping needed
- `return { ... }` to pass a result object that appears in the panel
- All project modules are available:
  ```js
  const { getCollection } = require('../db');
  const { appLogger } = require('../logger');
  ```
- Avoid blocking I/O — always `await` async operations
- Errors thrown will be caught by the scheduler and logged as task failures

### Example script body
```js
const { getCollection } = require('../db');
const collection = getCollection();
const total = await collection.countDocuments({});
const untagged = await collection.countDocuments({ tags: { $size: 0 } });
console.log(`✅ Total: ${total}, sin etiqueta: ${untagged}`);
return { total, untagged };
```

### Persistence
Dynamic tasks are saved to `src/tasks/custom/<id>.js` and `src/tasks/custom/<id>.meta.json`.
They are automatically restored on every server restart via `loadCustomTasks()` called inside `initScheduler()`.

### Deleting a dynamic task
Click **Eliminar** on the task card in the admin panel. This stops the cron job and deletes the persisted files.
Static (built-in) tasks cannot be deleted from the UI.

---

## Telegram Reporting
```js
// See duplicateReport.js for the full pattern
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const url = `https://api.telegram.org/bot${token}/sendMessage`;
await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'MarkdownV2' }),
});
```
Required env vars: `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`

## LLM Integration (scrapeAnalyze pattern)
- LLM endpoint: `process.env.LLM_API_URL` (Ollama `/api/chat`)
- Config: `prompt/config.json`
- Always handle LLM timeout / unreachable gracefully — mark article as skipped, not failed

## Logging in Tasks
Use `createTaskLogger(taskId)` — writes to `log/tasks/<taskId>.log` AND `log/app.log`:
```js
const logger = createTaskLogger('myTask');
logger.info('message');
logger.warn('message');
logger.error('message');
```

## State Management
After a task runs, the scheduler updates `lastRun`, `lastStatus`, `lastMessage`, `lastResult` automatically via `updateTaskState()`. Do not manually update these in task code.

## Cron Expression Reference
```
minute hour day-of-month month day-of-week
0 9 * * *        → daily at 09:00
30 10 * * 0      → Sunday at 10:30
0 8 * * 1        → Monday at 08:00
0 */6 * * *      → every 6 hours
0 8 1 * *        → 1st of every month at 08:00
```
