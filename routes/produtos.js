const express = require('express');
const router = express.Router();
const { pool } = require('../database/database');

console.log('[ROUTES] produtos.js carregado');

// Whitelist de ordenações
const ORDENACOES = {
    'destaque': 'p.destaque DESC, p.criado_em DESC',
    'recentes': 'p.criado_em DESC',
    'mais_recentes': 'p.criado_em DESC',
    'menor_preco': 'p.preco ASC',
    'maior_preco': 'p.preco DESC',
    'maior_desconto': 'CASE WHEN p.preco_anterior > 0 THEN ((p.preco_anterior - p.preco) / p.preco_anterior) ELSE 0 END DESC',
    'melhor_score': 'COALESCE(p.score_ia, 0) DESC, p.criado_em DESC',
    'melhor_avaliacao': 'COALESCE(p.avaliacao, 0) DESC, p.criado_em DESC',
    'mais_acessados': 'p.criado_em DESC'
};

function validarLimite(valor) {
    const parsed = parseInt(valor, 10);
    if (isNaN(parsed) || parsed < 1) return 40;
    return Math.min(parsed, 100);
}

function validarPagina(valor) {
    const parsed = parseInt(valor, 10);
    if (isNaN(parsed) || parsed < 1) return 1;
    return parsed;
}

function validarId(valor) {
    if (!valor) return null;
    const parsed = parseInt(valor, 10);
    if (isNaN(parsed) || parsed < 1) return null;
    return parsed;
}

// ========================================
// ACHADO DO DIA
// ========================================
router.get('/destaque/dia', async (req, res) => {
    try {
        const [produtos] = await pool.execute(
            `SELECT p.*, l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                    l.cor_primaria as loja_cor, c.nome as categoria_nome
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.destaque = TRUE AND p.ativo = TRUE
             ORDER BY p.score_ia DESC NULLS LAST, p.criado_em DESC
             LIMIT 1`
        );
        
        res.json(produtos[0] || null);
    } catch (error) {
        console.error('[GET] Erro /destaque/dia:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// PRODUTOS POPULARES
// ========================================
router.get('/populares', async (req, res) => {
    try {
        const limite = validarLimite(req.query.limite);
        const [produtos] = await pool.execute(
            `SELECT p.*, l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                    l.cor_primaria as loja_cor, c.nome as categoria_nome
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.ativo = TRUE
             ORDER BY COALESCE(p.score_ia, 0) DESC, p.destaque DESC, p.criado_em DESC
             LIMIT ${limite}`
        );
        res.json(produtos);
    } catch (error) {
        console.error('[GET] Erro /populares:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// RELACIONADOS
// ========================================
router.get('/:id/relacionados', async (req, res) => {
    try {
        const produtoId = parseInt(req.params.id, 10);
        if (isNaN(produtoId)) return res.status(400).json({ error: 'ID inválido' });
        
        const limite = validarLimite(req.query.limite || 4);
        
        const [produtoAtual] = await pool.execute(
            'SELECT categoria_id FROM produtos WHERE id = ?',
            [produtoId]
        );
        
        if (produtoAtual.length === 0) return res.json([]);
        
        const [produtos] = await pool.execute(
            `SELECT p.*, l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                    l.cor_primaria as loja_cor, c.nome as categoria_nome
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.categoria_id = ? AND p.id != ? AND p.ativo = TRUE
             ORDER BY RAND()
             LIMIT ${limite}`,
            [produtoAtual[0].categoria_id, produtoId]
        );
        
        res.json(produtos);
    } catch (error) {
        console.error('[GET] Erro /relacionados:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// LISTAR PRODUTOS (COM FILTROS COMPLETOS)
// ========================================
router.get('/', async (req, res) => {
    try {
        const { categoria, loja, destaque, ordenar, busca, preco_min, preco_max } = req.query;
        const limite = validarLimite(req.query.limite);
        const pagina = validarPagina(req.query.pagina);
        const offset = (pagina - 1) * limite;
        
        let query = `SELECT 
                        p.id, p.nome, p.slug, p.descricao, p.preco, p.preco_anterior,
                        p.imagem, p.link_afiliado, p.categoria_id, p.loja_id,
                        p.destaque, p.ativo, p.criado_em, p.avaliacao,
                        p.quantidade_avaliacoes, p.score_ia, p.descricao_ia,
                        l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                        l.cor_primaria as loja_cor,
                        c.nome as categoria_nome
                     FROM produtos p
                     LEFT JOIN lojas l ON p.loja_id = l.id
                     LEFT JOIN categorias c ON p.categoria_id = c.id
                     WHERE p.ativo = TRUE`;
        
        const params = [];
        
        // Filtro categoria
        if (categoria) {
            if (categoria === 'ofertas') {
                query += ' AND p.preco_anterior IS NOT NULL AND p.preco_anterior > p.preco';
            } else {
                const catId = validarId(categoria);
                if (catId) {
                    query += ' AND p.categoria_id = ?';
                    params.push(catId);
                }
            }
        }
        
        // Filtro loja
        if (loja) {
            if (loja.match(/^\d+$/)) {
                const lojaId = parseInt(loja, 10);
                query += ' AND p.loja_id = ?';
                params.push(lojaId);
            } else {
                // Buscar por slug
                const [lojaRow] = await pool.execute(
                    'SELECT id FROM lojas WHERE slug = ? AND ativo = TRUE',
                    [loja]
                );
                if (lojaRow.length > 0) {
                    query += ' AND p.loja_id = ?';
                    params.push(lojaRow[0].id);
                }
            }
        }
        
        // Filtro destaque
        if (destaque === 'true') {
            query += ' AND p.destaque = TRUE';
        }
        
        // Filtro busca
        if (busca && busca.trim() !== '') {
            query += ' AND (p.nome LIKE ? OR p.descricao LIKE ? OR p.descricao_ia LIKE ?)';
            const buscaLike = `%${busca.trim()}%`;
            params.push(buscaLike, buscaLike, buscaLike);
        }
        
        // Filtro preço mínimo
        if (preco_min) {
            const min = parseFloat(preco_min);
            if (!isNaN(min) && min >= 0) {
                query += ' AND p.preco >= ?';
                params.push(min);
            }
        }
        
        // Filtro preço máximo
        if (preco_max) {
            const max = parseFloat(preco_max);
            if (!isNaN(max) && max >= 0) {
                query += ' AND p.preco <= ?';
                params.push(max);
            }
        }
        
        // Ordenação
        const ordenacaoSql = ORDENACOES[ordenar] || ORDENACOES.destaque;
        query += ` ORDER BY ${ordenacaoSql}`;
        
        query += ` LIMIT ${limite} OFFSET ${offset}`;
        
        const [produtos] = await pool.execute(query, params);
        res.json(produtos);
        
    } catch (error) {
        console.error('[GET] Erro na listagem:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// BUSCAR POR SLUG
// ========================================
router.get('/:slug', async (req, res) => {
    try {
        const [produtos] = await pool.execute(
            `SELECT p.*, 
                    l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                    l.cor_primaria as loja_cor, l.url as loja_url,
                    c.nome as categoria_nome, c.slug as categoria_slug,
                    (SELECT COUNT(*) FROM cliques WHERE produto_id = p.id) as total_cliques
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.slug = ? AND p.ativo = TRUE`,
            [req.params.slug]
        );
        
        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(produtos[0]);
    } catch (error) {
        console.error('[GET] Erro /:slug:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;