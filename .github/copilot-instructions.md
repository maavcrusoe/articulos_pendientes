# Artículos Pendientes — Project Instructions

## Stack
Express 4 + EJS + MongoDB (native driver, no Mongoose) + Node.js 20. Auth via `express-session` + `bcryptjs`. Notion integration via `@notionhq/client`. Scheduled tasks via `node-cron`.

## Project Layout
```
server.js              # Entry point — middleware chain, route mounting, 404/error handlers
src/
  db.js                # MongoDB helpers: connectDB(), getDb(), getCollection(), getUsersCollection(), getLinksCollection(), getProposalsCollection()
  middleware.js        # requireLogin, requireAdmin
  notion.js            # Notion client, schema auto-detection, data fetching
  utils.js             # buildAdvancedSearchQuery(), escapeRegex(), isValidObjectId(), CATEGORIAS_TEMATICAS
  logger.js            # appLogger (info/warn/error), createTaskLogger(taskId)
  routes/
    articles.js        # GET /, GET /articulo/:id
    api.js             # GET /api/search, POST /api/articulo/:id/view
    auth.js            # /admin/login, /admin/register, /admin/logout
    admin.js           # /admin/* (user CRUD, task runner, config)
    notion.js          # /notion-pending, /notion-table
  tasks/
    scheduler.js       # TASK_REGISTRY, initScheduler(), runTaskById()
    duplicateReport.js
    untaggedReport.js
    scrapeAnalyze.js
views/                 # EJS templates
public/                # style.css, script.js
prompt/config.json     # Prompt config (LLM task settings)
```

## Non-Negotiable Conventions

### Database
- ALWAYS use `getCollection()`, `getUsersCollection()`, `getLinksCollection()`, or `getProposalsCollection()` from `src/db.js`
- NEVER open a new MongoDB connection
- Validate ObjectIds with `isValidObjectId(id)` from `src/utils.js` before any MongoDB query

### Security
- User input in regex: ALWAYS use `escapeRegex()` from `src/utils.js` to prevent ReDoS
- ObjectId pattern: `/^[a-f0-9]{24}$/i` — use `isValidObjectId()` helper
- Auth guard: `requireAdmin` from `src/middleware.js` for all `/admin/*`, `/notion-pending`, `/notion-table` routes
- No CSRF: forms use plain POST — note this when adding state-changing endpoints

### Error Handling
- Try-catch everywhere in async route handlers
- HTML routes → `res.render('error.ejs', { message, error })`
- API routes → `res.status(5xx).json({ error: 'msg' })`
- Log with `appLogger.error()` or `console.error()` with emoji prefix `❌`

### Logging Prefixes
`✅` success · `❌` error · `⚠️` warning · `🚀` startup/init

### Search
Multi-word AND full-text search via `buildAdvancedSearchQuery(q)` in utils.js — requires MongoDB text index on `pendientes` collection.

### Pagination
`ITEMS_PER_PAGE` env var (default 10). Current page from `req.query.page`.

## Article Schema (collection: `pendientes`)
```js
{ _id: ObjectId, title: string, content: string, url: string, tags: string[], date: string /* ISO */, views: number }
```

## Scheduled Tasks (TASK_REGISTRY in src/tasks/scheduler.js)
| id | schedule | description |
|----|----------|-------------|
| `duplicateUrls` | Sun 10:30 (Europe/Madrid) | Duplicate URL report via Telegram |
| `untaggedLinks` | Sun 11:00 (Europe/Madrid) | Untagged links report via Telegram |
| `scrapeAnalyze` | Daily 09:00 (Europe/Madrid) | Scrape + LLM analysis of pending articles |
| `tagMergeProposals` | Sun 12:00 (Europe/Madrid) | Detect similar tags, create merge proposals in `tag_merge_proposals` collection, notify via Telegram. Reviewed manually at `/admin/tag-merges` (linked from the task card in `/admin/tasks`, NOT in the navbar). |

## CSP
`helmet` is called with `contentSecurityPolicy: false` — do not re-enable without auditing all inline scripts in EJS views.

## Environment Variables (required)
`MONGODB_URI`, `DB_NAME`, `CollectionName`, `SESSION_SECRET`, `NOTION_API`, `NOTION_TABLE`, `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`, `LLM_API_URL`, `PORT`, `ITEMS_PER_PAGE`, `TRUST_PROXY`

## After Any Code Change
1. Update `CHANGELOG.md` (root) — use Keep a Changelog format
2. If a new route/endpoint is added, update `docs/develop.md`
3. If a new env var is required, update `README.md` and `docs/setup.md`
4. If a new npm dependency is added, document it in `docs/install.md`
