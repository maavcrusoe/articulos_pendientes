const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const { connectDB, getUsersCollection } = require('./src/db');
const { buildQueryString } = require('./src/utils');

// Rutas
const articlesRoutes = require('./src/routes/articles');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const notionRoutes = require('./src/routes/notion');

const app = express();
const port = process.env.PORT || 3000;

// ========== SEGURIDAD ==========
// Helmet: cabeceras HTTP de seguridad
app.use(helmet({
    contentSecurityPolicy: false, // desactivar CSP estricto para EJS inline scripts
}));

// Limitar peticiones globales
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Limitar intentos de login (protección contra fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/admin/login', loginLimiter);

// ========== MIDDLEWARE GENERAL ==========
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.set('view engine', 'ejs');

// Generar SESSION_SECRET aleatorio si no se configura (con advertencia)
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    console.warn('⚠️  SESSION_SECRET no configurado en .env. Usando secreto temporal. Configúralo para producción.');
}

app.use(session({
    secret: sessionSecret || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
    }
}));

// Hacer session y helpers disponibles en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.buildQueryString = buildQueryString;
    next();
});

// ========== RUTAS ==========
app.use(articlesRoutes);
app.use(apiRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(notionRoutes);

// 404
app.use((req, res) => {
    res.status(404).render('error', { error: 'Página no encontrada' });
});

// Error handler global
app.use((err, req, res, _next) => {
    console.error('❌ Error no controlado:', err);
    res.status(500).render('error', { error: 'Error interno del servidor' });
});

// ========== ARRANQUE ==========
connectDB().then(async () => {
    // Seed admin user si no existe ninguno
    try {
        const usersCollection = getUsersCollection();
        const adminExists = await usersCollection.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await usersCollection.insertOne({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date()
            });
            console.log('⚠️  Usuario admin creado con contraseña por defecto. ¡Cámbiala inmediatamente!');
        }
    } catch (e) {
        console.error('⚠️ Error creando usuario admin:', e.message);
    }

    app.listen(port, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('❌ No se pudo arrancar la aplicación:', err);
    process.exit(1);
});