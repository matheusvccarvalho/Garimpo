function requireAdmin(req, res, next) {
    console.log('[AUTH] Verificando autenticação...');
    console.log('[AUTH] Session:', req.session);
    
    if (req.session && req.session.admin) {
        console.log('[AUTH] Usuário autenticado:', req.session.admin.email);
        return next();
    }
    
    console.log('[AUTH] Usuário não autenticado');
    return res.status(401).json({ 
        success: false, 
        error: 'Não autorizado. Faça login.' 
    });
}

module.exports = { requireAdmin };