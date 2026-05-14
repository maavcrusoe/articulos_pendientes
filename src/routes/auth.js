const { Router } = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getUsersCollection } = require('../db');
const { appLogger } = require('../logger');

const router = Router();

// Rate limiter de login: aplicado sólo al POST, no al GET de la página
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
});

// Rate limiter de registro: 5 cuentas por IP por hora
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Demasiados registros desde esta IP. Intenta de nuevo en una hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Login page
router.get('/admin/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('login', { error: null });
});

// Login POST
router.post('/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('login', { error: 'Usuario y contraseña son requeridos' });
        }

        // Limitar longitud de entrada para prevenir ataques de DoS sobre bcrypt
        if (String(username).length > 100 || String(password).length > 200) {
            appLogger.warn(`⚠️ Login rechazado por longitud excesiva de campos. IP: ${req.ip}`);
            return res.render('login', { error: 'Credenciales incorrectas' });
        }

        const user = await getUsersCollection().findOne({ username: username.toLowerCase().trim() });
        if (!user || !await bcrypt.compare(password, user.password)) {
            appLogger.warn(`⚠️ Intento de login fallido. Usuario: ${String(username).toLowerCase().trim()} | IP: ${req.ip}`);
            return res.render('login', { error: 'Credenciales incorrectas' });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Error regenerando sesión:', err);
                return res.render('login', { error: 'Error del servidor' });
            }
            req.session.user = { id: user._id, username: user.username, role: user.role };
            appLogger.info(`✅ Login exitoso. Usuario: ${user.username} | IP: ${req.ip}`);
            res.redirect('/admin');
        });
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.render('login', { error: 'Error del servidor' });
    }
});

// Register page
router.get('/admin/register', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('register', { error: null, success: null });
});

// Register POST
router.post('/admin/register', registerLimiter, async (req, res) => {
    try {
        const { username, password, password2 } = req.body;
        if (!username || !password || !password2) {
            return res.render('register', { error: 'Todos los campos son requeridos', success: null });
        }
        // Limitar longitud de entrada para prevenir DoS sobre bcrypt
        if (String(password).length > 200 || String(username).length > 100) {
            return res.render('register', { error: 'Los campos superarán la longitud máxima permitida', success: null });
        }
        if (password !== password2) {
            return res.render('register', { error: 'Las contraseñas no coinciden', success: null });
        }
        if (password.length < 8) {
            return res.render('register', { error: 'La contraseña debe tener al menos 8 caracteres', success: null });
        }
        if (username.trim().length < 3 || username.trim().length > 30) {
            return res.render('register', { error: 'El usuario debe tener entre 3 y 30 caracteres', success: null });
        }

        const normalizedUsername = username.toLowerCase().trim();
        const existing = await getUsersCollection().findOne({ username: normalizedUsername });
        if (existing) {
            return res.render('register', { error: 'El usuario ya existe', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await getUsersCollection().insertOne({
            username: normalizedUsername,
            password: hashedPassword,
            role: 'user',
            createdAt: new Date()
        });

        res.render('register', { error: null, success: 'Usuario creado correctamente. Ahora puedes iniciar sesión.' });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.render('register', { error: 'Error del servidor', success: null });
    }
});

// Logout
router.get('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
