let currentUser = null;

// Проверка доступа администратора
async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    const user = getUser();
    
    if (!token || !user || user.role !== 'admin') {
        alert('Доступ запрещён. Требуются права администратора.');
        window.location.href = '/';
        return false;
    }
    
    currentUser = user;
    return true;
}

// Загрузка статистики на дашборд
async function loadStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    try {
        const result = await fetchStats();
        if (result.status === 'success') {
            const stats = result.data;
            
            document.getElementById('statTotalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('statNewOrders').textContent = stats.newOrders || 0;
            document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('statTotalProducts').textContent = stats.totalProducts || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Загрузка списка заказов
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Загрузка...</td></tr>';
    
    try {
        const result = await fetchAllOrders();
        if (result.status === 'success') {
            if (!result.data || result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">Нет заказов</td></tr>';
                return;
            }
            
            tbody.innerHTML = result.data.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.user_name || order.customer_name}<br><small>${order.user_email || order.customer_email}</small></td>
                    <td>${order.product_name || '-'}</td>
                    <td>${order.quantity}</td>
                    <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                    <td>
                        <select class="status-select" data-id="${order.id}" onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Выполнен</option>
                            <option value="declined" ${order.status === 'declined' ? 'selected' : ''}>Отклонён</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn-small" onclick="showOrderComment(${order.id}, '${escapeHtml(order.admin_comment || '')}')">✏️</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        tbody.innerHTML = '<tr><td colspan="7">Ошибка загрузки</td></tr>';
    }
}

// Обновление статуса заказа
async function updateOrderStatus(orderId, newStatus) {
    try {
        await updateOrderStatus(orderId, newStatus);
        alert('Статус заказа обновлён');
        loadOrders();
        loadStats();
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка обновления статуса');
    }
}

// Показать окно комментария к заказу
function showOrderComment(orderId, currentComment) {
    const newComment = prompt('Введите комментарий к заказу:', currentComment);
    if (newComment !== null) {
        updateOrderComment(orderId, newComment);
    }
}

// Обновление комментария к заказу
async function updateOrderComment(orderId, comment) {
    try {
        await updateOrderStatus(orderId, null, comment);
        alert('Комментарий сохранён');
        loadOrders();
    } catch (error) {
        console.error('Ошибка сохранения комментария:', error);
        alert('Ошибка сохранения комментария');
    }
}

// Загрузка списка пользователей
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Загрузка...</td></tr>';
    
    try {
        const result = await fetchAllUsers();
        if (result.status === 'success') {
            if (!result.data || result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">Нет пользователей</td></tr>';
                return;
            }
            
            tbody.innerHTML = result.data.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${escapeHtml(user.full_name)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${user.phone}</td>
                    <td>${user.role === 'admin' ? '👑 Администратор' : '👤 Пользователь'}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        tbody.innerHTML = '<tr><td colspan="6">Ошибка загрузки</td></tr>';
    }
}

// Получение текста статуса
function getStatusText(status) {
    const statuses = {
        'new': 'Новый',
        'processing': 'В обработке',
        'completed': 'Выполнен',
        'declined': 'Отклонён'
    };
    return statuses[status] || status;
}

// Переключение страниц в админке
function showAdminPage(page) {
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');
    
    document.querySelectorAll('.admin-sidebar nav a').forEach(a => a.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    if (page === 'dashboard') loadStats();
    if (page === 'orders') loadOrders();
    if (page === 'users') loadUsers();
}

// Выход из админки
function handleAdminLogout() {
    logout();
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    
    // Загружаем статистику на главную страницу админки
    loadStats();
    
    // Устанавливаем обработчики для кнопок навигации
    document.querySelectorAll('.admin-sidebar nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) showAdminPage(page);
        });
    });
});