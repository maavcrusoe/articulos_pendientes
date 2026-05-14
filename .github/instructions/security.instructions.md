---
description: "Use when implementing authentication, authorization, rate limiting, input validation, session management, or any security-sensitive code. Enforces OWASP Top 10 mitigations for this Express.js project."
applyTo: "src/routes/**", "src/middleware.js", "server.js"
---
# Security Rules

## OWASP Top 10 — Current Mitigations (May 2026)

### A01 — Broken Access Control
- Protected routes MUST use `requireAdmin` from `src/middleware.js`
- Routes: `/admin/*`, `/notion-pending`, `/notion-table` are all admin-only
- `requireAdmin` checks `req.session.user.role === 'admin'` — do not weaken
- Never expose MongoDB `_id` or internal fields in error messages
- `/admin/register` is **public** by design (creates `role: user` accounts). It is rate-limited at 5/hour per IP.

### A02 — Cryptographic Failures
- Passwords stored with `bcryptjs`, 12 salt rounds: `bcrypt.hash(password, 12)`
- Never return password hashes — always query with `{ projection: { password: 0 } }`
- Session cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production
- Session name changed from default `connect.sid` to `sid` to reduce fingerprinting

### A03 — Injection (MongoDB / ReDoS)
- ObjectId validation BEFORE any MongoDB query: `isValidObjectId(id)` from `src/utils.js`
- All user input in regex patterns: `escapeRegex(str)` from `src/utils.js`
- `buildAdvancedSearchQuery()` is the ONLY safe way to build full-text queries
- Never concatenate user strings directly into MongoDB operators

```js
// ObjectId — always before MongoDB query
if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'ID no válido' });
}

// User input in regex — always escape
const pattern = new RegExp(escapeRegex(req.query.q), 'i');
```

### A04 — Insecure Design
- **Dynamic task scripts** (`/admin/tasks/new`): Admin-only feature that writes JS to disk and `require()`s it. This is intentional arbitrary code execution, locked to admin role. Task `id` is strictly validated with `/^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/` to prevent path traversal.
- Do NOT add similar code-execution features without a full security review.

### A05 — Security Misconfiguration
- Helmet v8 active: sets `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `X-DNS-Prefetch-Control`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` automatically.
- `Permissions-Policy` added via custom middleware (server.js): `camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()`.
- `Cache-Control: no-store` added for all `/admin` routes to prevent browser caching of sensitive pages.
- **CSP is disabled** (`contentSecurityPolicy: false`) — EJS views use inline scripts. Do not re-enable without auditing all views.
- `trust proxy` is configurable via `TRUST_PROXY` env var. Set to `1` or `true` in production behind a reverse proxy.

### A07 — Authentication and Session Failures
- Session `regenerate()` called on login to prevent session fixation.
- Login rate limiter applied to **POST only** (`loginLimiter` in `src/routes/auth.js`): 10 failed attempts / 15 min, `skipSuccessfulRequests: true`.
- Register rate limiter: 5 accounts / hour per IP (`registerLimiter` in `src/routes/auth.js`).
- Password max length: 200 chars (before bcrypt, to prevent DoS on bcrypt computation).
- Password min length: 8 chars.
- All failed login attempts are logged via `appLogger.warn()` with username and IP.
- All successful logins are logged via `appLogger.info()` with username and IP.

### A09 — Security Logging and Monitoring
- Use `appLogger` (from `src/logger.js`) for all security events — NOT `console.log`.
- Logged events:
  - Failed login: `appLogger.warn()` with username + IP
  - Successful login: `appLogger.info()` with username + IP
  - User created/updated/deleted by admin: `appLogger.info()` with actor + target + IP
  - Manual task execution: `appLogger.info()` with actor + task ID + IP
  - Dynamic task created/deleted: `appLogger.info()` with actor + task ID

## Rate Limiting — Current Configuration

| Endpoint | Limiter | Window | Max |
|---|---|---|---|
| All routes | global (server.js) | 15 min | 500 |
| `POST /admin/login` | loginLimiter (auth.js) | 15 min | 10 failed |
| `POST /admin/register` | registerLimiter (auth.js) | 1 hour | 5 |
| `GET /api/search` | apiSearchLimiter (api.js) | 1 min | 60 |
| `POST /api/articulo/:id/view` | viewLimiter (api.js) | 1 min | 30 |

When adding a new public endpoint: define a dedicated `rateLimit()` in the route file and apply it as route-level middleware.

## Input Validation
- Text search queries: min 2 chars, **max 200 chars** — enforced in `api.js` and recommended in `articles.js`
- Username: 3–30 chars (enforced in auth.js and admin.js)
- Password: 8–200 chars (enforced in auth.js)
- ObjectId params: `isValidObjectId()` before every MongoDB query

## Error Exposure
- API routes: `res.status(5xx).json({ error: 'Short message' })` — never expose stack traces or error.message from caught exceptions
- HTML routes: `res.render('error.ejs', { error: 'User-friendly message' })`
- Log full errors server-side: `appLogger.error(\`❌ ...: ${err.message}\`)`
- `error.ejs` uses `<%= error %>` (HTML-escaped) — safe

## Session Security
```js
// Configured in server.js — do not weaken these settings:
session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 24h }
})
```

## Known Limitations (do not fix without full review)
- **No CSRF protection**: Forms use plain POST. Adding CSRF requires changes to all forms and route handlers across views.
- **CSP disabled**: All inline scripts in EJS views must be audited before re-enabling.
- **Public self-registration**: `/admin/register` creates `role: user` accounts with no admin approval. Currently `role: user` has no extra access beyond guests. Rate-limited to 5/hour.
- **Dynamic task scripts**: Admin-only arbitrary JS execution by design. Requires admin session.

## Checklist for New Endpoints
- [ ] Input validated (type, length, format) before DB queries
- [ ] ObjectId validated with `isValidObjectId()`
- [ ] User input in regex uses `escapeRegex()`
- [ ] Auth middleware applied (`requireAdmin`) if protected route
- [ ] Error handler returns no stack trace or internal detail to client
- [ ] Dedicated rate limiter applied for any public-facing endpoint
- [ ] Security events logged with `appLogger`
