const express = require('express');
const router = express.Router();
const { pool } = require('../database/database');

// GET /api/lojas - listar lojas ativas (público)
router.get('/', async (req, res) => {
    try {
        const [lojas] = await pool.execute(
            `SELECT l.*, 
                    (SELECT COUNT(*) FROM produtos WHERE loja_id = l.id AND ativo = TRUE) as total_produtos
             FROM lojas l 
             WHERE l.ativo = TRUE 
             ORDER BY l.nome ASC`
        );
        res.json(lojas);
    } catch (error) {
        console.error('[LOJAS] Erro:', error.message);
        res.status(500).json({ error: 'Erro ao carregar lojas' });
    }
});

// GET /api/lojas/:slug - buscar loja por slug
router.get('/:slug', async (req, res) => {
    try {
        const [lojas] = await pool.execute(
            'SELECT * FROM lojas WHERE slug = ? AND ativo = TRUE',
            [req.params.slug]
        );
        
        if (lojas.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        
        res.json(lojas[0]);
    } catch (error) {
        console.error('[LOJAS] Erro:', error.message);
        res.status(500).json({ error: 'Erro ao carregar loja' });
    }
});

// GET /api/lojas/:slug/produtos - produtos de uma loja
router.get('/:slug/produtos', async (req, res) => {
    try {
        const { limite = 40, ordenar = 'destaque' } = req.query;
        
        // Buscar loja pelo slug
        const [loja] = await pool.execute(
            'SELECT id FROM lojas WHERE slug = ? AND ativo = TRUE',
            [req.params.slug]
        );
        
        if (loja.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        
        // Ordenação segura (whitelist)
        const ordenacoes = {
            'destaque': 'p.destaque DESC, p.criado_em DESC',
            'recentes': 'p.criado_em DESC',
            'menor_preco': 'p.preco ASC',
            'maior_preco': 'p.preco DESC',
            'maior_desconto': 'CASE WHEN p.preco_anterior > 0 THEN ((p.preco_anterior - p.preco) / p.preco_anterior) ELSE 0 END DESC',
            'melhor_score': 'p.score_ia DESC NULLS LAST, p.criado_em DESC',
            'melhor_avaliacao': 'p.avaliacao DESC NULLS LAST, p.criado_em DESC'
        };
        
        const orderBy = ordenacoes[ordenar] || ordenacoes.destaque;
        const limiteNum = Math.min(Math.max(parseInt(limite) || 40, 1), 100);
        
        const [produtos] = await pool.execute(
            `SELECT p.*, l.nome as loja_nome, l.slug as loja_slug, l.logo as loja_logo,
                    l.cor_primaria as loja_cor, c.nome as categoria_nome
             FROM produtos p
             LEFT JOIN lojas l ON p.loja_id = l.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.ativo = TRUE AND p.loja_id = ?
             ORDER BY ${orderBy}
             LIMIT ${limiteNum}`,
            [loja[0].id]
        );
        
        res.json(produtos);
    } catch (error) {
        console.error('[LOJAS] Erro ao listar produtos:', error.message);
        res.status(500).json({ error: 'Erro ao carregar produtos' });
    }
});

module.exports = router;