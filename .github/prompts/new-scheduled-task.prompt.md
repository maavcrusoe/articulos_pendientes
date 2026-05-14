---
description: "Scaffold a new scheduled cron task following project conventions"
argument-hint: "Task name and description, e.g. 'weekly stats report sent via Telegram every Monday'"
agent: "agent"
tools: [read, edit, search, todo]
---
Create a new scheduled task for this project.

## What to implement: $input

## Steps

1. Read `src/tasks/duplicateReport.js` and `src/tasks/untaggedReport.js` to understand the task implementation pattern.
2. Read `src/tasks/scheduler.js` to understand the `TASK_REGISTRY` structure.
3. Create `src/tasks/<name>.js` with:
   - `createTaskLogger(taskId)` from `src/logger.js` for logging
   - A named exported async function `run<Name>()`
   - `try/catch` with logger.error on failure
   - Return a results object (e.g., `{ success: true, count: n }`)
4. Add an entry to `TASK_REGISTRY` in `src/tasks/scheduler.js` with all required fields:
   `id`, `name`, `description`, `schedule` (cron), `scheduleLabel`, `timezone: 'Europe/Madrid'`, `lastRun: null`, `lastStatus: null`, `lastMessage: null`, `lastResult: null`, `run`
5. Import the new task function at the top of `src/tasks/scheduler.js`.
6. Update `docs/synctasks.md` with the new task's details.
7. Add a `CHANGELOG.md` entry under `## [Unreleased] > ### Added`.

## Cron Expression Reference
```
minute hour day-of-month month day-of-week
0 9 * * *        → daily at 09:00
30 10 * * 0      → Sunday at 10:30
0 8 * * 1        → Monday at 08:00
0 */6 * * *      → every 6 hours
```

## Output

List every file created or modified.
