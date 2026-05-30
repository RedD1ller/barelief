function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
}

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Заполните email и пароль');
        return;
    }
    
    try {
        const result = await login(email, password);
        if (result.status === 'success') {
            alert(`Добро пожаловать, ${result.data.user.name || result.data.user.email}!`);
            closeModal('loginModal');
            updateAuthUI();
            if (result.data.user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                showPage('home');
            }
        } else {
            alert(result.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка подключения к серверу');
    }
}

async function handleRegister() {
    const full_name = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    if (!full_name || !email || !phone || !password) {
        alert('Заполните все поля');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('Пароли не совпадают');
        return;
    }
    
    try {
        const result = await register(full_name, email, phone, password);
        if (result.status === 'success') {
            alert('Регистрация успешна! Теперь войдите.');
            closeModal('registerModal');
            showLoginModal();
        } else {
            alert(result.message || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка подключения к серверу');
    }
}

function handleLogout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        logout();
    }
}

function updateAuthUI() {
    const user = getUser();
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userNameSpan = document.getElementById('userName');
    
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            if (userNameSpan) userNameSpan.textContent = user.name || user.email;
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}