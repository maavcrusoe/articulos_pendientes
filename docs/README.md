# Artículos Pendientes — Documentación

Panel web para explorar, filtrar y gestionar artículos pendientes almacenados en MongoDB, con integración Notion y autenticación de usuarios.

## Índice de documentación

| Documento | Descripción |
|-----------|-------------|
| [install.md](install.md) | Instalación de dependencias y requisitos previos |
| [setup.md](setup.md) | Configuración del fichero `.env` y variables de entorno |
| [mongo.md](mongo.md) | Estructura de MongoDB: bases de datos, colecciones e índices |
| [docker.md](docker.md) | Despliegue con Docker y docker-compose |
| [develop.md](develop.md) | Flujo de desarrollo local (nodemon, estructura de rutas) |
| [start.md](start.md) | Arrancar la aplicación en producción |
| [synctasks.md](synctasks.md) | Tareas programadas: reporte semanal de URLs duplicadas vía Telegram |

## Resumen del proyecto

```
server.js          # Punto de entrada — middleware, rutas, handlers de error
src/
  db.js            # Conexión MongoDB + helpers getCollection / getLinksCollection
  middleware.js    # requireLogin, requireAdmin
  notion.js        # Cliente Notion, detección de esquema, fetch de datos
  utils.js         # buildAdvancedSearchQuery, escapeRegex, categorización de tags
  routes/
    articles.js    # GET /, GET /articulo/:id
    api.js         # GET /api/search, POST /api/articulo/:id/view
    auth.js        # /admin/login, /admin/register, /admin/logout
    admin.js       # /admin — gestión de usuarios (requireAdmin)
    notion.js      # /notion-pending, /notion-table (requireAdmin)
  tasks/
    duplicateReport.js  # Lógica del reporte de URLs duplicadas
    scheduler.js        # Cron job dominical (node-cron)
views/             # Plantillas EJS
public/            # Activos estáticos (script.js, style.css)
docs/              # Esta documentación
```

## Stack tecnológico

- **Runtime**: Node.js 20, Express 4
- **Plantillas**: EJS
- **Base de datos**: MongoDB (driver nativo, sin Mongoose)
- **Autenticación**: `express-session` + `bcryptjs`
- **Seguridad**: `helmet`, `express-rate-limit`
- **Integración externa**: `@notionhq/client`
- **Tareas programadas**: `node-cron`
