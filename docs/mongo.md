# MongoDB — Estructura y colecciones

La aplicación usa la base de datos definida por `DB_NAME` (por defecto `articulos`).

## Colecciones

### `pendientes` (configurable con `CollectionName`)

Artículos capturados y pendientes de revisión.

```js
{
  _id:     ObjectId,
  title:   string,        // Título del artículo
  content: string,        // Extracto o cuerpo
  url:     string,        // URL del artículo
  tags:    string[],      // Etiquetas
  date:    string,        // Fecha ISO (ej. "2024-05-12")
  views:   number         // Contador de lecturas (se incrementa en cada visita)
}
```

**Índices creados automáticamente al arrancar:**

| Índice | Campos | Tipo |
|--------|--------|------|
| Texto completo | `title`, `content`, `url`, `tags` | text |
| Ordenación | `date` | desc |
| Filtrado | `tags` | asc |

---

### `links`

Artículos marcados como vistos desde el panel de Notion. Almacenamiento definitivo en MongoDB.

```js
{
  _id:       ObjectId,
  notionId:  string,    // ID original del item en Notion (único)
  title:     string,    // Título
  sourceUrl: string,    // URL del artículo original
  notionUrl: string,    // Enlace de vuelta a la página de Notion
  tags:      string[],  // Etiquetas de usuario (sin tags de sistema)
  viewedAt:  Date       // Fecha en que se marcó como visto
}
```

**Índices:**

| Índice | Campo | Tipo |
|--------|-------|------|
| Único | `notionId` | unique sparse |
| Filtrado | `tags` | asc |
| Ordenación | `viewedAt` | desc |

---

### `users`

Usuarios del panel de administración.

```js
{
  _id:       ObjectId,
  username:  string,    // Nombre normalizado (minúsculas)
  password:  string,    // Hash bcrypt (saltRounds=12)
  role:      string,    // "admin" | "user"
  createdAt: Date
}
```

## Acceso desde el código

Usa siempre los helpers de [`src/db.js`](../src/db.js):

```js
const { getCollection, getLinksCollection, getUsersCollection, getDB } = require('./db');

const pendientes = getCollection();       // colección de artículos
const links      = getLinksCollection();  // colección de links vistos
const users      = getUsersCollection();  // colección de usuarios
const db         = getDB();               // instancia db para operaciones ad-hoc
```

**Nunca abras una nueva conexión directamente.** La conexión se inicializa una sola vez en `connectDB()` al arrancar el servidor.

## Migraciones manuales

Para migrar los artículos marcados como vistos en Notion hacia la colección `links`, usa el botón **"Migrar vistos de Notion"** disponible en `/notion-pending` (requiere rol admin). Operación idempotente (los ya existentes se omiten).
