---
description: "Scaffold a new EJS view following project template conventions"
argument-hint: "View name and purpose, e.g. 'admin-stats page showing article statistics'"
agent: "agent"
tools: [read, search, edit]
---
Create a new EJS view for this project following all conventions.

## What to implement: $input

## Steps

1. Read an existing similar view (e.g., `views/admin.ejs` for admin pages, `views/index.ejs` for public pages) to understand the layout and structure.
2. Read `views/partials/admin-navbar.ejs` if this is an admin page.
3. Create `views/<name>.ejs` with:
   - `<%- include('partials/admin-navbar') %>` at the top if it's an admin page
   - `<%= %>` (escaped output) for ALL user-provided or database-sourced data
   - `<%-  %>` ONLY for trusted partials
   - Semantic HTML structure
   - Accessible form markup with `<label for="">` if the view has forms
4. Identify all template variables the view needs and verify the corresponding route passes them via `res.render('name', { ... })`.
5. Add any new component-specific CSS at the END of `public/style.css` with a comment header.
6. Add a `CHANGELOG.md` entry under `## [Unreleased] > ### Added`.

## Output

List every file created or modified and a one-line description of each change.
