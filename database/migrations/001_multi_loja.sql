-- ========================================
-- MIGRATION: Multi-loja + Score IA
-- Garimpo IA → Achadinhos
-- ========================================

USE garimpo_ia;

-- ========================================
-- 1. TABELA DE LOJAS
-- ========================================
CREATE TABLE IF NOT EXISTS lojas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo VARCHAR(500),
    url VARCHAR(500),
    cor_primaria VARCHAR(20) DEFAULT '#666666',
    cor_secundaria VARCHAR(20) DEFAULT '#FFFFFF',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir lojas iniciais
INSERT INTO lojas (nome, slug, logo, url, cor_primaria, cor_secundaria, ativo) VALUES
('Shopee', 'shopee', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Shopee_logo.svg/200px-Shopee_logo.svg.png', 'https://shopee.com.br', '#EE4D2D', '#FFFFFF', TRUE),
('Mercado Livre', 'mercado-livre', 'https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.18.7/mercadolibre/logo_large_plus.png', 'https://www.mercadolivre.com.br', '#FFE600', '#2D3277', TRUE),
('Amazon', 'amazon', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png', 'https://www.amazon.com.br', '#FF9900', '#232F3E', FALSE),
('AliExpress', 'aliexpress', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/AliExpress_logo.svg/200px-AliExpress_logo.svg.png', 'https://pt.aliexpress.com', '#E62E04', '#FFFFFF', FALSE)
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

-- ========================================
-- 2. ADICIONAR NOVOS CAMPOS EM PRODUTOS
-- ========================================

-- Adicionar loja_id (primeiro sem FK para permitir NULL durante migração)
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS loja_id INT NULL AFTER id,
ADD COLUMN IF NOT EXISTS avaliacao DECIMAL(3,2) NULL AFTER preco_anterior,
ADD COLUMN IF NOT EXISTS quantidade_avaliacoes INT NULL DEFAULT 0 AFTER avaliacao,
ADD COLUMN IF NOT EXISTS score_ia DECIMAL(3,1) NULL AFTER quantidade_avaliacoes,
ADD COLUMN IF NOT EXISTS descricao_ia TEXT NULL AFTER score_ia;

-- ========================================
-- 3. PREENCHER loja_id DOS PRODUTOS EXISTENTES
-- ========================================
-- Assume que produtos existentes são da Shopee (id=1)
UPDATE produtos SET loja_id = 1 WHERE loja_id IS NULL;

-- ========================================
-- 4. ADICIONAR FK DEPOIS DE PREENCHER
-- ========================================
ALTER TABLE produtos 
ADD CONSTRAINT fk_produtos_loja 
FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE SET NULL;

-- ========================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ========================================
ALTER TABLE produtos 
ADD INDEX idx_loja_id (loja_id),
ADD INDEX idx_avaliacao (avaliacao),
ADD INDEX idx_score_ia (score_ia);

-- ========================================
-- 6. VIEW DE ESTATÍSTICAS (OPCIONAL)
-- ========================================
CREATE OR REPLACE VIEW vw_stats_lojas AS
SELECT 
    l.id AS loja_id,
    l.nome AS loja_nome,
    COUNT(p.id) AS total_produtos,
    SUM(CASE WHEN p.ativo = TRUE THEN 1 ELSE 0 END) AS produtos_ativos,
    SUM(CASE WHEN p.destaque = TRUE AND p.ativo = TRUE THEN 1 ELSE 0 END) AS produtos_destaque,
    AVG(p.score_ia) AS score_medio_ia
FROM lojas l
LEFT JOIN produtos p ON l.id = p.loja_id
GROUP BY l.id, l.nome;

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================