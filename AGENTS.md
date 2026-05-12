# Artículos Pendientes — Agent Instructions

## Project Purpose
Express.js web app to browse, search, and manage pending articles stored in MongoDB, with Notion integration for syncing and tagging items. Includes user authentication with admin/user roles.

## Tech Stack
- **Runtime**: Node.js 20, Express 4
- **Templating**: EJS (views in `views/`)
- **Database**: MongoDB (driver: `mongodb` npm package, no Mongoose)
- **Auth**: `express-session` + `bcryptjs`
- **Security**: `helmet`, `express-rate-limit`
- **External API**: `@notionhq/client` (Notion integration)

## Running the App

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Requires a `.env` file — see [README.md](README.md) for all variables.

**Critical env vars:**
| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection (default: `mongodb://localhost:27017`) |
| `DB_NAME` | Database name |
| `CollectionName` | Articles collection (default: `pendientes`) |
| `SESSION_SECRET` | Session secret — **set in production or sessions break across restarts** |
| `NOTION_API` | Notion integration token |
| `NOTION_TABLE` | Notion database ID or URL |

## Project Structure

```
server.js          # App entry point — middleware chain, route mounting, 404/error handlers
src/
  db.js            # MongoDB connection + getDb() / getCollection() helpers
  middleware.js    # requireLogin, requireAdmin middleware
  notion.js        # Notion API client, schema auto-detection, data fetching
  utils.js         # buildAdvancedSearchQuery(), escapeRegex(), tag categorization
  routes/
    articles.js    # GET /, GET /articulo/:id
    api.js         # GET /api/search, POST /api/articulo/:id/view
    auth.js        # /admin/login, /admin/register, /admin/logout
    admin.js       # /admin (user CRUD, requireAdmin)
    notion.js      # /notion-pending, /notion-table (requireAdmin)
views/             # EJS templates
public/            # Static assets (script.js, style.css)
```

## Key Conventions

- **DB access**: Always use `getDb()` or `getCollection()` from `src/db.js`, never open a new connection.
- **Error handling**: Try-catch everywhere; render `error.ejs` for HTML routes, return JSON `{error: msg}` for API routes. Log with `console.error`.
- **Logging style**: Emoji prefixes — `✅` success, `❌` error, `⚠️` warning, `🚀` startup.
- **Validation**: Use `escapeRegex()` from `utils.js` for any user input in regex. ObjectId inputs validated with `/^[a-fA-F0-9]{24}$/.test(id)` before MongoDB queries.
- **Search**: Multi-word full-text search via `buildAdvancedSearchQuery()` in `utils.js` — uses MongoDB text indexes with AND logic.
- **Tag categories**: Defined in `CATEGORIAS_TEMATICAS` in `utils.js` — keyword-to-category mapping for 7 categories.
- **Pagination**: Controlled by `ITEMS_PER_PAGE` env var (default 10).
- **Auth protection**: Routes under `/admin/*`, `/notion-pending/*`, `/notion-table/*` require `requireLogin` + `requireAdmin`.

## Articles Collection Schema
```js
{
  _id: ObjectId,
  title: string,
  content: string,
  url: string,
  tags: string[],
  date: string,   // ISO date string
  views: number   // incremented on article view
}
```

## Gotchas / Pitfalls

- **No CSRF protection**: Forms use plain POST — keep this in mind if adding state-changing endpoints.
- **CSP is disabled**: `helmet` called with `contentSecurityPolicy: false` to allow EJS inline scripts.
- **Notion schema caching**: Notion property schema is auto-detected and cached in memory on first request. A server restart is needed if Notion schema changes.
- **Default admin**: On first startup, an `admin/admin123` user is seeded — must be changed before production use.
- **Session secret warning**: If `SESSION_SECRET` is not set, a random secret is used and sessions won't survive server restarts.
- **Docker build**: Requires `GITHUB_TOKEN` and `GITHUB_REPO` build args for private repo cloning. See `docker-compose.yml`.
