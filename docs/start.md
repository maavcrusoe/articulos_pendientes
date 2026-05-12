# Arrancar la aplicación

## Producción (Node.js directo)

```bash
# Asegúrate de que el fichero .env esté configurado (ver setup.md)
npm start
```

El servidor escucha en el puerto definido por `PORT` (por defecto `3000`).

## Variables críticas antes de arrancar en producción

| Variable | Valor recomendado |
|----------|-------------------|
| `SESSION_SECRET` | Cadena aleatoria larga (mín. 32 chars) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | URI completa con credenciales |

## Comprobaciones al arranque

El servidor ejecuta automáticamente al iniciar:

1. **Conexión a MongoDB** — falla con error si no puede conectar.
2. **Creación de índices** en `pendientes`, `links` y `users`.
3. **Seed del usuario admin** — crea `admin/admin123` si no existe ningún usuario. Cámbialo en `/admin`.
4. **Inicialización del scheduler** — registra la tarea cron dominical (ver [synctasks.md](synctasks.md)).

## Producción con Docker

Ver [docker.md](docker.md).

## Panel de administración

Accede a `/admin/login` con las credenciales de administrador para gestionar usuarios y acceder a los paneles de Notion.
