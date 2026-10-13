// ========================================
// ACHADINHOS - App Principal
// ========================================

console.log('[APP] Script carregado');

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ========== UTILITÁRIOS GLOBAIS ==========
const Utils = {
    formatPrice(value) {
        if (!value && value !== 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    calcDesconto(preco, precoAnterior) {
        if (!preco || !precoAnterior || precoAnterior <= preco) return 0;
        return Math.round(((precoAnterior - preco) / precoAnterior) * 100);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR');
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    slugify(str) {
        return str.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
};

// ========== RENDERIZAÇÃO DE CARD DE PRODUTO ==========
function renderProdutoCard(produto) {
    const desconto = Utils.calcDesconto(produto.preco, produto.preco_anterior);
    const slug = produto.slug || Utils.slugify(produto.nome);

    return `
        <article class="produto-card" data-id="${produto.id}">
            <a href="/produto/${slug}" class="produto-link">
                <div class="produto-imagem">
                    <img src="${Utils.escapeHtml(produto.imagem)}" alt="${Utils.escapeHtml(produto.nome)}" loading="lazy">
                    ${desconto > 0 ? `<span class="desconto-badge">-${desconto}%</span>` : ''}
                    ${produto.destaque ? `<span class="destaque-badge">🔥 Destaque</span>` : ''}
                </div>
                <div class="produto-info">
                    ${produto.categoria_nome ? `<span class="produto-categoria">${Utils.escapeHtml(produto.categoria_nome)}</span>` : ''}
                    <h3 class="produto-nome">${Utils.escapeHtml(produto.nome)}</h3>
                    <div class="produto-rating">
                        <span class="stars">★★★★★</span>
                        <span>5.0</span>
                    </div>
                    <div class="produto-preco-container">
                        ${produto.preco_anterior && produto.preco_anterior > produto.preco ? 
                            `<div class="produto-preco-anterior">${Utils.formatPrice(produto.preco_anterior)}</div>` : ''}
                        <div class="produto-preco">${Utils.formatPrice(produto.preco)}</div>
                    </div>
                </div>
            </a>
            <div style="padding: 0 20px 20px;">
                <a href="/redirect/${produto.id}" class="btn-oferta" target="_blank" rel="noopener">
                    Ver oferta →
                </a>
            </div>
        </article>
    `;
}

// ========== RENDERIZAÇÃO DE CATEGORIAS ==========
function renderCategoriaChip(categoria) {
    const icons = {
        'tecnologia': '📱', 'casa': '🏠', 'eletronicos': '💻', 'games': '🎮',
        'automotivo': '🚗', 'moda': '👕', 'agro': '🌾', 'pesca': '🎣',
        'presentes': '🎁', 'para-casais': '💝'
    };
    const icon = icons[categoria.slug] || '📦';

    return `
        <a href="/categoria/${categoria.slug}" class="categoria-chip">
            <span class="categoria-icon">${icon}</span>
            <span class="categoria-name">${Utils.escapeHtml(categoria.nome)}</span>
        </a>
    `;
}

// ========== INICIALIZAÇÃO DA HOME ==========
async function initHome() {
    console.log('[HOME] Iniciando carregamento da home');
    
    try {
        // Carregar categorias
        const categoriasRes = await fetch('/api/categorias');
        const categorias = await categoriasRes.json();
        console.log('[HOME] Categorias carregadas:', categorias.length);
        
        const categoriasScroll = document.getElementById('categoriasScroll');
        if (categoriasScroll) {
            categoriasScroll.innerHTML = categorias.map(renderCategoriaChip).join('');
        }

        // Carregar produtos ordenados por maior desconto
        const ofertasRes = await fetch('/api/produtos?limite=8&ordenar=maior_desconto');
        const ofertas = await ofertasRes.json();
        console.log('[HOME] Ofertas carregadas:', ofertas.length);
        
        const ofertasGrid = document.getElementById('ofertasGrid');
        if (ofertasGrid) {
            if (ofertas.length === 0) {
                ofertasGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #868E96; padding: 40px;">Nenhum produto disponível no momento.</p>';
            } else {
                ofertasGrid.innerHTML = ofertas.map(renderProdutoCard).join('');
            }
        }

        // Achado do dia (destaque especial)
        const achadoRes = await fetch('/api/produtos/destaque/dia');
        if (achadoRes.ok) {
            const achado = await achadoRes.json();
            const achadoContainer = document.getElementById('achadoDia');
            if (achado && achadoContainer) {
                const desconto = Utils.calcDesconto(achado.preco, achado.preco_anterior);
                achadoContainer.innerHTML = `
                    <div class="oferta-card">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;">
                            <div>
                                <img src="${Utils.escapeHtml(achado.imagem)}" alt="${Utils.escapeHtml(achado.nome)}" style="width: 100%; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
                            </div>
                            <div>
                                <span class="oferta-tag">✨ Achado especial</span>
                                <h3 style="font-size: 32px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.02em;">${Utils.escapeHtml(achado.nome)}</h3>
                                <p style="font-size: 16px; color: #495057; margin-bottom: 24px; line-height: 1.6;">${Utils.escapeHtml(achado.descricao || 'Um produto selecionado especialmente para você.')}</p>
                                <div style="display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px;">
                                    <span style="font-size: 48px; font-weight: 800; color: #FF6B35; letter-spacing: -0.02em;">${Utils.formatPrice(achado.preco)}</span>
                                    ${achado.preco_anterior ? `<span style="font-size: 20px; color: #868E96; text-decoration: line-through;">${Utils.formatPrice(achado.preco_anterior)}</span>` : ''}
                                    ${desconto > 0 ? `<span style="background: #06A77D; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 14px; font-weight: 700;">-${desconto}%</span>` : ''}
                                </div>
                                <a href="/redirect/${achado.id}" class="btn-oferta-grande" target="_blank" rel="noopener">
                                    🛍️ Ver oferta agora
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            } else if (achadoContainer) {
                achadoContainer.style.display = 'none';
            }
        }

        // Mais populares
        const popularesRes = await fetch('/api/produtos/populares?limite=4');
        const populares = await popularesRes.json();
        console.log('[HOME] Populares carregados:', populares.length);
        
        const popularesGrid = document.getElementById('popularesGrid');
        if (popularesGrid && populares.length > 0) {
            popularesGrid.innerHTML = populares.map(renderProdutoCard).join('');
        }

        // Ofertas destaque (mais desconto)
        const ofertasDestaqueRes = await fetch('/api/produtos?limite=4&ordenar=maior_desconto');
        const ofertasDestaque = await ofertasDestaqueRes.json();
        const ofertasDestaqueGrid = document.getElementById('ofertasDestaque');
        if (ofertasDestaqueGrid && ofertasDestaque.length > 0) {
            ofertasDestaqueGrid.innerHTML = ofertasDestaque.map(renderProdutoCard).join('');
        }

        // Recentes
        const recentesRes = await fetch('/api/produtos?ordenar=mais_recentes&limite=8');
        const recentes = await recentesRes.json();
        console.log('[HOME] Recentes carregados:', recentes.length);
        
        const recentesGrid = document.getElementById('recentesGrid');
        if (recentesGrid) {
            if (recentes.length === 0) {
                recentesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #868E96; padding: 40px;">Nenhum produto recente.</p>';
            } else {
                recentesGrid.innerHTML = recentes.map(renderProdutoCard).join('');
            }
        }

        console.log('[HOME] Todos os dados carregados com sucesso');

    } catch (error) {
        console.error('[HOME] Erro ao carregar home:', error);
    }
}

// ========== BUSCA ==========
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    function doSearch() {
        const q = searchInput.value.trim();
        if (q) {
            console.log('[SEARCH] Buscando:', q);
            window.location.href = `/busca?q=${encodeURIComponent(q)}`;
        }
    }

    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }
}

// ========== MENU MOBILE ==========
function initMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('navMenu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('open');
        });
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('[APP] DOM carregado');
    initMenu();
    initSearch();

    const path = window.location.pathname;
    if (path === '/' || path === '') {
        console.log('[APP] Carregando home');
        initHome();
    }
});