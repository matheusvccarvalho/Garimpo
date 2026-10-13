document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const slug = path.split('/').pop();

    if (!slug) {
        document.getElementById('produtoContainer').innerHTML = '<p>Produto não encontrado.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/produtos/${slug}`);
        if (!res.ok) throw new Error('Produto não encontrado');
        const produto = await res.json();

        const desconto = produto.preco_anterior && produto.preco_anterior > produto.preco
            ? Math.round(((produto.preco_anterior - produto.preco) / produto.preco_anterior) * 100)
            : 0;

        // Atualizar SEO
        document.title = `${produto.nome} - Garimpo IA`;
        document.getElementById('pageTitle').textContent = `${produto.nome} - Garimpo IA`;
        document.getElementById('metaDescription').content = produto.descricao || `Oferta de ${produto.nome}`;
        document.getElementById('ogTitle').content = `${produto.nome} - Garimpo IA`;

        // Breadcrumb
        document.getElementById('breadcrumbProduto').textContent = produto.nome;
        const categoriaLink = document.getElementById('categoriaLink');
        if (produto.categoria_slug || produto.categoria_nome) {
            categoriaLink.textContent = produto.categoria_nome;
            // Nota: precisaríamos da slug da categoria, usar ID por enquanto
        }

        const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco);
        const precoAntigoFormatado = produto.preco_anterior ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_anterior) : '';

        const container = document.getElementById('produtoContainer');
        container.classList.remove('loading');
        container.innerHTML = `
            <div class="produto-detalhe">
                <div class="produto-detalhe-img">
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
                <div class="produto-detalhe-info">
                    ${produto.categoria_nome ? `<span class="categoria">${produto.categoria_nome}</span>` : ''}
                    <h1>${produto.nome}</h1>
                    <div class="precos">
                        <span class="preco-atual">${precoFormatado}</span>
                        ${produto.preco_anterior ? `<span class="preco-antigo">${precoAntigoFormatado}</span>` : ''}
                        ${desconto > 0 ? `<span class="desconto-tag">-${desconto}% OFF</span>` : ''}
                    </div>
                    <div class="produto-descricao">
                        ${produto.descricao || '<em>Descrição não disponível.</em>'}
                    </div>
                    <div class="produto-meta">
                        <span>📅 Publicado em ${new Date(produto.criado_em).toLocaleDateString('pt-BR')}</span>
                        <span>👁️ ${produto.total_cliques || 0} visualizações</span>
                    </div>
                    <a href="/redirect/${produto.id}" class="btn-oferta-grande" target="_blank" rel="noopener">
                        VER OFERTA NA SHOPEE →
                    </a>
                </div>
            </div>
        `;

        // Produtos relacionados
        const relRes = await fetch(`/api/produtos/${produto.id}/relacionados?limite=4`);
        const relacionados = await relRes.json();
        const relGrid = document.getElementById('relacionadosGrid');
        if (relGrid && relacionados.length > 0) {
            // Importar função de render do app.js
            relacionados.forEach(p => {
                const desconto = p.preco_anterior && p.preco_anterior > p.preco
                    ? Math.round(((p.preco_anterior - p.preco) / p.preco_anterior) * 100)
                    : 0;
                const card = `
                    <article class="produto-card">
                        <a href="/produto/${p.slug}">
                            <div class="produto-imagem">
                                <img src="${p.imagem}" alt="${p.nome}" loading="lazy">
                                ${desconto > 0 ? `<span class="desconto-badge">🔥 -${desconto}%</span>` : ''}
                            </div>
                            <div class="produto-info">
                                <h3 class="produto-nome">${p.nome}</h3>
                                <div class="produto-preco-container">
                                    ${p.preco_anterior > p.preco ? `<div class="produto-preco-anterior">${new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(p.preco_anterior)}</div>` : ''}
                                    <div class="produto-preco">${new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(p.preco)}</div>
                                </div>
                            </div>
                        </a>
                        <div style="padding: 0 20px 20px;">
                            <a href="/redirect/${p.id}" class="btn-oferta" target="_blank" rel="noopener">Ver oferta</a>
                        </div>
                    </article>
                `;
                relGrid.insertAdjacentHTML('beforeend', card);
            });
        }

    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('produtoContainer').innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <h2>Produto não encontrado</h2>
                <p style="color:#6B7280; margin:16px 0;">Este produto pode estar indisponível.</p>
                <a href="/" class="btn btn-primary">Voltar para o início</a>
            </div>
        `;
    }
});