---
description: "Scaffold a new Express route file following project conventions"
argument-hint: "Route name and description, e.g. 'links route for managing saved links'"
agent: "agent"
tools: [read, search, edit]
---
Create a new Express route for this project following all conventions.

## What to implement: $input

## Steps

1. Read `src/routes/articles.js` to understand the standard route file structure.
2. Read `src/middleware.js` to understand available auth guards.
3. Read `src/utils.js` to understand available helpers.
4. Create `src/routes/<name>.js` with:
   - `const { Router } = require('express')`
   - All necessary imports from `src/db.js`, `src/utils.js`, `src/middleware.js`
   - Proper async/await error handling in every route handler
   - `requireAdmin` on any protected route
   - `isValidObjectId()` validation before any `:id` parameter is used in a MongoDB query
   - `escapeRegex()` for any user input used in regex
   - `module.exports = router` at the bottom
5. Register the route in `server.js` with `app.use('/', require('./src/routes/<name>'))`.
6. Add an entry for each new endpoint in `docs/develop.md`.
7. Add a `CHANGELOG.md` entry under `## [Unreleased] > ### Added`.

## Output

List every file created or modified and a one-line description of each change.
