// ========================================
// ACHADINHOS - Painel Administrativo
// ========================================

const API_BASE = '/api/admin';
let allProdutos = [];
let allCategorias = [];

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupLogout();
    setupMobileMenu();
    setupProdutoForm();
    setupCategoriaForm();
    setupSearchFilters();

    loadDashboard();
    loadProdutos();
    loadCategorias();
    loadCategoriasSelect();
});

// ========== AUTENTICAÇÃO ==========
async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`, { credentials: 'include' });
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }
        const data = await res.json();
        if (data.adminNome) {
            document.getElementById('adminNome').textContent = data.adminNome;
            document.getElementById('adminAvatar').textContent = data.adminNome.charAt(0).toUpperCase();
        }
    } catch (e) {
        window.location.href = '/login';
    }
}

// ========== NAVEGAÇÃO ==========
function setupNavigation() {
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            switchView(view);
            
            document.querySelectorAll('.nav-link[data-view]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Fecha sidebar mobile
            if (window.innerWidth <= 1024) {
                document.getElementById('adminSidebar').classList.remove('open');
            }
        });
    });
}

function switchView(view) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        produtos: 'Produtos',
        categorias: 'Categorias',
        ofertas: 'Ofertas',
        afiliados: 'Links de Afiliado',
        configuracoes: 'Configurações'
    };
    
    const welcomes = {
        dashboard: 'Olá, administrador 👋 Veja o desempenho dos seus achadinhos.',
        produtos: 'Gerencie todos os produtos cadastrados na plataforma.',
        categorias: 'Organize seus achadinhos por categoria.',
        ofertas: 'Veja quais produtos estão com desconto ativo.',
        afiliados: 'Gerencie seus links de afiliado Shopee.',
        configuracoes: 'Configure informações gerais da plataforma.'
    };

    document.getElementById('pageTitle').textContent = titles[view] || 'Dashboard';
    document.getElementById('welcomeText').textContent = welcomes[view] || '';

    if (view === 'dashboard') loadDashboard();
    if (view === 'ofertas') loadOfertas();
    if (view === 'afiliados') loadAfiliados();
}

// ========== LOGOUT ==========
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (!confirm('Deseja realmente sair?')) return;
        try {
            await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) {}
        window.location.href = '/login';
    });
}

// ========== MENU MOBILE ==========
function setupMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('adminSidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro');
        const data = await res.json();

        document.getElementById('statTotalProdutos').textContent = data.totalProdutos || 0;
        document.getElementById('statProdutosAtivos').textContent = data.produtosAtivos || 0;
        document.getElementById('statCliquesHoje').textContent = data.cliquesHoje || 0;
        document.getElementById('statCliques7').textContent = data.cliques7Dias || 0;
        document.getElementById('statCliquesTotal').textContent = data.totalCliques || 0;

        // Carregar total de categorias
        try {
            const catRes = await fetch('/api/categorias');
            const cats = await catRes.json();
            document.getElementById('statTotalCategorias').textContent = cats.length;
        } catch (e) {}

        // Produtos mais clicados
        const cliquesRes = await fetch('/api/cliques/estatisticas', { credentials: 'include' });
        if (cliquesRes.ok) {
            const cliquesData = await cliquesRes.json();
            
            if (cliquesData.produtosMaisClicados && cliquesData.produtosMaisClicados.length > 0) {
                const rows = cliquesData.produtosMaisClicados.map((p, i) => `
                    <tr>
                        <td><strong>#${i + 1}</strong></td>
                        <td><strong>${escapeHtml(p.nome)}</strong></td>
                        <td><span style="color: var(--color-primary); font-weight: 700;">${p.total_cliques}</span></td>
                    </tr>
                `).join('');
                
                document.getElementById('produtosMaisClicados').innerHTML = `
                    <table class="admin-table">
                        <thead>
                            <tr><th>#</th><th>Produto</th><th>Cliques</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                document.getElementById('produtosMaisClicados').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h4>Nenhum clique registrado</h4>
                        <p>Quando os visitantes clicarem nos produtos, os dados aparecerão aqui.</p>
                    </div>
                `;
            }
        }

        if (data.produtoMaisClicado) {
            document.getElementById('produtoMaisClicado').innerHTML = `
                <div style="padding: 8px 0;">
                    <strong style="font-size: 16px;">${escapeHtml(data.produtoMaisClicado.nome)}</strong>
                    <p style="color: var(--color-text-muted); margin-top: 4px;">${data.produtoMaisClicado.total_cliques} cliques</p>
                </div>
            `;
        }

        if (data.categoriaMaisAcessada) {
            document.getElementById('categoriaMaisAcessada').innerHTML = `
                <div style="padding: 8px 0;">
                    <strong style="font-size: 16px;">${escapeHtml(data.categoriaMaisAcessada.nome)}</strong>
                    <p style="color: var(--color-text-muted); margin-top: 4px;">${data.categoriaMaisAcessada.total_cliques} cliques</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// ========== PRODUTOS ==========
async function loadProdutos() {
    const container = document.getElementById('tabelaProdutos');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h4>Carregando produtos...</h4>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/produtos`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro');
        allProdutos = await res.json();

        document.getElementById('produtosBadge').textContent = allProdutos.length;
        renderProdutos(allProdutos);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h4>Erro ao carregar</h4>
                <p>Tente recarregar a página.</p>
            </div>
        `;
    }
}

function renderProdutos(produtos) {
    const container = document.getElementById('tabelaProdutos');
    
    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h4>Nenhum produto encontrado</h4>
                <p>Cadastre seu primeiro achadinho clicando no botão acima.</p>
            </div>
        `;
        return;
    }

    const rows = produtos.map(p => {
        const desconto = p.preco_anterior && p.preco_anterior > p.preco 
            ? Math.round(((p.preco_anterior - p.preco) / p.preco_anterior) * 100)
            : 0;
        
        return `
            <tr>
                <td>
                    <div class="table-product">
                        <img src="${p.imagem || ''}" alt="" class="table-product-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%22%23f5f5f7%22 width=%2248%22 height=%2248%22/%3E%3Ctext x=%2224%22 y=%2228%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2212%22%3E📷%3C/text%3E%3C/svg%3E'">
                        <div class="table-product-info">
                            <div class="table-product-name">${escapeHtml(p.nome)}</div>
                            <div class="table-product-category">${escapeHtml(p.categoria_nome || 'Sem categoria')}</div>
                        </div>
                    </div>
                </td>
                <td><strong>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</strong></td>
                <td>${p.preco_anterior ? `R$ ${Number(p.preco_anterior).toFixed(2).replace('.', ',')}` : '-'}</td>
                <td>${desconto > 0 ? `<span style="color: var(--color-discount); font-weight: 700;">-${desconto}%</span>` : '-'}</td>
                <td>
                    <span class="badge ${p.ativo ? 'badge-active' : 'badge-inactive'}">
                        ${p.ativo ? '✓ Ativo' : '✗ Inativo'}
                    </span>
                </td>
                <td>
                    ${p.destaque ? '<span class="badge badge-destaque">⭐ Destaque</span>' : '<span style="color: var(--color-text-muted);">-</span>'}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon-action" onclick="editProduto(${p.id})">✏️ Editar</button>
                        <button class="btn-icon-action" onclick="toggleProduto(${p.id}, ${p.ativo ? 0 : 1})">
                            ${p.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                        </button>
                        <button class="btn-icon-action delete" onclick="deleteProduto(${p.id})">🗑️ Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Preço</th>
                    <th>Antigo</th>
                    <th>Desconto</th>
                    <th>Status</th>
                    <th>Destaque</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ========== OFERTAS ==========
async function loadOfertas() {
    const container = document.getElementById('tabelaOfertas');
    const ofertas = allProdutos.filter(p => p.preco_anterior && p.preco_anterior > p.preco && p.ativo);
    
    if (ofertas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔥</div>
                <h4>Nenhuma oferta ativa</h4>
                <p>Produtos com preço antigo maior que o atual aparecem aqui.</p>
            </div>
        `;
        return;
    }

    const rows = ofertas.map(p => {
        const desconto = Math.round(((p.preco_anterior - p.preco) / p.preco_anterior) * 100);
        return `
            <tr>
                <td>
                    <div class="table-product">
                        <img src="${p.imagem || ''}" alt="" class="table-product-img" onerror="this.style.background='var(--color-bg-tertiary)'">
                        <div class="table-product-info">
                            <div class="table-product-name">${escapeHtml(p.nome)}</div>
                            <div class="table-product-category">${escapeHtml(p.categoria_nome || 'Sem categoria')}</div>
                        </div>
                    </div>
                </td>
                <td><strong style="color: var(--color-primary);">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</strong></td>
                <td><s style="color: var(--color-text-muted);">R$ ${Number(p.preco_anterior).toFixed(2).replace('.', ',')}</s></td>
                <td><span class="badge badge-active">-${desconto}% OFF</span></td>
                <td>
                    <button class="btn-icon-action" onclick="editProduto(${p.id})">✏️ Editar</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr><th>Produto</th><th>Preço atual</th><th>Preço antigo</th><th>Desconto</th><th>Ações</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ========== AFILIADOS ==========
async function loadAfiliados() {
    const container = document.getElementById('tabelaAfiliados');
    
    if (allProdutos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔗</div>
                <h4>Nenhum link cadastrado</h4>
                <p>Cadastre produtos com links de afiliado para visualizá-los aqui.</p>
            </div>
        `;
        return;
    }

    const rows = allProdutos.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.nome)}</strong></td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <a href="${p.link_afiliado}" target="_blank" style="color: var(--color-primary);">${escapeHtml(p.link_afiliado || '-')}</a>
            </td>
            <td>
                <span class="badge ${p.ativo ? 'badge-active' : 'badge-inactive'}">
                    ${p.ativo ? '✓ Ativo' : '✗ Inativo'}
                </span>
            </td>
            <td>
                <button class="btn-icon-action" onclick="copyLink('${p.link_afiliado}')">📋 Copiar</button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr><th>Produto</th><th>Link Shopee</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function copyLink(link) {
    if (!link) {
        showToast('Link não disponível', 'error');
        return;
    }
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link copiado com sucesso!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
}

// ========== CATEGORIAS ==========
async function loadCategorias() {
    const container = document.getElementById('tabelaCategorias');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <h4>Carregando categorias...</h4>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/categorias`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro');
        allCategorias = await res.json();
        renderCategorias(allCategorias);
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function renderCategorias(categorias) {
    const container = document.getElementById('tabelaCategorias');
    
    if (categorias.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗂️</div>
                <h4>Nenhuma categoria</h4>
                <p>Crie sua primeira categoria clicando no botão acima.</p>
            </div>
        `;
        return;
    }

    // Buscar contagem de produtos por categoria
    const counts = {};
    allProdutos.forEach(p => {
        counts[p.categoria_id] = (counts[p.categoria_id] || 0) + 1;
    });

    const rows = categorias.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.nome)}</strong></td>
            <td style="color: var(--color-text-muted);">${escapeHtml(c.slug)}</td>
            <td><span style="font-weight: 600;">${counts[c.id] || 0}</span></td>
            <td>
                <span class="badge ${c.ativo ? 'badge-active' : 'badge-inactive'}">
                    ${c.ativo ? '✓ Ativa' : '✗ Inativa'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon-action" onclick="editCategoria(${c.id})">✏️ Editar</button>
                    <button class="btn-icon-action delete" onclick="deleteCategoria(${c.id})">🗑️ Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr><th>Nome</th><th>Slug</th><th>Produtos</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

async function loadCategoriasSelect() {
    try {
        const res = await fetch('/api/categorias');
        const cats = await res.json();
        const select = document.getElementById('pCategoria');
        const filterSelect = document.getElementById('filtroCategoria');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        filterSelect.innerHTML = '<option value="">Todas as categorias</option>';
        
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            select.appendChild(opt);

            const optFilter = document.createElement('option');
            optFilter.value = c.id;
            optFilter.textContent = c.nome;
            filterSelect.appendChild(optFilter);
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ========== FORM PRODUTO ==========
function setupProdutoForm() {
    document.getElementById('btnNovoProduto').addEventListener('click', () => {
        document.getElementById('formTitulo').textContent = 'Novo produto';
        document.getElementById('formProduto').reset();
        document.getElementById('produtoId').value = '';
        document.getElementById('pAtivo').checked = true;
        document.getElementById('pDestaque').checked = false;
        document.getElementById('modalProduto').classList.add('active');
    });

    document.getElementById('fecharModalProduto').addEventListener('click', closeProdutoModal);
    document.getElementById('cancelarForm').addEventListener('click', closeProdutoModal);
    
    document.getElementById('modalProduto').addEventListener('click', (e) => {
        if (e.target.id === 'modalProduto') closeProdutoModal();
    });

    document.getElementById('salvarProduto').addEventListener('click', async () => {
        const form = document.getElementById('formProduto');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('produtoId').value;
        const btn = document.getElementById('salvarProduto');
        const originalText = btn.textContent;

        const data = {
            nome: document.getElementById('pNome').value.trim(),
            descricao: document.getElementById('pDescricao').value.trim(),
            preco: parseFloat(document.getElementById('pPreco').value),
            preco_anterior: document.getElementById('pPrecoAnterior').value ? parseFloat(document.getElementById('pPrecoAnterior').value) : null,
            imagem: document.getElementById('pImagem').value.trim(),
            link_afiliado: document.getElementById('pLinkAfiliado').value.trim(),
            categoria_id: parseInt(document.getElementById('pCategoria').value),
            destaque: document.getElementById('pDestaque').checked,
            ativo: document.getElementById('pAtivo').checked
        };

        if (!data.nome || !data.preco || !data.link_afiliado || !data.categoria_id) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const url = id ? `${API_BASE}/produtos/${id}` : `${API_BASE}/produtos`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await res.json();

            if (res.ok) {
                showToast(id ? 'Produto atualizado!' : 'Produto criado com sucesso!', 'success');
                closeProdutoModal();
                await loadProdutos();
                loadDashboard();
            } else {
                showToast(result.error || 'Erro ao salvar', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar produto', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    document.getElementById('gerarIA').addEventListener('click', () => {
        showToast('Funcionalidade de IA será integrada em breve!', 'info');
    });
}

function closeProdutoModal() {
    document.getElementById('modalProduto').classList.remove('active');
}

window.editProduto = async (id) => {
    try {
        const res = await fetch(`${API_BASE}/produtos/${id}`, { credentials: 'include' });
        const p = await res.json();

        document.getElementById('formTitulo').textContent = 'Editar produto';
        document.getElementById('produtoId').value = p.id;
        document.getElementById('pNome').value = p.nome;
        document.getElementById('pDescricao').value = p.descricao || '';
        document.getElementById('pPreco').value = p.preco;
        document.getElementById('pPrecoAnterior').value = p.preco_anterior || '';
        document.getElementById('pImagem').value = p.imagem;
        document.getElementById('pLinkAfiliado').value = p.link_afiliado;
        document.getElementById('pCategoria').value = p.categoria_id;
        document.getElementById('pDestaque').checked = !!p.destaque;
        document.getElementById('pAtivo').checked = !!p.ativo;
        document.getElementById('modalProduto').classList.add('active');
    } catch (error) {
        showToast('Erro ao carregar produto', 'error');
    }
};

window.toggleProduto = async (id, ativo) => {
    try {
        const getRes = await fetch(`${API_BASE}/produtos/${id}`, { credentials: 'include' });
        const p = await getRes.json();

        const data = {
            nome: p.nome,
            descricao: p.descricao,
            preco: parseFloat(p.preco),
            preco_anterior: p.preco_anterior ? parseFloat(p.preco_anterior) : null,
            imagem: p.imagem,
            link_afiliado: p.link_afiliado,
            categoria_id: p.categoria_id,
            destaque: !!p.destaque,
            ativo: ativo === 1
        };

        await fetch(`${API_BASE}/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        showToast(ativo === 1 ? 'Produto ativado!' : 'Produto desativado!', 'success');
        await loadProdutos();
        loadDashboard();
    } catch (error) {
        showToast('Erro ao alterar status', 'error');
    }
};

window.deleteProduto = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) return;
    try {
        await fetch(`${API_BASE}/produtos/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        showToast('Produto excluído!', 'success');
        await loadProdutos();
        loadDashboard();
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
};

// ========== FORM CATEGORIA ==========
function setupCategoriaForm() {
    document.getElementById('btnNovaCategoria').addEventListener('click', () => {
        document.getElementById('formCategoriaTitulo').textContent = 'Nova categoria';
        document.getElementById('formCategoria').reset();
        document.getElementById('categoriaId').value = '';
        document.getElementById('cAtivo').checked = true;
        document.getElementById('modalCategoria').classList.add('active');
    });

    document.getElementById('fecharModalCategoria').addEventListener('click', closeCategoriaModal);
    document.getElementById('cancelarCategoriaForm').addEventListener('click', closeCategoriaModal);
    
    document.getElementById('modalCategoria').addEventListener('click', (e) => {
        if (e.target.id === 'modalCategoria') closeCategoriaModal();
    });

    document.getElementById('salvarCategoria').addEventListener('click', async () => {
        const form = document.getElementById('formCategoria');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('categoriaId').value;
        const btn = document.getElementById('salvarCategoria');

        const data = {
            nome: document.getElementById('cNome').value.trim(),
            descricao: document.getElementById('cDescricao').value.trim(),
            imagem: document.getElementById('cImagem').value.trim(),
            ativo: document.getElementById('cAtivo').checked
        };

        if (!data.nome) {
            showToast('Nome é obrigatório', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const url = id ? `${API_BASE}/categorias/${id}` : `${API_BASE}/categorias`;
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (res.ok) {
                showToast(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
                closeCategoriaModal();
                await loadCategorias();
                loadCategoriasSelect();
                loadDashboard();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro', 'error');
            }
        } catch (error) {
            showToast('Erro ao salvar', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar categoria';
        }
    });
}

function closeCategoriaModal() {
    document.getElementById('modalCategoria').classList.remove('active');
}

window.editCategoria = async (id) => {
    const c = allCategorias.find(cat => cat.id === id);
    if (!c) return;

    document.getElementById('formCategoriaTitulo').textContent = 'Editar categoria';
    document.getElementById('categoriaId').value = c.id;
    document.getElementById('cNome').value = c.nome;
    document.getElementById('cDescricao').value = c.descricao || '';
    document.getElementById('cImagem').value = c.imagem || '';
    document.getElementById('cAtivo').checked = !!c.ativo;
    document.getElementById('modalCategoria').classList.add('active');
};

window.deleteCategoria = async (id) => {
    if (!confirm('Excluir esta categoria? Produtos vinculados ficarão sem categoria.')) return;
    try {
        await fetch(`${API_BASE}/categorias/${id}`, { method: 'DELETE', credentials: 'include' });
        showToast('Categoria excluída!', 'success');
        await loadCategorias();
        loadDashboard();
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
};

// ========== BUSCA E FILTROS ==========
function setupSearchFilters() {
    const buscaProdutos = document.getElementById('buscaProdutos');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroDestaque = document.getElementById('filtroDestaque');
    const buscaCategorias = document.getElementById('buscaCategorias');

    function applyProductFilters() {
        const busca = buscaProdutos.value.toLowerCase();
        const catId = filtroCategoria.value;
        const status = filtroStatus.value;
        const destaque = filtroDestaque.value;

        let filtered = allProdutos;

        if (busca) {
            filtered = filtered.filter(p => 
                p.nome.toLowerCase().includes(busca) || 
                (p.descricao || '').toLowerCase().includes(busca)
            );
        }
        if (catId) {
            filtered = filtered.filter(p => String(p.categoria_id) === catId);
        }
        if (status === 'ativo') {
            filtered = filtered.filter(p => p.ativo);
        } else if (status === 'inativo') {
            filtered = filtered.filter(p => !p.ativo);
        }
        if (destaque === 'sim') {
            filtered = filtered.filter(p => p.destaque);
        } else if (destaque === 'nao') {
            filtered = filtered.filter(p => !p.destaque);
        }

        renderProdutos(filtered);
    }

    buscaProdutos.addEventListener('input', applyProductFilters);
    filtroCategoria.addEventListener('change', applyProductFilters);
    filtroStatus.addEventListener('change', applyProductFilters);
    filtroDestaque.addEventListener('change', applyProductFilters);

    buscaCategorias.addEventListener('input', (e) => {
        const busca = e.target.value.toLowerCase();
        const filtered = allCategorias.filter(c => c.nome.toLowerCase().includes(busca));
        renderCategorias(filtered);
    });
}

// ========== UTILS ==========
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}