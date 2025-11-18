FROM node:20-alpine

# Solo instalar git para clonar el repositorio
RUN apk add --no-cache git

# Argumentos para el build
ARG GITHUB_TOKEN
ARG GITHUB_REPO

WORKDIR /app

# Clonar el repositorio
RUN if [ -n "$GITHUB_TOKEN" ]; then \
    echo "Clonando repositorio privado con token..." && \
    git clone https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git . ; \
    else \
    echo "ERROR: Se requiere GITHUB_TOKEN para repositorios privados" && exit 1 ; \
    fi

# Limpiar archivos de git
RUN rm -rf .git

# Instalar solo las dependencias de producción
RUN npm install --production

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]