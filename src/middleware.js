function requireLogin(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/admin/login');
}

function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    if (req.session.user) {
        return res.status(403).render('error', { error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    res.redirect('/admin/login');
}

module.exports = { requireLogin, requireAdmin };
