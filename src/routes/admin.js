const { Router } = require('express');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { getUsersCollection, getCollection, getLinksCollection } = require('../db');
const { requireAdmin } = require('../middleware');
const { normalizeUsername, isValidObjectId } = require('../utils');
const { getTaskRegistry, runTaskById, updateTaskState } = require('../tasks/scheduler');
const { findDuplicateUrls, formatDuplicateGroups } = require('../tasks/duplicateReport');

const CONFIG_PATH = path.join(__dirname, '../../prompt/config.json');

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
    res.render('admin-users', {
        users,
        totalAdmins,
        error: options.error || null,
        success: options.success || null,
    });
}

function buildDuplicateTaskResult(groups) {
    return {
        duplicateGroups: groups.length,
        removableItems: groups.reduce((total, group) => total + (group.deleteCount || 0), 0),
        groups,
    };
}

async function renderTasksPage(res, options = {}) {
    const tasks = getTaskRegistry();
    res.render('admin-tasks', {
        tasks,
        error: options.error || null,
        success: options.success || null,
    });
}

// ---- Dashboard ----
router.get('/admin', requireAdmin, async (req, res) => {
    try {
        const [pendientesCol, linksCol, usersCol] = [getCollection(), getLinksCollection(), getUsersCollection()];

        const [totalPendientes, totalLinks, linksUntagged, totalUsers, tagAgg] = await Promise.all([
            pendientesCol.countDocuments({}),
            linksCol.countDocuments({}),
            linksCol.countDocuments({ $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] }),
            usersCol.countDocuments({}),
            linksCol.aggregate([
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 60 },
            ]).toArray(),
        ]);

        // Scale tag cloud: font-size from 0.75rem to 2.2rem
        const maxCount = tagAgg.length ? tagAgg[0].count : 1;
        const minCount = tagAgg.length ? tagAgg[tagAgg.length - 1].count : 1;
        const spread = Math.max(maxCount - minCount, 0);
        const tags = tagAgg.map((t) => ({
            name: t._id,
            count: t.count,
            sizeClass: Math.min(6, Math.max(1, 1 + Math.round(((spread === 0 ? 0.5 : (t.count - minCount) / spread) * 5)))),
        }));

        res.render('admin', {
            totalPendientes,
            totalLinks,
            linksUntagged,
            totalUsers,
            tags,
        });
    } catch (error) {
        console.error('❌ Error cargando dashboard admin:', error);
        res.status(500).render('error', { error: 'Error cargando el dashboard' });
    }
});

// ---- Users ----
router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        await renderAdminUsers(res);
    } catch (error) {
        console.error('❌ Error cargando panel usuarios:', error);
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

// ---- Tasks ----
router.get('/admin/tasks', requireAdmin, async (req, res) => {
    try {
        await renderTasksPage(res);
    } catch (error) {
        console.error('❌ Error cargando panel de tareas:', error);
        res.status(500).render('error', { error: 'Error cargando el panel de tareas' });
    }
});

router.post('/admin/tasks/:id/run', requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;
        await runTaskById(taskId);
        await renderTasksPage(res, { success: `Tarea "${taskId}" ejecutada.` });
    } catch (error) {
        console.error('❌ Error ejecutando tarea:', error);
        await renderTasksPage(res, { error: error.message || 'No se pudo ejecutar la tarea.' });
    }
});

router.post('/admin/tasks/duplicateUrls/delete', requireAdmin, async (req, res) => {
    try {
        const selectedUrls = [req.body.urls].flat().map((value) => String(value || '').trim()).filter(Boolean);
        if (!selectedUrls.length) {
            return renderTasksPage(res, { error: 'Selecciona al menos una URL duplicada para eliminar sus copias más nuevas.' });
        }

        const collection = getCollection();
        const articles = await collection.find(
            { url: { $in: selectedUrls } },
            { projection: { _id: 1, url: 1, title: 1, date: 1 } }
        ).sort({ url: 1, _id: 1 }).toArray();

        const grouped = new Map();
        for (const article of articles) {
            const key = String(article.url || '').trim();
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(article);
        }

        const idsToDelete = [];
        for (const items of grouped.values()) {
            if (items.length > 1) {
                idsToDelete.push(...items.slice(1).map((item) => item._id));
            }
        }

        if (!idsToDelete.length) {
            return renderTasksPage(res, { error: 'No se encontraron duplicados eliminables para la selección actual.' });
        }

        const result = await collection.deleteMany({ _id: { $in: idsToDelete } });
        const remainingGroups = formatDuplicateGroups(await findDuplicateUrls());
        updateTaskState('duplicateUrls', {
            lastRun: new Date(),
            lastStatus: 'ok',
            lastMessage: `${remainingGroups.length} URL duplicadas, ${remainingGroups.reduce((total, group) => total + group.deleteCount, 0)} elemento(s) eliminable(s)`,
            lastResult: buildDuplicateTaskResult(remainingGroups),
        });

        await renderTasksPage(res, {
            success: `Se eliminaron ${result.deletedCount} elemento(s) duplicados, manteniendo siempre el más antiguo por URL.`,
        });
    } catch (error) {
        console.error('❌ Error eliminando duplicados:', error);
        await renderTasksPage(res, { error: error.message || 'No se pudieron eliminar los duplicados seleccionados.' });
    }
});

// ---- Config LLM ----
router.get('/admin/config', requireAdmin, (req, res) => {
    try {
        let config = { model: 'llama3.2', prompt: '' };
        if (fs.existsSync(CONFIG_PATH)) {
            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
        res.render('admin-config', { config, error: null, success: null });
    } catch (error) {
        console.error('❌ Error cargando configuración LLM:', error);
        res.status(500).render('error', { error: 'Error cargando la configuración LLM' });
    }
});

router.post('/admin/config', requireAdmin, (req, res) => {
    const model = String(req.body.model || '').trim();
    const prompt = String(req.body.prompt || '').trim();
    if (!model) {
        return res.render('admin-config', { config: { model, prompt }, error: 'El nombre del modelo es obligatorio.', success: null });
    }
    try {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ model, prompt }, null, 2), 'utf8');
        res.render('admin-config', { config: { model, prompt }, error: null, success: 'Configuración guardada correctamente.' });
    } catch (error) {
        console.error('❌ Error guardando configuración LLM:', error);
        res.render('admin-config', { config: { model, prompt }, error: 'No se pudo guardar la configuración.', success: null });
    }
});

module.exports = router;
