document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = q;

    document.getElementById('buscaTitulo').textContent = `Resultados para "${q}"`;
    document.title = `Busca: ${q} - Garimpo IA`;

    if (!q) {
        document.getElementById('buscaDescricao').textContent = 'Digite algo para buscar.';
        document.getElementById('produtosGrid').innerHTML = '';
        return;
    }

    try {
        const res = await fetch(`/api/produtos?busca=${encodeURIComponent(q)}&limite=40`);
        const produtos = await res.json();

        const grid = document.getElementById('produtosGrid');
        document.getElementById('buscaDescricao').textContent = `${produtos.length} resultado${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''}`;

        if (produtos.length === 0) {
            grid.innerHTML = '';
            document.getElementById('semResultados').style.display = 'block';
        } else {
            grid.innerHTML = produtos.map(p => {
                const desconto = p.preco_anterior && p.preco_anterior > p.preco
                    ? Math.round(((p.preco_anterior - p.preco) / p.preco_anterior) * 100)
                    : 0;
                return `
                    <article class="produto-card">
                        <a href="/produto/${p.slug}">
                            <div class="produto-imagem">
                                <img src="${p.imagem}" alt="${p.nome}" loading="lazy">
                                ${desconto > 0 ? `<span class="desconto-badge">🔥 -${desconto}%</span>` : ''}
                                ${p.destaque ? `<span class="destaque-badge">Destaque</span>` : ''}
                            </div>
                            <div class="produto-info">
                                ${p.categoria_nome ? `<span class="produto-categoria">${p.categoria_nome}</span>` : ''}
                                <h3 class="produto-nome">${p.nome}</h3>
                                <div class="produto-preco-container">
                                    ${p.preco_anterior > p.preco ? `<div class="produto-preco-anterior">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.preco_anterior)}</div>` : ''}
                                    <div class="produto-preco">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.preco)}</div>
                                </div>
                            </div>
                        </a>
                        <div style="padding: 0 20px 20px;">
                            <a href="/redirect/${p.id}" class="btn-oferta" target="_blank" rel="noopener">Ver oferta</a>
                        </div>
                    </article>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Erro na busca:', error);
    }

    // Busca global
    const searchBtn = document.getElementById('searchBtn');
    function doSearch() {
        const val = searchInput.value.trim();
        if (val) window.location.href = `/busca?q=${encodeURIComponent(val)}`;
    }
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });

    // Menu
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.nav-menu').classList.toggle('open');
    });
});