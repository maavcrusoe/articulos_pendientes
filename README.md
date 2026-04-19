# 📚 Panel de Artículos - MongoDB Viewer

Panel de control visual y sencillo para visualizar y buscar artículos almacenados en MongoDB.

## 🚀 Características

### Búsqueda Avanzada
- **Búsqueda multi-campo**: Busca simultáneamente en título, contenido, URL y etiquetas
- **Concatenación de palabras**: Soporta búsquedas con múltiples palabras (ej: "javascript react")
- **Búsqueda en tiempo real**: Resultados actualizados mientras escribes
- **Resaltado de términos**: Los términos buscados se destacan en los resultados

### Filtrado Inteligente
- Filtrado por etiquetas
- Filtrado por categorías temáticas
- Combinación de filtros (búsqueda + etiquetas + categorías)

### Optimizaciones
- **Índices MongoDB**: Búsquedas optimizadas con índices de texto
- **Consultas paralelas**: Múltiples consultas ejecutadas simultáneamente
- **Caché de colección**: Referencia directa a la colección para mejor rendimiento
- **Proyecciones**: Solo se cargan los campos necesarios

### UI/UX Mejorada
- Animaciones suaves y escalonadas
- Indicador visual de búsqueda activa
- Atajos de teclado:
  - `Ctrl + K`: Enfocar búsqueda
  - `Ctrl + ←/→`: Navegar páginas
- Efectos hover mejorados
- Responsive design

## 📦 Instalación

```bash
npm install
```

## ⚙️ Configuración

Crear archivo `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=tu_basedatos
CollectionName=pendientes
ITEMS_PER_PAGE=10
```

## 🏃 Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## 🔍 Uso de Búsqueda

### Ejemplos de Búsqueda:

1. **Una palabra**: `javascript`
   - Busca "javascript" en todos los campos

2. **Múltiples palabras**: `react native tutorial`
   - Busca artículos que contengan "react" Y "native" Y "tutorial" en cualquier combinación

3. **Por URL**: `github.com`
   - Encuentra artículos con URLs de GitHub

4. **Por etiquetas**: Usa los filtros de etiquetas en la sidebar

5. **Combinada**: Texto en búsqueda + filtros de etiquetas/categorías

## 📊 Estadísticas

El panel muestra automáticamente:
- Artículos de hoy
- Artículos de ayer
- Artículos de esta semana
- Artículos de este mes
- Artículos de la semana pasada

## 🎨 Categorías Temáticas

- 🚀 Tecnología
- 💻 Desarrollo
- 🔐 Seguridad
- 💼 Negocios
- ⚙️ DevOps
- 📊 Datos & Analytics
- 🛒 eCommerce

## 🔧 Mejoras Técnicas Aplicadas

### Backend
1. **Índices de MongoDB**: Índices de texto en múltiples campos para búsquedas rápidas
2. **Búsqueda optimizada**: Función `buildAdvancedSearchQuery()` para búsquedas complejas
3. **Consultas paralelas**: Uso de `Promise.all()` para múltiples consultas
4. **Mejor manejo de errores**: Logs descriptivos con emojis
5. **API endpoint**: `/api/search` para búsquedas AJAX

### Frontend
1. **Debounce mejorado**: Búsqueda optimizada con delay ajustable
2. **Resaltado de términos**: Highlighting automático de palabras buscadas
3. **Animaciones**: Efectos visuales suaves y profesionales
4. **Atajos de teclado**: Navegación rápida
5. **Indicador de carga**: Feedback visual durante búsquedas

### Estructura del Código
1. **Separación de funciones**: Código más modular y mantenible
2. **Comentarios descriptivos**: Documentación clara
3. **Variables globales optimizadas**: Reutilización de conexión MongoDB
4. **Código DRY**: Eliminación de duplicación

## 📁 Estructura del Proyecto

```
articulos_pendientes/
├── public/
│   ├── script.js      # Lógica frontend
│   └── style.css      # Estilos
├── views/
│   ├── index.ejs      # Lista de artículos
│   ├── articulo.ejs   # Vista individual
│   └── error.ejs      # Página de error
├── server.js          # Servidor Express
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .env
```

## 🐳 Docker

```bash
docker-compose up -d
```

## 📝 Formato de Datos MongoDB

```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  url: String,
  tags: [String],
  date: ISODate
}
```

## 🤝 Contribución

Las mejoras están enfocadas en:
- Performance de búsqueda
- Experiencia de usuario
- Optimización de consultas
- Código limpio y mantenible

## 📄 Licencia

ISC
