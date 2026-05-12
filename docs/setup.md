# Configuración del entorno

Crea un fichero `.env` en la raíz del proyecto con las siguientes variables:

## Variables obligatorias

```env
MONGODB_URI=mongodb://usuario:password@host:27017/
DB_NAME=articulos
CollectionName=pendientes
NOTION_API=ntn_xxxxxxxxxxxxxxxxxxxx
NOTION_TABLE=https://www.notion.so/workspace/xxxxxxxx
```

## Variables opcionales

```env
PORT=3000                          # Puerto del servidor (por defecto 3000)
ITEMS_PER_PAGE=20                  # Artículos por página (por defecto 10)
SESSION_SECRET=clave_secreta_larga # Secreto de sesión — OBLIGATORIO en producción
NODE_ENV=production                # Activa cookies seguras en producción
NOTION_DATA_SOURCE_ID=xxxx-xxxx   # ID del data source de Notion (se auto-detecta si se omite)
```

## Variables para Telegram (reporte semanal)

```env
TELEGRAM_TOKEN=123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
TELEGRAM_CHAT_ID=-100123456789
```

Para obtener el token crea un bot con [@BotFather](https://t.me/botfather).  
Para obtener el chat ID reenvía un mensaje al bot y consulta `https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Variables para Docker (build de repositorio privado)

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=usuario/articulos_pendientes
```

## Notas de seguridad

- `SESSION_SECRET` debe ser una cadena aleatoria larga. Si no se configura, se genera una temporal y las sesiones no sobrevivirán reinicios del servidor.
- El usuario admin por defecto (`admin` / `admin123`) se crea en el primer arranque. **Cámbialo inmediatamente en producción** desde el panel `/admin`.
- `MONGODB_URI` puede incluir usuario y contraseña; nunca la cometas en el repositorio.
