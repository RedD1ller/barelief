// Функция переключения между страницами
function showPage(pageId) {
    console.log('Переход на страницу:', pageId);
    
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Показываем выбранную страницу
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        activePage.style.display = 'block';
        console.log('Показана страница:', pageId);
    } else {
        console.error('Страница с id=' + pageId + ' не найдена!');
        return;
    }
    
    // Обновляем активный класс в меню
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Специальные действия для определённых страниц
    if (pageId === 'cart' && typeof renderCart === 'function') {
        renderCart();
    }
    
    if (pageId === 'account') {
        loadAccountPage();
    }
    
    // Закрываем мобильное меню
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.remove('active');
}

// Загрузка личного кабинета
function loadAccountPage() {
    if (!isAuthenticated || !isAuthenticated()) {
        showLoginModal();
        return;
    }
    
    const user = getUser ? getUser() : null;
    if (user) {
        const nameSpan = document.getElementById('accountName');
        const emailSpan = document.getElementById('accountEmail');
        const phoneSpan = document.getElementById('accountPhone');
        
        if (nameSpan) nameSpan.textContent = user.name || user.full_name || '—';
        if (emailSpan) emailSpan.textContent = user.email || '—';
        if (phoneSpan) phoneSpan.textContent = user.phone || '—';
    }
    
    // Загружаем историю заказов
    loadOrdersHistory();
}

// Загрузка истории заказов
async function loadOrdersHistory() {
    const container = document.getElementById('ordersHistory');
    if (!container) return;
    
    if (!isAuthenticated || !isAuthenticated()) {
        container.innerHTML = '<p>Войдите в аккаунт, чтобы видеть историю заказов.</p>';
        return;
    }
    
    container.innerHTML = '<div class="loader">Загрузка...</div>';
    
    try {
        if (typeof fetchMyOrders !== 'function') {
            container.innerHTML = '<p class="error">Функция загрузки заказов не определена</p>';
            return;
        }
        
        const result = await fetchMyOrders();
        if (result.status === 'success' && result.data && result.data.length > 0) {
            container.innerHTML = result.data.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">Заказ №${order.id}</span>
                        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                        <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>Товар:</strong> ${order.product_name || 'Не указан'}</p>
                        <p><strong>Количество:</strong> ${order.quantity} шт</p>
                        ${order.admin_comment ? `<p><strong>Комментарий менеджера:</strong> ${order.admin_comment}</p>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty">У вас пока нет заказов</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки истории заказов</p>';
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

// Переключение мобильного меню
function toggleMenu() {
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.toggle('active');
}

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
    console.log('Сайт загружен, инициализация...');
    
    // Загружаем корзину из localStorage
    if (typeof loadCart === 'function') {
        loadCart();
    }
    
    // Загружаем каталог товаров
    if (typeof loadCatalog === 'function') {
        loadCatalog();
    }
    
    // Обновляем UI авторизации
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
    
    // Устанавливаем обработчики для кнопок фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const category = this.getAttribute('data-category');
            if (category && typeof filterProducts === 'function') {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                filterProducts(category);
            }
        });
    });
    
    // Закрытие модальных окон при клике вне их
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Показываем главную страницу по умолчанию
    showPage('home');
});