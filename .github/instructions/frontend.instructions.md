---
description: "Use when creating or modifying EJS views, HTML structure, CSS styles, or client-side JavaScript for this project. Covers template variables, partials, form patterns, and vanilla JS fetch patterns."
applyTo: "views/**", "public/**"
---
# Frontend Coding Rules

## EJS Templates

### Output Escaping
- `<%= variable %>` — ALWAYS for user-provided data (escapes HTML, prevents XSS)
- `<%- html %>` — ONLY for trusted content: partials, pre-sanitized HTML
- `<% code %>` — Logic blocks (no output)

### Required Partial (admin pages)
```ejs
<%- include('partials/admin-navbar') %>
```
Include at the top of every admin view (`admin*.ejs`).

### Passing Data from Route
Always verify the route passes the variables the view expects. Check `res.render('view', { ... })` in the route handler matches template variable names exactly.

### Conditional Rendering
```ejs
<% if (variable) { %>
    <!-- content -->
<% } %>
```

## Forms

```html
<form method="POST" action="/route">
    <label for="field-id">Label:</label>
    <input type="text" id="field-id" name="fieldName" required>
    <button type="submit">Submit</button>
</form>
```
- Always use `method="POST"` for state-changing operations
- Always include a `<label>` with matching `for` attribute
- No CSRF tokens currently — be aware when adding new forms

## CSS (`public/style.css`)
- Add new component styles at the END of the file
- Group related rules together with a comment block: `/* ===== Component Name ===== */`
- Use class selectors (`.card`, `.btn-primary`) not ID selectors for reusable styles
- Variables (if any) are defined at `:root` at the top of the file

## Client-Side JavaScript (`public/script.js`)

### AJAX to API
```js
fetch('/api/search?q=' + encodeURIComponent(q))
    .then(res => res.json())
    .then(data => { /* handle data.results */ })
    .catch(err => console.error('Error:', err));
```

### Event Listeners
```js
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('myButton').addEventListener('click', handleClick);
});
```
- Never use inline `onclick=""` attributes
- Always wrap in `DOMContentLoaded`

## Template Variables Reference

### index.ejs receives:
`articles`, `totalArticles`, `totalPages`, `currentPage`, `search`, `tag`, `categoria`, `periodo`, `sort`, `allTags`, `categorias`, `stats`

### articulo.ejs receives:
`articulo` (full article object with `_id`, `title`, `content`, `url`, `tags`, `date`, `views`)

### error.ejs receives:
`message` (string), `error` (Error object or null)

### admin.ejs receives:
`totalPendientes`, `totalLinks`, `linksUntagged`, `totalUsers`, `topTags`, `session`

## View Map

| File | Route | Purpose | Navbar link? |
|------|-------|---------|-------------|
| `views/index.ejs` | GET / | Article list | No |
| `views/articulo.ejs` | GET /articulo/:id | Article detail | No |
| `views/login.ejs` | GET /admin/login | Login form | No |
| `views/register.ejs` | GET /admin/register | Register form | No |
| `views/admin.ejs` | GET /admin | Admin dashboard | Yes |
| `views/admin-users.ejs` | GET /admin/users | User management | Yes |
| `views/admin-tasks.ejs` | GET /admin/tasks | Scheduled task runner | Yes |
| `views/admin-config.ejs` | GET /admin/config | LLM/prompt config editor | Yes |
| `views/admin-tag-merges.ejs` | GET /admin/tag-merges | Tag merge proposals review | **NO** — linked from task card in `/admin/tasks` only |
| `views/notion-pending.ejs` | GET /notion-pending | Notion pending articles | Yes |
| `views/notion-table.ejs` | GET /notion-table | Notion table view | No |
| `views/error.ejs` | Error handler | Error display | No |

> **Rule:** `admin-tag-merges.ejs` is NOT linked from `admin-navbar.ejs`. It is accessed via the "Revisar propuestas" button inside the `tagMergeProposals` task card in `admin-tasks.ejs`.
