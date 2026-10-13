-- ========================================
-- GARIMPO IA - Banco de Dados
-- Versão: 1.0.0
-- ========================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS garimpo_ia 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE garimpo_ia;

-- ========================================
-- TABELA: usuarios (administradores)
-- ========================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABELA: categorias
-- ========================================
DROP TABLE IF EXISTS categorias;
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    descricao TEXT,
    imagem VARCHAR(500),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABELA: produtos
-- ========================================
DROP TABLE IF EXISTS produtos;
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    preco_anterior DECIMAL(10, 2),
    imagem VARCHAR(500),
    link_afiliado VARCHAR(1000) NOT NULL,
    categoria_id INT,
    destaque BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_categoria (categoria_id),
    INDEX idx_destaque (destaque),
    INDEX idx_ativo (ativo),
    INDEX idx_criado_em (criado_em),
    INDEX idx_preco (preco),
    INDEX idx_preco_anterior (preco_anterior)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABELA: cliques (rastreamento)
-- ========================================
DROP TABLE IF EXISTS cliques;
CREATE TABLE cliques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    origem VARCHAR(255),
    user_agent VARCHAR(500),
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    INDEX idx_produto_id (produto_id),
    INDEX idx_data_hora (data_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- DADOS INICIAIS: CATEGORIAS
-- ========================================
INSERT INTO categorias (nome, slug, descricao, imagem, ativo) VALUES
('Tecnologia', 'tecnologia', 'Gadgets, acessórios e produtos tech inovadores', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', TRUE),
('Casa', 'casa', 'Produtos para deixar sua casa mais prática e organizada', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', TRUE),
('Eletrônicos', 'eletronicos', 'Eletrônicos e dispositivos com ótimo custo-benefício', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400', TRUE),
('Games', 'games', 'Acessórios e produtos para gamers', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', TRUE),
('Automotivo', 'automotivo', 'Produtos para seu veículo', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400', TRUE),
('Moda', 'moda', 'Acessórios e produtos de moda', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', TRUE),
('Agro', 'agro', 'Produtos para o campo e jardinagem', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400', TRUE),
('Pesca', 'pesca', 'Equipamentos e acessórios para pesca', 'https://images.unsplash.com/photo-1545579133-99bbdabfc5bd?w=400', TRUE),
('Presentes', 'presentes', 'Ideias criativas para presentear', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400', TRUE),
('Para Casais', 'para-casais', 'Produtos românticos e criativos para casais', 'https://images.unsplash.com/photo-1518281361980-b26bfd556770?w=400', TRUE);

-- ========================================
-- DADOS INICIAIS: PRODUTOS FICTÍCIOS
-- IMPORTANTE: Substitua os links de afiliado
-- pelos seus próprios links da Shopee!
-- ========================================
INSERT INTO produtos (nome, slug, descricao, preco, preco_anterior, imagem, link_afiliado, categoria_id, destaque, ativo) VALUES
('Fone Bluetooth Pro', 'fone-bluetooth-pro', 'Fone de ouvido Bluetooth com cancelamento de ruído ativo, bateria de longa duração e som premium. Ideal para quem busca qualidade de áudio profissional.', 89.90, 149.90, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 'https://exemplo.com/afiliado-fone-bluetooth', 1, TRUE, TRUE),
('Smartwatch Fitness', 'smartwatch-fitness', 'Relógio inteligente com monitoramento cardíaco, GPS integrado e mais de 100 modos esportivos. Bateria que dura até 14 dias.', 199.90, 299.90, 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=600', 'https://exemplo.com/afiliado-smartwatch', 1, TRUE, TRUE),
('Luminária LED Inteligente', 'luminaria-led-inteligente', 'Luminária de mesa com controle via aplicativo, ajuste de cor e intensidade. Perfeita para home office e leitura.', 79.90, 129.90, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', 'https://exemplo.com/afiliado-luminaria', 2, FALSE, TRUE),
('Organizador de Cabos', 'organizador-cabos', 'Kit completo para organizar todos os cabos da sua mesa. Design minimalista e funcional.', 29.90, 59.90, 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600', 'https://exemplo.com/afiliado-organizador', 2, FALSE, TRUE),
('Caixa de Som Portátil', 'caixa-som-portatil', 'Caixa de som Bluetooth à prova dágua com 20 horas de bateria. Som potente e graves profundos.', 149.90, 249.90, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', 'https://exemplo.com/afiliado-caixa-som', 3, TRUE, TRUE),
('Carregador Sem Fio', 'carregador-sem-fio', 'Carregador wireless rápido compatível com todos os smartphones modernos. Design elegante e compacto.', 59.90, 99.90, 'https://images.unsplash.com/photo-1609346898736-31a33d1f1d6e?w=600', 'https://exemplo.com/afiliado-carregador', 3, FALSE, TRUE),
('Mouse Gamer RGB', 'mouse-gamer-rgb', 'Mouse gamer com sensor óptico de alta precisão, iluminação RGB customizável e 7 botões programáveis.', 119.90, 189.90, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600', 'https://exemplo.com/afiliado-mouse-gamer', 4, TRUE, TRUE),
('Teclado Mecânico', 'teclado-mecanico', 'Teclado mecânico com switches azuis, iluminação RGB e construção em alumínio. Para gamers e profissionais.', 249.90, 399.90, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600', 'https://exemplo.com/afiliado-teclado', 4, FALSE, TRUE),
('Câmera Veicular', 'camera-veicular', 'Câmera veicular Full HD com visão noturna e gravação em loop. Proteção essencial para seu veículo.', 179.90, 299.90, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', 'https://exemplo.com/afiliado-camera-veicular', 5, FALSE, TRUE),
('Suporte para Celular', 'suporte-celular-carro', 'Suporte magnético para celular no carro. Instalação fácil e fixação segura.', 39.90, 69.90, 'https://images.unsplash.com/photo-1601784558316-7f6f6f6f6f6f?w=600', 'https://exemplo.com/afiliado-suporte', 5, FALSE, TRUE),
('Relógio de Parede Moderno', 'relogio-parede-moderno', 'Relógio de parede com design contemporâneo e silencioso. Perfeito para sala ou escritório.', 89.90, 149.90, 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600', 'https://exemplo.com/afiliado-relogio', 2, FALSE, TRUE),
('Kit Ferramentas Multifuncional', 'kit-ferramentas-multifuncional', 'Kit com mais de 50 ferramentas essenciais para reparos domésticos. Maleta organizadora inclusa.', 159.90, 249.90, 'https://images.unsplash.com/photo-1530124566582-a618bc214b62?w=600', 'https://exemplo.com/afiliado-kit-ferramentas', 7, FALSE, TRUE),
('Isca Artificial Premium', 'isca-artificial-premium', 'Kit de iscas artificiais para pesca esportiva. Cores vibrantes e alta durabilidade.', 49.90, 89.90, 'https://images.unsplash.com/photo-1545579133-99bbdabfc5bd?w=600', 'https://exemplo.com/afiliado-isca', 8, FALSE, TRUE),
('Caixa de Presente Personalizada', 'caixa-presente-personalizada', 'Caixa de presente elegante com compartimentos para organizar presentes criativos.', 34.90, 59.90, 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600', 'https://exemplo.com/afiliado-caixa-presente', 9, TRUE, TRUE),
('Kit Vinho para Casais', 'kit-vinho-casais', 'Kit completo com taças, saca-rolhas e acessórios para degustação de vinho. Presente perfeito para casais.', 129.90, 199.90, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600', 'https://exemplo.com/afiliado-kit-vinho', 10, TRUE, TRUE);

-- ========================================
-- FIM DO SCHEMA
-- ========================================
-- IMPORTANTE: O usuário administrador será
-- criado automaticamente pelo servidor na
-- primeira execução com as credenciais:
-- Email: admin@garimpoia.com
-- Senha: admin123
-- ========================================