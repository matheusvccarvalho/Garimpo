const express = require('express');
const router = express.Router();
const { pool } = require('../database/database');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');
const slugify = require('slugify');

console.log('[ROUTES] admin.js carregado - VERSÃO CORRIGIDA');

// ========================================
// FUNÇÃO AUXILIAR: Validar produto
// ========================================
function validarProduto(body) {
    const erros = [];
    
    // Nome obrigatório
    if (!body.nome || body.nome.trim() === '') {
        erros.push('Nome é obrigatório');
    }
    
    // Preço obrigatório e numérico
    const preco = parseFloat(body.preco);
    if (isNaN(preco) || preco <= 0) {
        erros.push('Preço deve ser um número maior que zero');
    }
    
    // Link de afiliado obrigatório
    if (!body.link_afiliado || body.link_afiliado.trim() === '') {
        erros.push('Link de afiliado é obrigatório');
    }
    
    // Categoria obrigatória e numérica
    const categoriaId = parseInt(body.categoria_id, 10);
    if (isNaN(categoriaId) || categoriaId < 1) {
        erros.push('Categoria inválida');
    }
    
    // Preço anterior opcional (se fornecido, deve ser número)
    let precoAnterior = null;
    if (body.preco_anterior !== null && body.preco_anterior !== undefined && body.preco_anterior !== '') {
        precoAnterior = parseFloat(body.preco_anterior);
        if (isNaN(precoAnterior) || precoAnterior < 0) {
            erros.push('Preço anterior inválido');
            precoAnterior = null;
        }
    }
    
    // Imagem opcional (pode ser vazia ou URL válida)
    let imagem = null;
    if (body.imagem && body.imagem.trim() !== '') {
        imagem = body.imagem.trim();
        if (!imagem.startsWith('http')) {
            erros.push('Imagem deve ser uma URL válida começando com http');
            imagem = null;
        }
    }
    
    // Descrição opcional
    const descricao = body.descricao ? body.descricao.trim() : '';
    
    // Destaque e ativo (booleanos)
    const destaque = body.destaque === true || body.destaque === 1 || body.destaque === '1';
    const ativo = body.ativo === true || body.ativo === 1 || body.ativo === '1';
    
    return {
        valido: erros.length === 0,
        erros,
        dados: {
            nome: body.nome ? body.nome.trim() : '',
            descricao,
            preco,
            preco_anterior: precoAnterior,
            imagem,
            link_afiliado: body.link_afiliado ? body.link_afiliado.trim() : '',
            categoria_id: categoriaId,
            destaque,
            ativo
        }
    };
}

// ========================================
// LOGIN
// ========================================
router.post('/login', async (req, res) => {
    try {
        console.log('[POST] /api/admin/login');
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e senha são obrigatórios' 
            });
        }
        
        const [usuarios] = await pool.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (usuarios.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenciais inválidas' 
            });
        }
        
        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        
        if (!senhaValida) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenciais inválidas' 
            });
        }
        
        req.session.admin = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        };
        
        console.log(`[POST] Login bem-sucedido: ${email}`);
        res.json({ 
            success: true, 
            admin: req.session.admin 
        });
    } catch (error) {
        console.error('[POST] Erro no login:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao fazer login' 
        });
    }
});

// ========================================
// LOGOUT
// ========================================
router.post('/logout', (req, res) => {
    console.log('[POST] /api/admin/logout');
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// ========================================
// DASHBOARD
// ========================================
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        console.log('[GET] /api/admin/dashboard');
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        seteDiasAtras.setHours(0, 0, 0, 0);
        
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        trintaDiasAtras.setHours(0, 0, 0, 0);
        
        const [totalProdutos] = await pool.execute('SELECT COUNT(*) as total FROM produtos');
        const [produtosAtivos] = await pool.execute('SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE');
        const [cliquesHoje] = await pool.execute('SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?', [hoje]);
        const [cliques7Dias] = await pool.execute('SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?', [seteDiasAtras]);
        const [cliques30Dias] = await pool.execute('SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?', [trintaDiasAtras]);
        const [totalCliques] = await pool.execute('SELECT COUNT(*) as total FROM cliques');
        
        const [produtoMaisClicado] = await pool.execute(
            `SELECT p.nome, COUNT(c.id) as total_cliques
             FROM produtos p 
             LEFT JOIN cliques c ON p.id = c.produto_id 
             GROUP BY p.id 
             ORDER BY total_cliques DESC 
             LIMIT 1`
        );
        
        const [categoriaMaisAcessada] = await pool.execute(
            `SELECT cat.nome, COUNT(c.id) as total_cliques
             FROM categorias cat
             LEFT JOIN produtos p ON cat.id = p.categoria_id
             LEFT JOIN cliques c ON p.id = c.produto_id
             GROUP BY cat.id 
             ORDER BY total_cliques DESC 
             LIMIT 1`
        );
        
        res.json({
            totalProdutos: totalProdutos[0].total,
            produtosAtivos: produtosAtivos[0].total,
            cliquesHoje: cliquesHoje[0].total,
            cliques7Dias: cliques7Dias[0].total,
            cliques30Dias: cliques30Dias[0].total,
            totalCliques: totalCliques[0].total,
            produtoMaisClicado: produtoMaisClicado[0] || null,
            categoriaMaisAcessada: categoriaMaisAcessada[0] || null
        });
    } catch (error) {
        console.error('[GET] Erro no dashboard:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao carregar dashboard' 
        });
    }
});

// ========================================
// LISTAR PRODUTOS (ADMIN)
// ========================================
router.get('/produtos', requireAdmin, async (req, res) => {
    try {
        console.log('[GET] /api/admin/produtos');
        
        const [produtos] = await pool.execute(
            `SELECT p.*, c.nome as categoria_nome 
             FROM produtos p 
             LEFT JOIN categorias c ON p.categoria_id = c.id 
             ORDER BY p.criado_em DESC`
        );
        
        console.log(`[GET] ${produtos.length} produtos carregados`);
        res.json(produtos);
    } catch (error) {
        console.error('[GET] Erro ao listar produtos:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao carregar produtos' 
        });
    }
});

// ========================================
// BUSCAR PRODUTO POR ID (ADMIN)
// ========================================
router.get('/produtos/:id', requireAdmin, async (req, res) => {
    try {
        const produtoId = parseInt(req.params.id, 10);
        if (isNaN(produtoId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        console.log(`[GET] /api/admin/produtos/${produtoId}`);
        
        const [produtos] = await pool.execute(
            'SELECT * FROM produtos WHERE id = ?',
            [produtoId]
        );
        
        if (produtos.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Produto não encontrado' 
            });
        }
        
        res.json(produtos[0]);
    } catch (error) {
        console.error('[GET] Erro ao buscar produto:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao carregar produto' 
        });
    }
});

// ========================================
// CRIAR PRODUTO - VALIDAÇÃO RIGOROSA
// ========================================
router.post('/produtos', requireAdmin, async (req, res) => {
    console.log('[POST] ═══════════════════════════════════════');
    console.log('[POST] /api/admin/produtos');
    console.log('[POST] Body recebido:', JSON.stringify(req.body, null, 2));
    
    try {
        // VALIDAR DADOS
        const validacao = validarProduto(req.body);
        
        if (!validacao.valido) {
            console.error('[POST] ❌ Validação falhou:', validacao.erros);
            return res.status(400).json({ 
                success: false, 
                error: validacao.erros.join('; ') 
            });
        }
        
        const dados = validacao.dados;
        console.log('[POST] Dados validados:', dados);
        
        // VERIFICAR SE CATEGORIA EXISTE
        const [categorias] = await pool.execute(
            'SELECT id FROM categorias WHERE id = ?',
            [dados.categoria_id]
        );
        
        if (categorias.length === 0) {
            console.error(`[POST] ❌ Categoria ${dados.categoria_id} não existe`);
            return res.status(400).json({ 
                success: false, 
                error: 'Categoria não encontrada' 
            });
        }
        
        // GERAR SLUG ÚNICO
        const slug = slugify(dados.nome, { lower: true, strict: true });
        const [existentes] = await pool.execute(
            'SELECT id FROM produtos WHERE slug = ?',
            [slug]
        );
        
        const slugFinal = existentes.length > 0 ? `${slug}-${Date.now()}` : slug;
        
        // INSERT
        const query = `INSERT INTO produtos 
            (nome, slug, descricao, preco, preco_anterior, imagem, link_afiliado, categoria_id, destaque, ativo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            dados.nome,
            slugFinal,
            dados.descricao,
            dados.preco,
            dados.preco_anterior,
            dados.imagem,
            dados.link_afiliado,
            dados.categoria_id,
            dados.destaque ? 1 : 0,
            dados.ativo ? 1 : 0
        ];
        
        console.log('[POST] Executando INSERT...');
        const [result] = await pool.execute(query, params);
        
        console.log(`[POST] ✓ Produto criado: ID ${result.insertId} - ${dados.nome}`);
        console.log('[POST] ═══════════════════════════════════════');
        
        res.status(201).json({ 
            success: true, 
            message: 'Produto criado com sucesso',
            produto: { 
                id: result.insertId,
                slug: slugFinal
            }
        });
        
    } catch (error) {
        console.error('[POST] ═══════════════════════════════════════');
        console.error('[POST] ❌ ERRO AO CRIAR PRODUTO');
        console.error('[POST] Mensagem:', error.message);
        console.error('[POST] Code:', error.code);
        console.error('[POST] Errno:', error.errno);
        console.error('[POST] SQL State:', error.sqlState);
        console.error('[POST] Stack:', error.stack);
        console.error('[POST] ═══════════════════════════════════════');
        
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar produto',
            details: error.message 
        });
    }
});

// ========================================
// ATUALIZAR PRODUTO - VALIDAÇÃO RIGOROSA
// ========================================
router.put('/produtos/:id', requireAdmin, async (req, res) => {
    console.log('[PUT] ═══════════════════════════════════════');
    console.log(`[PUT] /api/admin/produtos/${req.params.id}`);
    console.log('[PUT] Body recebido:', JSON.stringify(req.body, null, 2));
    
    try {
        const produtoId = parseInt(req.params.id, 10);
        if (isNaN(produtoId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        // VALIDAR DADOS
        const validacao = validarProduto(req.body);
        
        if (!validacao.valido) {
            console.error('[PUT] ❌ Validação falhou:', validacao.erros);
            return res.status(400).json({ 
                success: false, 
                error: validacao.erros.join('; ') 
            });
        }
        
        const dados = validacao.dados;
        
        // VERIFICAR SE CATEGORIA EXISTE
        const [categorias] = await pool.execute(
            'SELECT id FROM categorias WHERE id = ?',
            [dados.categoria_id]
        );
        
        if (categorias.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Categoria não encontrada' 
            });
        }
        
        // GERAR SLUG ÚNICO
        const slug = slugify(dados.nome, { lower: true, strict: true });
        const [existentes] = await pool.execute(
            'SELECT id FROM produtos WHERE slug = ? AND id != ?',
            [slug, produtoId]
        );
        
        const slugFinal = existentes.length > 0 ? `${slug}-${Date.now()}` : slug;
        
        // UPDATE
        const query = `UPDATE produtos 
            SET nome = ?, slug = ?, descricao = ?, preco = ?, preco_anterior = ?, 
                imagem = ?, link_afiliado = ?, categoria_id = ?, destaque = ?, ativo = ?
            WHERE id = ?`;
        
        const params = [
            dados.nome,
            slugFinal,
            dados.descricao,
            dados.preco,
            dados.preco_anterior,
            dados.imagem,
            dados.link_afiliado,
            dados.categoria_id,
            dados.destaque ? 1 : 0,
            dados.ativo ? 1 : 0,
            produtoId
        ];
        
        console.log('[PUT] Executando UPDATE...');
        const [result] = await pool.execute(query, params);
        
        console.log(`[PUT] ✓ Produto atualizado: ID ${produtoId}`);
        console.log(`[PUT] Linhas afetadas: ${result.affectedRows}`);
        console.log('[PUT] ═══════════════════════════════════════');
        
        res.json({ 
            success: true, 
            message: 'Produto atualizado com sucesso',
            produto: { slug: slugFinal }
        });
        
    } catch (error) {
        console.error('[PUT] ═══════════════════════════════════════');
        console.error('[PUT] ❌ ERRO AO ATUALIZAR PRODUTO');
        console.error('[PUT] Mensagem:', error.message);
        console.error('[PUT] Code:', error.code);
        console.error('[PUT] Stack:', error.stack);
        console.error('[PUT] ═══════════════════════════════════════');
        
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar produto',
            details: error.message 
        });
    }
});

// ========================================
// DELETAR PRODUTO
// ========================================
router.delete('/produtos/:id', requireAdmin, async (req, res) => {
    try {
        const produtoId = parseInt(req.params.id, 10);
        if (isNaN(produtoId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        console.log(`[DELETE] /api/admin/produtos/${produtoId}`);
        
        const [result] = await pool.execute(
            'DELETE FROM produtos WHERE id = ?', 
            [produtoId]
        );
        
        console.log(`[DELETE] ✓ Produto deletado: ID ${produtoId}`);
        console.log(`[DELETE] Linhas afetadas: ${result.affectedRows}`);
        
        res.json({ 
            success: true, 
            message: 'Produto deletado com sucesso' 
        });
    } catch (error) {
        console.error('[DELETE] Erro ao deletar produto:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar produto' 
        });
    }
});

// ========================================
// CATEGORIAS (MANTER SIMPLES)
// ========================================
router.get('/categorias', requireAdmin, async (req, res) => {
    try {
        const [categorias] = await pool.execute(
            'SELECT * FROM categorias ORDER BY nome ASC'
        );
        res.json(categorias);
    } catch (error) {
        console.error('[GET] Erro ao listar categorias:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao carregar categorias' 
        });
    }
});

router.post('/categorias', requireAdmin, async (req, res) => {
    try {
        const { nome, descricao, imagem, ativo } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Nome é obrigatório' 
            });
        }
        
        const slug = slugify(nome, { lower: true, strict: true });
        
        const [result] = await pool.execute(
            'INSERT INTO categorias (nome, slug, descricao, imagem, ativo) VALUES (?, ?, ?, ?, ?)',
            [nome.trim(), slug, descricao || '', imagem || '', ativo !== false ? 1 : 0]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Categoria criada com sucesso',
            categoria: { id: result.insertId }
        });
    } catch (error) {
        console.error('[POST] Erro ao criar categoria:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar categoria' 
        });
    }
});

router.put('/categorias/:id', requireAdmin, async (req, res) => {
    try {
        const { nome, descricao, imagem, ativo } = req.body;
        const slug = slugify(nome, { lower: true, strict: true });
        
        await pool.execute(
            'UPDATE categorias SET nome = ?, slug = ?, descricao = ?, imagem = ?, ativo = ? WHERE id = ?',
            [nome, slug, descricao || '', imagem || '', ativo !== false ? 1 : 0, req.params.id]
        );
        
        res.json({ 
            success: true, 
            message: 'Categoria atualizada com sucesso' 
        });
    } catch (error) {
        console.error('[PUT] Erro ao atualizar categoria:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar categoria' 
        });
    }
});

router.delete('/categorias/:id', requireAdmin, async (req, res) => {
    try {
        await pool.execute('DELETE FROM categorias WHERE id = ?', [req.params.id]);
        res.json({ 
            success: true, 
            message: 'Categoria deletada com sucesso' 
        });
    } catch (error) {
        console.error('[DELETE] Erro ao deletar categoria:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar categoria' 
        });
    }
});
// ========================================
// CRUD DE LOJAS (ADMIN)
// ========================================

router.get('/lojas', requireAdmin, async (req, res) => {
    try {
        const [lojas] = await pool.execute(
            `SELECT l.*,
                    (SELECT COUNT(*) FROM produtos WHERE loja_id = l.id) as total_produtos,
                    (SELECT COUNT(*) FROM produtos WHERE loja_id = l.id AND ativo = TRUE) as produtos_ativos
             FROM lojas l
             ORDER BY l.nome ASC`
        );
        res.json(lojas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/lojas', requireAdmin, async (req, res) => {
    try {
        const { nome, logo, url, cor_primaria, cor_secundaria, ativo } = req.body;
        
        if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
        
        const slug = require('slugify')(nome, { lower: true, strict: true });
        
        const [result] = await pool.execute(
            `INSERT INTO lojas (nome, slug, logo, url, cor_primaria, cor_secundaria, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nome, slug, logo || '', url || '', cor_primaria || '#666666', cor_secundaria || '#FFFFFF', ativo !== false ? 1 : 0]
        );
        
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/lojas/:id', requireAdmin, async (req, res) => {
    try {
        const { nome, logo, url, cor_primaria, cor_secundaria, ativo } = req.body;
        const slug = require('slugify')(nome, { lower: true, strict: true });
        
        await pool.execute(
            `UPDATE lojas SET nome = ?, slug = ?, logo = ?, url = ?, 
             cor_primaria = ?, cor_secundaria = ?, ativo = ? WHERE id = ?`,
            [nome, slug, logo || '', url || '', cor_primaria || '#666666', cor_secundaria || '#FFFFFF', ativo !== false ? 1 : 0, req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/lojas/:id', requireAdmin, async (req, res) => {
    try {
        await pool.execute('DELETE FROM lojas WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// DASHBOARD ATUALIZADO (substituir rota existente)
// ========================================
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        
        const [totalProdutos] = await pool.execute('SELECT COUNT(*) as total FROM produtos');
        const [produtosAtivos] = await pool.execute('SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE');
        const [produtosDestaque] = await pool.execute('SELECT COUNT(*) as total FROM produtos WHERE destaque = TRUE AND ativo = TRUE');
        
        const [cliquesHoje] = await pool.execute('SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?', [hoje]);
        const [cliques7Dias] = await pool.execute('SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?', [seteDiasAtras]);
        const [totalCliques] = await pool.execute('SELECT COUNT(*) as total FROM cliques');
        
        // Estatísticas por loja
        const [statsLojas] = await pool.execute(
            `SELECT l.nome, l.slug, COUNT(p.id) as total, 
                    SUM(CASE WHEN p.ativo = TRUE THEN 1 ELSE 0 END) as ativos
             FROM lojas l
             LEFT JOIN produtos p ON l.id = p.loja_id
             GROUP BY l.id, l.nome, l.slug`
        );
        
        // Melhores achados IA
        const [melhoresIA] = await pool.execute(
            `SELECT p.id, p.nome, p.score_ia, p.preco, l.nome as loja_nome
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             WHERE p.ativo = TRUE AND p.score_ia IS NOT NULL
             ORDER BY p.score_ia DESC
             LIMIT 5`
        );
        
        res.json({
            totalProdutos: totalProdutos[0].total,
            produtosAtivos: produtosAtivos[0].total,
            produtosDestaque: produtosDestaque[0].total,
            cliquesHoje: cliquesHoje[0].total,
            cliques7Dias: cliques7Dias[0].total,
            totalCliques: totalCliques[0].total,
            statsLojas,
            melhoresIA
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ATUALIZAR CRIAÇÃO DE PRODUTO (substituir POST /produtos)
// ========================================
router.post('/produtos', requireAdmin, async (req, res) => {
    try {
        const {
            nome, descricao, preco, preco_anterior, imagem, link_afiliado,
            categoria_id, loja_id, avaliacao, quantidade_avaliacoes,
            score_ia, descricao_ia, destaque, ativo
        } = req.body;
        
        if (!nome || !preco || !link_afiliado) {
            return res.status(400).json({ error: 'Campos obrigatórios: nome, preco, link_afiliado' });
        }
        
        const slug = require('slugify')(nome, { lower: true, strict: true });
        const [existentes] = await pool.execute('SELECT id FROM produtos WHERE slug = ?', [slug]);
        const slugFinal = existentes.length > 0 ? `${slug}-${Date.now()}` : slug;
        
        const [result] = await pool.execute(
            `INSERT INTO produtos 
                (nome, slug, descricao, preco, preco_anterior, imagem, link_afiliado,
                 categoria_id, loja_id, avaliacao, quantidade_avaliacoes,
                 score_ia, descricao_ia, destaque, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome, slugFinal, descricao || '', preco,
                preco_anterior || null, imagem || '', link_afiliado,
                categoria_id || null, loja_id || null,
                avaliacao || null, quantidade_avaliacoes || 0,
                score_ia || null, descricao_ia || '',
                destaque === true ? 1 : 0, ativo === true ? 1 : 0
            ]
        );
        
        res.status(201).json({ success: true, id: result.insertId, slug: slugFinal });
    } catch (error) {
        console.error('[POST] Erro ao criar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ATUALIZAR PRODUTO (substituir PUT /produtos/:id)
// ========================================
router.put('/produtos/:id', requireAdmin, async (req, res) => {
    try {
        const {
            nome, descricao, preco, preco_anterior, imagem, link_afiliado,
            categoria_id, loja_id, avaliacao, quantidade_avaliacoes,
            score_ia, descricao_ia, destaque, ativo
        } = req.body;
        
        const slug = require('slugify')(nome, { lower: true, strict: true });
        
        await pool.execute(
            `UPDATE produtos SET 
                nome = ?, slug = ?, descricao = ?, preco = ?, preco_anterior = ?,
                imagem = ?, link_afiliado = ?, categoria_id = ?, loja_id = ?,
                avaliacao = ?, quantidade_avaliacoes = ?,
                score_ia = ?, descricao_ia = ?, destaque = ?, ativo = ?
             WHERE id = ?`,
            [
                nome, slug, descricao || '', preco, preco_anterior || null,
                imagem || '', link_afiliado, categoria_id || null, loja_id || null,
                avaliacao || null, quantidade_avaliacoes || 0,
                score_ia || null, descricao_ia || '',
                destaque === true ? 1 : 0, ativo === true ? 1 : 0,
                req.params.id
            ]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('[PUT] Erro ao atualizar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ROTA DE ANÁLISE IA (PLACEHOLDER)
// ========================================
router.post('/ia/analisar', requireAdmin, async (req, res) => {
    try {
        const { nome, descricao, preco, preco_anterior, avaliacao, quantidade_avaliacoes } = req.body;
        
        // Algoritmo simples de score baseado em fatores reais
        let score = 5.0;
        const analise = [];
        
        // Desconto (até +2 pontos)
        if (preco_anterior && preco_anterior > preco) {
            const desconto = ((preco_anterior - preco) / preco_anterior) * 100;
            if (desconto >= 30) { score += 2.0; analise.push(`Excelente desconto de ${desconto.toFixed(0)}%`); }
            else if (desconto >= 20) { score += 1.5; analise.push(`Bom desconto de ${desconto.toFixed(0)}%`); }
            else if (desconto >= 10) { score += 1.0; analise.push(`Desconto de ${desconto.toFixed(0)}%`); }
        }
        
        // Avaliação (até +2 pontos)
        if (avaliacao && avaliacao >= 4.5) { score += 2.0; analise.push('Avaliação excelente dos compradores'); }
        else if (avaliacao && avaliacao >= 4.0) { score += 1.5; analise.push('Boa avaliação dos compradores'); }
        else if (avaliacao && avaliacao >= 3.5) { score += 1.0; analise.push('Avaliação mediana'); }
        
        // Quantidade de avaliações (até +1 ponto)
        if (quantidade_avaliacoes >= 1000) { score += 1.0; analise.push('Mais de 1000 avaliações - produto validado'); }
        else if (quantidade_avaliacoes >= 100) { score += 0.5; analise.push('Bom número de avaliações'); }
        
        score = Math.min(Math.max(score, 1), 10);
        
        let classificacao = 'Achado regular';
        if (score >= 9) classificacao = 'Achado excepcional! 🏆';
        else if (score >= 7.5) classificacao = 'Ótima oportunidade 🔥';
        else if (score >= 6) classificacao = 'Bom achado';
        
        res.json({
            success: true,
            score: parseFloat(score.toFixed(1)),
            classificacao,
            analise,
            descricao_ia: analise.length > 0 ? analise.join('. ') + '.' : 'Análise básica do produto.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;