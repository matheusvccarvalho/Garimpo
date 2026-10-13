// ========================================
// GARIMPO IA - Página de Categoria
// Versão corrigida: loading seguro
// ========================================

console.log('[CATEGORIA.JS] Script carregado');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[CATEGORIA.JS] DOM pronto');

    // ========================================
    // 1. ELEMENTOS DO DOM
    // ========================================
    const elementos = {
        titulo: document.getElementById('categoriaTitulo'),
        descricao: document.getElementById('categoriaDescricao'),
        filtroCategoria: document.getElementById('filtroCategoria'),
        filtroOrdenar: document.getElementById('filtroOrdenar'),
        aplicarFiltros: document.getElementById('aplicarFiltros'),
        filtroToggle: document.getElementById('filtroToggle'),
        filtrosContainer: document.getElementById('filtrosContainer'),
        produtosGrid: document.getElementById('produtosGrid'),
        resultadosInfo: document.getElementById('resultadosInfo'),
        searchBtn: document.getElementById('searchBtn'),
        searchInput: document.getElementById('searchInput'),
        menuToggle: document.getElementById('menuToggle')
    };

    // ========================================
    // 2. DETECTAR SLUG DA URL
    // ========================================
    const path = window.location.pathname;
    let categoriaSlug = null;

    if (path.startsWith('/categoria/')) {
        categoriaSlug = path.split('/categoria/')[1];
        console.log('[CATEGORIA.JS] Slug detectado na URL:', categoriaSlug);
    } else {
        console.log('[CATEGORIA.JS] Página genérica (ex: /ofertas)');
    }

    // ========================================
    // 3. FUNÇÕES AUXILIARES
    // ========================================

    function formatPrice(value) {
        if (!value && value !== 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    function calcDesconto(preco, precoAnterior) {
        if (!preco || !precoAnterior || precoAnterior <= preco) return 0;
        return Math.round(((precoAnterior - preco) / precoAnterior) * 100);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Loader HTML (usado enquanto carrega)
    const LOADER_HTML = `
        <div class="loader-container">
            <div class="loader"></div>
            <p style="margin-top: 16px; color: #6B7280;">Carregando produtos...</p>
        </div>
    `;

    // Mensagem de erro
    function mostrarErro(mensagem) {
        console.error('[CATEGORIA.JS] Erro:', mensagem);
        if (elementos.produtosGrid) {
            elementos.produtosGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                    <h3 style="margin-bottom: 12px;">⚠️ Ops!</h3>
                    <p style="color:#6B7280; margin-bottom: 20px;">${escapeHtml(mensagem)}</p>
                    <a href="/" class="btn btn-primary">Voltar para o início</a>
                </div>
            `;
        }
        if (elementos.resultadosInfo) {
            elementos.resultadosInfo.textContent = '';
        }
    }

    // Mensagem de nenhum produto
    function mostrarVazio() {
        if (elementos.produtosGrid) {
            elementos.produtosGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                    <h3 style="margin-bottom: 12px;">Nenhum produto encontrado nesta categoria.</h3>
                    <p style="color:#6B7280; margin-bottom: 20px;">Que tal explorar outras ofertas?</p>
                    <a href="/" class="btn btn-primary">Ver todos os produtos</a>
                </div>
            `;
        }
        if (elementos.resultadosInfo) {
            elementos.resultadosInfo.textContent = '0 produtos encontrados';
        }
    }

    // Renderizar um card de produto
    function renderProdutoCard(produto) {
        const desconto = calcDesconto(produto.preco, produto.preco_anterior);
        const slug = produto.slug || '';
        const imagemSrc = produto.imagem && produto.imagem.trim() !== '' 
            ? escapeHtml(produto.imagem) 
            : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f5f5f7" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" fill="%239ca3af" font-size="12"%3ESem imagem%3C/text%3E%3C/svg%3E';

        return `
            <article class="produto-card">
                <a href="/produto/${slug}" class="produto-link">
                    <div class="produto-imagem">
                        <img 
                            src="${imagemSrc}" 
                            alt="${escapeHtml(produto.nome)}" 
                            loading="lazy"
                            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Crect fill=\\'%23f5f5f7\\' width=\\'100\\' height=\\'100\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' text-anchor=\\'middle\\' fill=\\'%239ca3af\\' font-size=\\'12\\'%3ESem imagem%3C/text%3E%3C/svg%3E'"
                        >
                        ${desconto > 0 ? `<span class="desconto-badge">🔥 -${desconto}%</span>` : ''}
                        ${produto.destaque ? `<span class="destaque-badge">Destaque</span>` : ''}
                    </div>
                    <div class="produto-info">
                        ${produto.categoria_nome ? `<span class="produto-categoria">${escapeHtml(produto.categoria_nome)}</span>` : ''}
                        <h3 class="produto-nome">${escapeHtml(produto.nome)}</h3>
                        <div class="produto-preco-container">
                            ${produto.preco_anterior && produto.preco_anterior > produto.preco 
                                ? `<div class="produto-preco-anterior">${formatPrice(produto.preco_anterior)}</div>` 
                                : ''}
                            <div class="produto-preco">${formatPrice(produto.preco)}</div>
                        </div>
                    </div>
                </a>
                <div style="padding: 0 20px 20px;">
                    <a href="/redirect/${produto.id}" class="btn-oferta" target="_blank" rel="noopener">Ver oferta</a>
                </div>
            </article>
        `;
    }

    // ========================================
    // 4. CARREGAR PRODUTOS (COM TRATAMENTO ROBUSTO)
    // ========================================

    async function carregarProdutos() {
        console.log('[CATEGORIA.JS] carregarProdutos() iniciada');

        // Mostrar loader IMEDIATAMENTE
        if (elementos.produtosGrid) {
            elementos.produtosGrid.innerHTML = LOADER_HTML;
        }

        try {
            // Pegar valores atuais dos filtros
            const categoriaId = elementos.filtroCategoria ? elementos.filtroCategoria.value : '';
            const ordenar = elementos.filtroOrdenar ? elementos.filtroOrdenar.value : 'destaque';

            console.log('[CATEGORIA.JS] Filtros atuais:', { categoriaId, ordenar });

            // Construir URL da API
            let url = '/api/produtos?limite=40';

            if (categoriaId) {
                // Filtrar por ID numérico da categoria
                url += `&categoria=${encodeURIComponent(categoriaId)}`;
            } else if (categoriaSlug === 'ofertas' || path === '/ofertas') {
                // Página de ofertas: mostrar apenas produtos com desconto
                url += `&categoria=ofertas`;
            }
            // Se não tem categoriaId nem slug específico, lista todos

            url += `&ordenar=${encodeURIComponent(ordenar)}`;

            console.log('[CATEGORIA.JS] URL da API:', url);

            // ========================================
            // FETCH COM TIMEOUT E TRATAMENTO
            // ========================================
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            let res;
            try {
                res = await fetch(url, { signal: controller.signal });
            } finally {
                clearTimeout(timeoutId);
            }

            console.log('[CATEGORIA.JS] Status da resposta:', res.status);

            if (!res.ok) {
                throw new Error(`API retornou status ${res.status}`);
            }

            // Verificar se a resposta é JSON válido
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('API não retornou JSON válido');
            }

            const produtos = await res.json();

            console.log('[CATEGORIA.JS] Produtos recebidos:', produtos);
            console.log('[CATEGORIA.JS] Quantidade:', Array.isArray(produtos) ? produtos.length : 'não é array');

            // Validar que é um array
            if (!Array.isArray(produtos)) {
                throw new Error('Formato de resposta inválido');
            }

            // ========================================
            // RENDERIZAR PRODUTOS
            // ========================================
            if (!elementos.produtosGrid) {
                console.warn('[CATEGORIA.JS] Container produtosGrid não encontrado no DOM');
                return;
            }

            if (produtos.length === 0) {
                console.log('[CATEGORIA.JS] Nenhum produto encontrado');
                mostrarVazio();
            } else {
                console.log(`[CATEGORIA.JS] Renderizando ${produtos.length} produtos`);
                elementos.produtosGrid.innerHTML = produtos.map(renderProdutoCard).join('');
                
                if (elementos.resultadosInfo) {
                    const plural = produtos.length !== 1 ? 's' : '';
                    elementos.resultadosInfo.textContent = 
                        `${produtos.length} produto${plural} encontrado${plural}`;
                }
            }

        } catch (error) {
            // ========================================
            // TRATAMENTO DE ERROS
            // ========================================
            console.error('[CATEGORIA.JS] Erro ao carregar produtos:', error);

            let mensagemErro = 'Não foi possível carregar os produtos.';
            
            if (error.name === 'AbortError') {
                mensagemErro = 'A requisição demorou muito. Verifique sua conexão e tente novamente.';
            } else if (error.message.includes('status')) {
                mensagemErro = `Erro no servidor (${error.message}). Tente novamente em instantes.`;
            } else if (error.message.includes('JSON')) {
                mensagemErro = 'Erro ao processar a resposta do servidor.';
            }

            mostrarErro(mensagemErro);
        }
        // NOTE: não há finally necessário porque TODOS os caminhos
        // (sucesso, vazio, erro) já substituem o innerHTML do grid,
        // removendo o loader automaticamente.
    }

    // ========================================
    // 5. CARREGAR CATEGORIAS NO SELECT
    // ========================================

    async function carregarCategorias() {
        console.log('[CATEGORIA.JS] Carregando categorias...');

        try {
            const res = await fetch('/api/categorias');
            if (!res.ok) throw new Error('Falha ao carregar categorias');
            
            const categorias = await res.json();
            console.log('[CATEGORIA.JS] Categorias recebidas:', categorias.length);

            if (elementos.filtroCategoria) {
                // Limpar e recriar opções
                elementos.filtroCategoria.innerHTML = '<option value="">Todas as categorias</option>';
                
                categorias.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = String(c.id);
                    opt.textContent = c.nome;
                    elementos.filtroCategoria.appendChild(opt);
                });

                // Se temos um slug na URL, selecionar a categoria correspondente
                if (categoriaSlug) {
                    const categoriaAtual = categorias.find(c => c.slug === categoriaSlug);
                    if (categoriaAtual) {
                        elementos.filtroCategoria.value = String(categoriaAtual.id);
                        console.log('[CATEGORIA.JS] Categoria selecionada:', categoriaAtual.nome, 'ID:', categoriaAtual.id);
                        
                        // Atualizar título e descrição
                        if (elementos.titulo) elementos.titulo.textContent = categoriaAtual.nome;
                        if (elementos.descricao) {
                            elementos.descricao.textContent = categoriaAtual.descricao 
                                || `Produtos da categoria ${categoriaAtual.nome}`;
                        }
                        document.title = `${categoriaAtual.nome} - Garimpo IA`;
                    } else {
                        console.warn('[CATEGORIA.JS] Slug não encontrado:', categoriaSlug);
                        if (elementos.titulo) elementos.titulo.textContent = 'Categoria não encontrada';
                        if (elementos.descricao) elementos.descricao.textContent = 'A categoria que você procura não existe.';
                    }
                } else if (path === '/ofertas') {
                    if (elementos.titulo) elementos.titulo.textContent = 'Ofertas';
                    if (elementos.descricao) elementos.descricao.textContent = 'Produtos com os melhores descontos';
                    document.title = 'Ofertas - Garimpo IA';
                }
            }

            return categorias;

        } catch (error) {
            console.error('[CATEGORIA.JS] Erro ao carregar categorias:', error);
            if (elementos.titulo) elementos.titulo.textContent = 'Erro ao carregar';
            if (elementos.descricao) elementos.descricao.textContent = 'Não foi possível carregar as categorias.';
            return [];
        }
    }

    // ========================================
    // 6. FLUXO PRINCIPAL (ORDEM CORRETA!)
    // ========================================

    // PASSO 1: Carregar categorias PRIMEIRO (para ter IDs disponíveis)
    await carregarCategorias();

    // PASSO 2: Carregar produtos DEPOIS (com o select já preenchido)
    await carregarProdutos();

    // ========================================
    // 7. EVENT LISTENERS
    // ========================================

    // Botão Aplicar filtros
    if (elementos.aplicarFiltros) {
        elementos.aplicarFiltros.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[CATEGORIA.JS] Botão Aplicar clicado');
            carregarProdutos();
        });
    }

    // Ordenar ao mudar seleção (UX extra)
    if (elementos.filtroOrdenar) {
        elementos.filtroOrdenar.addEventListener('change', () => {
            console.log('[CATEGORIA.JS] Ordenação alterada');
            carregarProdutos();
        });
    }

    // Toggle filtros mobile
    if (elementos.filtroToggle && elementos.filtrosContainer) {
        elementos.filtroToggle.addEventListener('click', () => {
            elementos.filtrosContainer.classList.toggle('open');
        });
    }

    // Busca global
    function doSearch() {
        const q = elementos.searchInput ? elementos.searchInput.value.trim() : '';
        if (q) {
            console.log('[CATEGORIA.JS] Busca:', q);
            window.location.href = `/busca?q=${encodeURIComponent(q)}`;
        }
    }

    if (elementos.searchBtn) elementos.searchBtn.addEventListener('click', doSearch);
    if (elementos.searchInput) {
        elementos.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // Menu mobile
    if (elementos.menuToggle) {
        elementos.menuToggle.addEventListener('click', () => {
            const menu = document.querySelector('.nav-menu');
            if (menu) menu.classList.toggle('open');
        });
    }

    console.log('[CATEGORIA.JS] Inicialização completa');
});