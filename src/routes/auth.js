const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { getUsersCollection } = require('../db');

const router = Router();

// Login page
router.get('/admin/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('login', { error: null });
});

// Login POST
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('login', { error: 'Usuario y contraseña son requeridos' });
        }

        const user = await getUsersCollection().findOne({ username: username.toLowerCase().trim() });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.render('login', { error: 'Credenciales incorrectas' });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Error regenerando sesión:', err);
                return res.render('login', { error: 'Error del servidor' });
            }
            req.session.user = { id: user._id, username: user.username, role: user.role };
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
router.post('/admin/register', async (req, res) => {
    try {
        const { username, password, password2 } = req.body;
        if (!username || !password || !password2) {
            return res.render('register', { error: 'Todos los campos son requeridos', success: null });
        }
        if (password !== password2) {
            return res.render('register', { error: 'Las contraseñas no coinciden', success: null });
        }
        if (password.length < 6) {
            return res.render('register', { error: 'La contraseña debe tener al menos 6 caracteres', success: null });
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
