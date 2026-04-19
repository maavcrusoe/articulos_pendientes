const { Router } = require('express');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getUsersCollection } = require('../db');
const { requireAdmin } = require('../middleware');
const { normalizeUsername, isValidObjectId } = require('../utils');

const router = Router();

async function getAdminUsers() {
    const users = await getUsersCollection()
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    return users.map((user) => ({ ...user, id: user._id.toString() }));
}

async function renderAdminUsers(res, options = {}) {
    const users = await getAdminUsers();
    const totalAdmins = users.filter((u) => u.role === 'admin').length;
    res.render('admin', {
        users,
        totalAdmins,
        error: options.error || null,
        success: options.success || null,
    });
}

// Panel admin
router.get('/admin', requireAdmin, async (req, res) => {
    try {
        await renderAdminUsers(res);
    } catch (error) {
        console.error('❌ Error cargando panel admin:', error);
        res.status(500).render('error', { error: 'Error cargando los usuarios' });
    }
});

// Crear usuario
router.post('/admin/users', requireAdmin, async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || '');
        const role = req.body.role === 'admin' ? 'admin' : 'user';

        if (!username || !password) {
            return renderAdminUsers(res, { error: 'Usuario y contraseña son obligatorios.' });
        }
        if (password.length < 6) {
            return renderAdminUsers(res, { error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const existingUser = await getUsersCollection().findOne({ username });
        if (existingUser) {
            return renderAdminUsers(res, { error: 'Ese nombre de usuario ya existe.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await getUsersCollection().insertOne({ username, password: hashedPassword, role, createdAt: new Date() });
        await renderAdminUsers(res, { success: 'Usuario creado correctamente.' });
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo crear el usuario.' });
    }
});

// Actualizar usuario
router.post('/admin/users/:id/update', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!isValidObjectId(userId)) {
            return renderAdminUsers(res, { error: 'ID de usuario no válido.' });
        }

        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || '');
        const role = req.body.role === 'admin' ? 'admin' : 'user';
        const existingUser = await getUsersCollection().findOne({ _id: new ObjectId(userId) });

        if (!existingUser) return renderAdminUsers(res, { error: 'El usuario no existe.' });
        if (!username) return renderAdminUsers(res, { error: 'El nombre de usuario es obligatorio.' });

        const duplicatedUser = await getUsersCollection().findOne({ username, _id: { $ne: new ObjectId(userId) } });
        if (duplicatedUser) return renderAdminUsers(res, { error: 'Ya existe otro usuario con ese nombre.' });

        const adminCount = await getUsersCollection().countDocuments({ role: 'admin' });
        const isSelf = String(existingUser._id) === String(req.session.user.id);

        if (existingUser.role === 'admin' && role !== 'admin' && adminCount <= 1) {
            return renderAdminUsers(res, { error: 'Debe existir al menos un administrador.' });
        }
        if (isSelf && role !== 'admin') {
            return renderAdminUsers(res, { error: 'No puedes quitarte a ti mismo el rol de administrador.' });
        }

        const update = { username, role };
        if (password) {
            if (password.length < 6) return renderAdminUsers(res, { error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            update.password = await bcrypt.hash(password, 12);
        }

        await getUsersCollection().updateOne({ _id: new ObjectId(userId) }, { $set: update });
        if (isSelf) {
            req.session.user.username = username;
            req.session.user.role = role;
        }

        await renderAdminUsers(res, { success: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo actualizar el usuario.' });
    }
});

// Eliminar usuario
router.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!isValidObjectId(userId)) {
            return renderAdminUsers(res, { error: 'ID de usuario no válido.' });
        }

        const existingUser = await getUsersCollection().findOne({ _id: new ObjectId(userId) });
        if (!existingUser) return renderAdminUsers(res, { error: 'El usuario no existe.' });

        if (String(existingUser._id) === String(req.session.user.id)) {
            return renderAdminUsers(res, { error: 'No puedes eliminar tu propio usuario.' });
        }

        const adminCount = await getUsersCollection().countDocuments({ role: 'admin' });
        if (existingUser.role === 'admin' && adminCount <= 1) {
            return renderAdminUsers(res, { error: 'No puedes eliminar el último administrador.' });
        }

        await getUsersCollection().deleteOne({ _id: new ObjectId(userId) });
        await renderAdminUsers(res, { success: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        await renderAdminUsers(res, { error: 'No se pudo eliminar el usuario.' });
    }
});

module.exports = router;
