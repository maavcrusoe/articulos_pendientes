---
description: "Use when writing or modifying backend route handlers, middleware, MongoDB queries, utility functions, or scheduled task logic. Covers Express patterns, DB access, error handling, and security validation for this project."
applyTo: "src/routes/**", "src/tasks/**", "src/db.js", "src/middleware.js", "src/utils.js", "src/logger.js", "src/notion.js", "server.js"
---
# Backend Coding Rules

## Database Access
- Import helpers from `src/db.js`: `getCollection()`, `getUsersCollection()`, `getLinksCollection()`
- NEVER instantiate `MongoClient` directly
- ALWAYS validate ObjectId before use: `if (!isValidObjectId(id)) return res.status(400)...`
- `isValidObjectId` is in `src/utils.js`: tests `/^[a-f0-9]{24}$/i`

## Input Validation & Security
- User input destined for regex: `escapeRegex(str)` from `src/utils.js`
- Full-text search: `buildAdvancedSearchQuery(q)` from `src/utils.js`
- Tag filtering: `buildTagMatchQuery(tag)` from `src/utils.js`
- Protect admin routes: `router.use(requireAdmin)` from `src/middleware.js`

## Route Structure
```js
const { Router } = require('express');
const router = Router();
// ... route handlers
module.exports = router;
```

## Async Error Handling
```js
router.get('/path', async (req, res) => {
    try {
        // logic
    } catch (error) {
        appLogger.error(`❌ Description: ${error.message}`);
        // HTML route:
        res.render('error.ejs', { message: 'User-friendly message', error });
        // API route:
        res.status(500).json({ error: 'Short description' });
    }
});
```

## Logging
Use `appLogger` from `src/logger.js`:
```js
appLogger.info('✅ Success message');
appLogger.warn('⚠️ Warning message');
appLogger.error('❌ Error message');
```
For tasks: `createTaskLogger(taskId)` returns `{ info, warn, error }`.

## Pagination Pattern
```js
const currentPage = Math.max(parseInt(req.query.page) || 1, 1);
const skip = (currentPage - 1) * ITEMS_PER_PAGE;
// ITEMS_PER_PAGE comes from src/utils.js
```

## Scheduled Tasks
New tasks must be added to `TASK_REGISTRY` in `src/tasks/scheduler.js`:
```js
myTask: {
    id: 'myTask',
    name: 'Human-readable name',
    description: 'What it does',
    schedule: '0 10 * * 1',        // cron expression
    scheduleLabel: 'Mondays at 10:00',
    timezone: 'Europe/Madrid',
    lastRun: null, lastStatus: null, lastMessage: null, lastResult: null,
    run: async () => { /* call exported function */ }
}
```
