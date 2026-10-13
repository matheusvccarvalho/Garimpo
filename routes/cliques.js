const express = require('express');
const router = express.Router();
const { pool } = require('../database/database');

// Registrar clique (usado internamente)
router.post('/', async (req, res) => {
    try {
        const { produto_id, origem, user_agent } = req.body;
        
        await pool.execute(
            'INSERT INTO cliques (produto_id, data_hora, origem, user_agent) VALUES (?, NOW(), ?, ?)',
            [produto_id, origem || '', user_agent || '']
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao registrar clique:', error);
        res.status(500).json({ error: 'Erro ao registrar clique' });
    }
});

// Estatísticas de cliques (para admin)
router.get('/estatisticas', async (req, res) => {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        seteDiasAtras.setHours(0, 0, 0, 0);
        
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        trintaDiasAtras.setHours(0, 0, 0, 0);
        
        // Cliques hoje
        const [cliquesHoje] = await pool.execute(
            'SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?',
            [hoje]
        );
        
        // Cliques últimos 7 dias
        const [cliques7Dias] = await pool.execute(
            'SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?',
            [seteDiasAtras]
        );
        
        // Cliques últimos 30 dias
        const [cliques30Dias] = await pool.execute(
            'SELECT COUNT(*) as total FROM cliques WHERE data_hora >= ?',
            [trintaDiasAtras]
        );
        
        // Total de cliques
        const [totalCliques] = await pool.execute(
            'SELECT COUNT(*) as total FROM cliques'
        );
        
        // Produtos mais clicados
        const [produtosMaisClicados] = await pool.execute(
            `SELECT p.id, p.nome, p.slug, COUNT(c.id) as total_cliques
            FROM produtos p 
            LEFT JOIN cliques c ON p.id = c.produto_id 
            GROUP BY p.id 
            ORDER BY total_cliques DESC 
            LIMIT 10`
        );
        
        res.json({
            cliquesHoje: cliquesHoje[0].total,
            cliques7Dias: cliques7Dias[0].total,
            cliques30Dias: cliques30Dias[0].total,
            totalCliques: totalCliques[0].total,
            produtosMaisClicados
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
});

module.exports = router;