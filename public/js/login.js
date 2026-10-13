// ========================================
// ACHADINHOS - Login
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');

    // Se já estiver logado, redirecionar
    fetch('/api/admin/dashboard', { credentials: 'include' })
        .then(res => {
            if (res.ok) window.location.href = '/admin';
        })
        .catch(() => {});

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.add('active');
    }

    function hideError() {
        errorEl.classList.remove('active');
    }

    function setLoading(loading) {
        if (loading) {
            btnText.textContent = 'Entrando...';
            submitBtn.disabled = true;
        } else {
            btnText.textContent = 'Entrar no painel';
            submitBtn.disabled = false;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        if (!email || !senha) {
            showError('Preencha todos os campos.');
            return;
        }

        if (!email.includes('@')) {
            showError('Digite um e-mail válido.');
            return;
        }

        if (senha.length < 4) {
            showError('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok && data.success) {
                btnText.textContent = 'Redirecionando...';
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 300);
            } else {
                showError(data.error || 'E-mail ou senha incorretos.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Erro no login:', error);
            showError('Erro ao conectar ao servidor. Tente novamente.');
            setLoading(false);
        }
    });
});