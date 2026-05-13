# Docker — Despliegue

## Requisitos

- Docker Engine 24+
- Docker Compose v2+
- Una red Docker externa llamada `web` (usada por el proxy inverso)

```bash
docker network create web   # solo si no existe
```

## Arrancar con docker-compose

```bash
# Variables de entorno necesarias como build args (repositorio privado)
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=usuario/repo docker-compose up -d --build
```

O añadir las variables en el entorno del host o en un `.env` en la raíz antes de ejecutar:

```bash
docker-compose up -d --build
```

El build usa el código del workspace actual, así que cualquier cambio local entra en la imagen al reconstruir.

## Fichero `docker-compose.yml`

El contenedor expone el puerto **3005** internamente y lo conecta a la red `web`. Ver [`docker-compose.yml`](../docker-compose.yml) para la configuración completa.

## Imagen base

`node:20-alpine` — imagen ligera de Node.js 20.

## Variables de entorno en contenedor

Pasa las variables del [setup.md](setup.md) como variables de entorno al contenedor o monta un fichero `.env`:

```yaml
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://...
  - SESSION_SECRET=...
  - TRUST_PROXY=1
  # resto de variables
```

## Reinicio automático

El servicio tiene `restart: always` — se reiniciará ante fallos o reinicios del host.

## Logs

```bash
docker-compose logs -f articulos
```

## Rebuild tras cambios de código

```bash
docker-compose up -d --build
```
