const express = require('express');
const session = require('express-session');
const path = require('path');
const { testConnection } = require('./database/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - ORDEM IMPORTA!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs de requisições para debug
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('Body:', JSON.stringify(req.body, null, 2));
        }
    }
    next();
});

app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'garimpo_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Rotas
const produtosRoutes = require('./routes/produtos');
const categoriasRoutes = require('./routes/categorias');
const cliquesRoutes = require('./routes/cliques');
const adminRoutes = require('./routes/admin');

// IMPORTANTE: Admin routes primeiro (rotas mais específicas)
app.use('/api/admin', adminRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/cliques', cliquesRoutes);

// Rota de redirecionamento de afiliado
app.get('/redirect/:id', async (req, res) => {
    try {
        const { pool } = require('./database/database');
        const produtoId = req.params.id;
        
        console.log(`[REDIRECT] Produto ID: ${produtoId}`);
        
        const [produtos] = await pool.execute(
            'SELECT link_afiliado, ativo FROM produtos WHERE id = ?',
            [produtoId]
        );
        
        if (produtos.length === 0 || !produtos[0].ativo) {
            console.log(`[REDIRECT] Produto não encontrado ou inativo`);
            return res.redirect('/');
        }
        
        // Registrar clique
        const userAgent = req.headers['user-agent'] || '';
        const origem = req.headers['referer'] || '';
        
        await pool.execute(
            'INSERT INTO cliques (produto_id, data_hora, origem, user_agent) VALUES (?, NOW(), ?, ?)',
            [produtoId, origem, userAgent]
        );
        
        console.log(`[REDIRECT] Redirecionando para: ${produtos[0].link_afiliado}`);
        res.redirect(produtos[0].link_afiliado);
    } catch (error) {
        console.error('[REDIRECT] Erro:', error);
        res.redirect('/');
    }
});

// Rotas de páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/produto/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produto.html'));
});

app.get('/categoria/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'categoria.html'));
});

app.get('/ofertas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'categoria.html'));
});

app.get('/busca', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'busca.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    if (req.session.admin) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ 
        success: false, 
        error: err.message || 'Erro interno do servidor' 
    });
});

// Iniciar servidor
async function startServer() {
    console.log('\n=== GARIMPO IA - Iniciando servidor ===\n');
    
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('✗ Não foi possível conectar ao banco de dados.');
        console.error('✗ Verifique:');
        console.error('  - Se o MySQL está rodando');
        console.error('  - Se as credenciais no .env estão corretas');
        console.error('  - Se o banco garimpo_ia existe');
        process.exit(1);
    }
    
    // Criar usuário admin padrão se não existir
    const { pool } = require('./database/database');
    try {
        const [admins] = await pool.execute('SELECT id FROM usuarios LIMIT 1');
        if (admins.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.execute(
                'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
                ['Administrador', 'admin@garimpoia.com', hash]
            );
            console.log('✓ Usuário admin criado: admin@garimpoia.com / admin123');
        } else {
            console.log('✓ Usuário admin já existe');
        }
    } catch (error) {
        console.error('✗ Erro ao verificar/criar usuário admin:', error.message);
    }
    
    app.listen(PORT, () => {
        console.log(`\n✓ Servidor rodando em http://localhost:${PORT}`);
        console.log(`✓ Painel admin em http://localhost:${PORT}/admin`);
        console.log(`✓ Login: admin@garimpoia.com / admin123\n`);
    });
}

startServer();