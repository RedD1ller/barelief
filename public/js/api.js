const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://bare-lief.ru/api';
})();

async function fetchProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/products?${params}`);
    if (!response.ok) throw new Error('Ошибка загрузки товаров');
    return await response.json();
}

async function fetchProductById(id) {
    const response = await fetch(`${API_URL}/products/${id}`);
    if (!response.ok) throw new Error('Товар не найден');
    return await response.json();
}

async function createOrder(orderData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка отправки заказа');
    }
    return await response.json();
}

async function fetchMyOrders() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/myorders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки заказов');
    return await response.json();
}

async function register(full_name, email, phone, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, phone, password })
    });
    return await response.json();
}

async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.status === 'success') {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    return data;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

async function fetchAllOrders() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки заказов');
    return await response.json();
}

async function updateOrderStatus(orderId, status, adminComment = '') {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, admin_comment: adminComment })
    });
    if (!response.ok) throw new Error('Ошибка обновления статуса');
    return await response.json();
}

async function fetchAllUsers() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки пользователей');
    return await response.json();
}

async function fetchStats() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки статистики');
    return await response.json();
}