# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added - 2026-05-14
- Tarea programada `tagMergeProposals` (domingos 12:00, Europe/Madrid): detecta pares de etiquetas similares (plurales, variantes ortográficas, distancia de Levenshtein ≤ 1 para tags ≥ 6 chars) en las colecciones `pendientes` y `links`.
- Las propuestas se almacenan en la colección MongoDB `tag_merge_proposals` (estado: `pending` / `approved` / `rejected`).
- Notificación semanal por Telegram con el resumen de nuevas propuestas y el total pendiente.
- Panel de revisión manual en `GET /admin/tag-merges`: muestra propuestas con conteo de artículos y links afectados por cada par.
- `POST /admin/tag-merges/:id/approve`: aplica la fusión en ambas colecciones (sin duplicar la etiqueta resultante) y marca la propuesta como aprobada.
- `POST /admin/tag-merges/:id/reject`: descarta la propuesta sin modificar documentos.
- Acceso a la revisión de fusiones desde la tarjeta de la tarea en `/admin/tasks`.
- `getProposalsCollection()` añadido a `src/db.js` para acceso a `tag_merge_proposals`.

### Fixed - 2026-05-14
- Corregido el flujo de aprobación de fusiones de etiquetas para evitar el conflicto de MongoDB al modificar `tags` con operadores incompatibles en la misma actualización.

### Security - 2026-05-14
- Login rate limiter movido a `POST /admin/login` exclusivamente (antes cubría GET también).
- Añadido `registerLimiter`: máximo 5 registros por hora por IP en `POST /admin/register`.
- Añadidos `apiSearchLimiter` (60/min) y `viewLimiter` (30/min) en `src/routes/api.js`.
- Añadida validación de longitud máxima (200 chars) en parámetro `q` de `/api/search`.
- Añadida comprobación de longitud máxima de contraseña (200 chars) antes de bcrypt para prevenir DoS.
- Aumentada longitud mínima de contraseña de 6 a 8 caracteres en el registro público.
- Añadida cabecera `Permissions-Policy` (camera, mic, geolocation, payment deshabilitadas).
- Añadida cabecera `Cache-Control: no-store` en todas las rutas `/admin`.
- Añadido logging de seguridad (appLogger) para: intentos de login fallidos/exitosos, creación/actualización/eliminación de usuarios, ejecución manual de tareas.

### Fixed - 2026-05-14
- Ajustado el apilado visual del buscador para que el desplegable de etiquetas se muestre por encima de las tarjetas de artículos.
- Rediseñada la interfaz de `/admin/tag-merges` con métricas, paneles más claros, tarjetas más legibles y acciones JS sin `onclick` inline.

### Added
- Dynamic task system: `registerDynamicTask()`, `unregisterTask()`, `loadCustomTasks()` in `src/tasks/scheduler.js`
- Dynamic tasks persist to `src/tasks/custom/` and are auto-restored on server restart
- `POST /admin/tasks/new` route — creates and activates a dynamic task from the admin panel
- `POST /admin/tasks/:id/delete-dynamic` route — stops and permanently removes a dynamic task
- "Crear nueva tarea automática" form in `views/admin-tasks.ejs` with cron preset shortcuts and JS code editor
- Delete button on task cards for dynamic tasks
- Updated `tasks.instructions.md` with full guide for both static and dynamic task creation

### Added
- `.github/` folder with full Copilot agent customization infrastructure
- `documentation.agent.md` — agent for keeping docs/ and README.md in sync with code
- `changelog.agent.md` — agent for maintaining CHANGELOG.md in Keep a Changelog format
- `backend.agent.md` — agent for implementing Express routes, MongoDB queries, middleware, and tasks
- `frontend.agent.md` — agent for EJS views, CSS, and client-side JavaScript
- `dependencies.agent.md` — agent for evaluating and managing npm dependencies
- `copilot-instructions.md` — always-on project conventions for GitHub Copilot
- `backend.instructions.md` — auto-attached rules for `src/**` files
- `frontend.instructions.md` — auto-attached rules for `views/**` and `public/**` files
- `security.instructions.md` — auto-attached security checklist for route and middleware files
- `tasks.instructions.md` — auto-attached conventions for `src/tasks/**` files
- `new-route.prompt.md` — prompt to scaffold a new Express route following project conventions
- `new-view.prompt.md` — prompt to scaffold a new EJS view following project conventions
- `update-changelog.prompt.md` — prompt to update CHANGELOG.md after code changes
- `update-docs.prompt.md` — prompt to update docs/ after code changes
- `new-scheduled-task.prompt.md` — prompt to scaffold a new scheduled cron task
- `policy.json` — lifecycle hooks: pre-tool guard for critical files and destructive commands; post-edit reminder for changelog and docs
- `self-improve` skill — workflow for recording new patterns and gotchas to repository memory

