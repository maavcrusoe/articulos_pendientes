# Instalación

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js | 20.x |
| npm | 9.x |
| MongoDB | 5.x o superior (instancia accesible en red) |

## Pasos

```bash
# 1. Clonar el repositorio
git clone <url-repo>
cd articulos_pendientes

# 2. Instalar dependencias
npm install

# 3. Crear fichero de entorno
cp .env.example .env   # o crear manualmente (ver setup.md)
```

## Dependencias principales

| Paquete | Uso |
|---------|-----|
| `express` | Servidor HTTP |
| `ejs` | Motor de plantillas |
| `mongodb` | Driver de MongoDB |
| `express-session` + `bcryptjs` | Autenticación |
| `helmet` + `express-rate-limit` | Seguridad HTTP |
| `@notionhq/client` | Integración Notion |
| `node-cron` | Tareas programadas |
| `dotenv` | Variables de entorno |
| `nodemon` | Recarga automática en desarrollo |

Después de instalar, continúa con [setup.md](setup.md).
