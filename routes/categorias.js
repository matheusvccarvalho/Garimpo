const express = require('express');
const router = express.Router();
const { pool } = require('../database/database');

// Listar categorias ativas
router.get('/', async (req, res) => {
    try {
        const [categorias] = await pool.execute(
            'SELECT * FROM categorias WHERE ativo = TRUE ORDER BY nome ASC'
        );
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro ao carregar categorias' });
    }
});

// Buscar categoria por slug
router.get('/:slug', async (req, res) => {
    try {
        const [categorias] = await pool.execute(
            'SELECT * FROM categorias WHERE slug = ? AND ativo = TRUE',
            [req.params.slug]
        );
        
        if (categorias.length === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json(categorias[0]);
    } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        res.status(500).json({ error: 'Erro ao carregar categoria' });
    }
});

module.exports = router;