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
