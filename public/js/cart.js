let cart = [];

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch(e) {
            cart = [];
        }
    } else {
        cart = [];
    }
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(id, name, price, min = 5) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += min;
    } else {
        cart.push({ id, name, price, quantity: min });
    }
    saveCart();
    renderCart();
    alert('Товар добавлен в корзину');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function updateCartCount() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElem = document.getElementById('cartCount');
    if (cartCountElem) cartCountElem.textContent = totalCount;
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart" style="text-align:center; padding:40px;">Корзина пуста</p>';
        if (totalSpan) totalSpan.textContent = '0';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p>${item.price} ₽ × ${item.quantity} шт = ${itemTotal.toLocaleString()} ₽</p>
                </div>
                <button class="btn-danger" onclick="removeFromCart(${index})" style="background:#c0392b; color:white; padding:5px 15px; border:none; border-radius:20px; cursor:pointer;">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    if (totalSpan) totalSpan.textContent = total.toLocaleString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function checkout() {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
        alert('Для оформления заказа необходимо войти в аккаунт');
        showLoginModal();
        return;
    }
    
    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    if (typeof createOrder !== 'function') {
        alert('Ошибка: функция создания заказа не загружена');
        return;
    }
    
    try {
        for (const item of cart) {
            await createOrder({
                product_id: item.id,
                quantity: item.quantity
            });
        }
        alert('Заказ успешно оформлен!');
        cart = [];
        saveCart();
        renderCart();
        showPage('home');
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        alert('Ошибка оформления заказа: ' + error.message);
    }
}