# Tareas programadas (synctasks)

## Reporte semanal de URLs duplicadas

Cada **domingo a las 10:30** (zona horaria `Europe/Madrid`) el scheduler compara las URLs de la colección `pendientes` y envía un informe por Telegram si detecta duplicados.

### Configuración en `.env`

```env
TELEGRAM_TOKEN=123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
TELEGRAM_CHAT_ID=-100123456789
```

**Cómo obtener el token:** crea un bot con [@BotFather](https://t.me/botfather) y copia el token.  
**Cómo obtener el chat ID:** envía un mensaje al bot y consulta:
```
https://api.telegram.org/bot<TOKEN>/getUpdates
```
El campo `message.chat.id` es el que necesitas (puede ser negativo para grupos/canales).

### Ficheros implicados

| Fichero | Descripción |
|---------|-------------|
| [`src/tasks/duplicateReport.js`](../src/tasks/duplicateReport.js) | Lógica de agregación y envío |
| [`src/tasks/scheduler.js`](../src/tasks/scheduler.js) | Registro del cron job con `node-cron` |

### Lógica del reporte

1. Ejecuta un pipeline de agregación en MongoDB sobre la colección `pendientes`.
2. Agrupa por campo `url`, filtra grupos con `count > 1`.
3. Ordena por número de duplicados (descendente).
4. Formatea un mensaje Markdown con la lista de URLs duplicadas y sus títulos.
5. Envía el mensaje a Telegram vía `POST https://api.telegram.org/bot<TOKEN>/sendMessage`.

Si no se encuentran duplicados, envía igualmente un mensaje de confirmación (✅ sin duplicados).

### Comportamiento cuando Telegram no está configurado

Si `TELEGRAM_TOKEN` o `TELEGRAM_CHAT_ID` están vacíos, la tarea se ejecuta pero omite el envío, registrando un aviso `⚠️` en los logs.

---

## Propuestas de fusión de etiquetas similares

Cada **domingo a las 12:00** (zona horaria `Europe/Madrid`) el scheduler analiza todas las etiquetas únicas de las colecciones `pendientes` y `links`, detecta pares similares y crea propuestas de fusión para revisión manual.

### Lógica de detección

Los pares se detectan por las siguientes reglas (insensible a mayúsculas):
- Un tag es el otro más un sufijo común: `s`, `es`, `ies`, `ing`, `ed`, `er`, `ers`, `d`, `r`.
- Pluralización `-y → -ies` (p.ej. `category` → `categories`).
- Forma progresiva con -e: `write` → `writing`.
- Distancia de Levenshtein = 1 para tags con ≥ 6 caracteres (captura variantes ortográficas).

### Flujo completo

1. Se obtienen los conteos de cada tag en ambas colecciones.
2. Se comparan todos los pares con las reglas anteriores.
3. Se descartan pares que ya tengan una propuesta `pending` en la BD.
4. Las nuevas propuestas se insertan en la colección `tag_merge_proposals` con estado `pending`.
5. Se envía una notificación por Telegram con el resumen.
6. El administrador accede a **Admin → Fusión de etiquetas** (`/admin/tag-merges`) para aprobar o rechazar cada propuesta individualmente.
7. Al aprobar: todos los documentos con la etiqueta `dropTag` reciben `keepTag` (la etiqueta dominante) y `dropTag` se elimina, sin duplicar.
8. Al rechazar: la propuesta se marca como `rejected` sin tocar los documentos.

### Ficheros implicados

| Fichero | Descripción |
|---------|-------------|
| [`src/tasks/tagMerge.js`](../src/tasks/tagMerge.js) | Lógica de detección, inserción de propuestas y notificación Telegram |
| [`src/tasks/scheduler.js`](../src/tasks/scheduler.js) | Registro del cron job (`tagMergeProposals`) |
| [`src/routes/admin.js`](../src/routes/admin.js) | Rutas de revisión: `GET /admin/tag-merges`, `POST /admin/tag-merges/:id/approve`, `POST /admin/tag-merges/:id/reject` |
| [`views/admin-tag-merges.ejs`](../views/admin-tag-merges.ejs) | Panel de revisión de propuestas |
| `src/db.js` | `getProposalsCollection()` — acceso a `tag_merge_proposals` |


### Ejecución manual (desarrollo / pruebas)

```js
// En una consola Node.js con el .env cargado:
require('dotenv').config();
// Conectar BD antes (normalmente lo hace server.js)
const { runDuplicateReport } = require('./src/tasks/duplicateReport');
runDuplicateReport();
```

### Horario del cron

Expresión: `30 10 * * 0`

| Campo | Valor | Significado |
|-------|-------|-------------|
| minuto | 30 | :30 |
| hora | 10 | 10:00 |
| día del mes | * | cualquiera |
| mes | * | cualquiera |
| día de la semana | 0 | domingo |

Zona horaria configurada: `Europe/Madrid`.
