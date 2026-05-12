# Desarrollo local

## Arrancar en modo desarrollo

```bash
npm run dev
```

Usa `nodemon` para reinicio automático ante cambios en ficheros `.js` y `.ejs`.

## Estructura de rutas

| Prefijo | Fichero | Acceso |
|---------|---------|--------|
| `/`, `/articulo/:id` | `src/routes/articles.js` | Público |
| `/api/search`, `/api/articulo/:id/view` | `src/routes/api.js` | Público |
| `/admin/login`, `/admin/register`, `/admin/logout` | `src/routes/auth.js` | Público |
| `/admin` | `src/routes/admin.js` | `requireAdmin` |
| `/notion-pending`, `/notion-table` | `src/routes/notion.js` | `requireAdmin` |

## Añadir una nueva ruta

1. Crea el fichero en `src/routes/mi-ruta.js` siguiendo el patrón de las rutas existentes:
   - `try/catch` en cada handler
   - Renderiza `error.ejs` para errores HTML; devuelve `{ error: msg }` para API
   - Usa `getCollection()` o `getLinksCollection()` de `src/db.js`
2. Importa y monta en `server.js`:
   ```js
   const miRuta = require('./src/routes/mi-ruta');
   app.use(miRuta);
   ```

## Convenciones de código

- **Acceso a BD**: siempre a través de `src/db.js` — nunca `new MongoClient()` en las rutas.
- **Input del usuario en regex**: usa `escapeRegex()` de `src/utils.js`.
- **Validación de ObjectId**: usa `isValidObjectId(id)` de `src/utils.js`.
- **Logging**: prefijos emoji: `✅` éxito, `❌` error, `⚠️` aviso, `🚀` arranque.
- **Búsqueda**: usa `buildAdvancedSearchQuery()` de `src/utils.js` para búsqueda full-text en MongoDB.

## Variables de sesión disponibles en vistas EJS

```js
res.locals.user            // objeto usuario (null si no autenticado)
res.locals.buildQueryString // helper para construir query strings en paginación
```

## Hot-reload de plantillas EJS

EJS compila las plantillas en cada petición en modo desarrollo — no hace falta reiniciar para ver cambios en `.ejs`.
