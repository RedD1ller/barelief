let currentProducts = [];

async function loadCatalog() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loader">Загрузка товаров...</div>';
    
    try {
        if (typeof fetchProducts !== 'function') {
            grid.innerHTML = '<p class="error">Ошибка: API не загружен</p>';
            return;
        }
        
        const result = await fetchProducts();
        console.log('Загружены товары:', result);
        
        if (result.status === 'success') {
            currentProducts = result.data || [];
            renderProducts(currentProducts);
        } else {
            grid.innerHTML = '<p class="error">Ошибка загрузки каталога</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        grid.innerHTML = '<p class="error">Ошибка подключения к серверу. Убедитесь, что сервер запущен.</p>';
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!products || products.length === 0) {
        grid.innerHTML = '<p class="empty">Товаров не найдено</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => `
        <div class="product-card" data-category="${product.category_slug || ''}">
            <div class="product-badge">Опт</div>
            <img src="${product.image_url || '/images/placeholder.jpg'}" alt="${escapeHtml(product.name)}" class="product-img" onerror="this.src='https://placehold.co/200x150?text=Фото+не+загружено'">
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <p class="product-desc">${escapeHtml(product.short_description || (product.description ? product.description.substring(0, 80) : ''))}</p>
            <div class="product-price">${Number(product.price).toLocaleString()} ₽ <small>за шт</small></div>
            <div class="product-min">мин. 5 шт</div>
            <button class="btn btn-primary" onclick="addToCart(${product.id}, '${escapeHtml(product.name)}', ${product.price}, 5)">
                В корзину
            </button>
        </div>
    `).join('');
}

function filterProducts(category) {
    console.log('Фильтрация по категории:', category);
    
    let filtered;
    if (category === 'all') {
        filtered = currentProducts;
    } else {
        filtered = currentProducts.filter(p => p.category_slug === category);
    }
    
    renderProducts(filtered);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/['"]/g, function(m) {
        if (m === "'") return '&#39;';
        if (m === '"') return '&quot;';
        return m;
    });
}