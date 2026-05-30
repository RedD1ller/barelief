const express = require('express');
const { Pool } = require('pg');  // PostgreSQL вместо MySQL
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'barelief_secret_key_2026';

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ (PostgreSQL) =====
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Обязательно для Render
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('✅ Подключено к PostgreSQL');
    release();
});

// ===== СОЗДАНИЕ ТАБЛИЦ (автоматически при запуске) =====
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Таблица пользователей
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Таблица категорий
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(50) UNIQUE NOT NULL
            )
        `);
        
        // Таблица товаров
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                short_description VARCHAR(500),
                price DECIMAL(10,2) NOT NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                image_url VARCHAR(500),
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Таблица заказов
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                customer_email VARCHAR(100),
                quantity INTEGER DEFAULT 1,
                comment TEXT,
                status VARCHAR(20) DEFAULT 'new',
                admin_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Таблицы созданы/проверены');
        
        // Добавляем категории (если нет)
        const categories = [
            { name: 'Гномы', slug: 'gnome' },
            { name: 'Животные', slug: 'animals' },
            { name: 'Птицы', slug: 'birds' },
            { name: 'Новогодние', slug: 'newyear' },
            { name: 'Декор', slug: 'decor' }
        ];
        
        for (const cat of categories) {
            await client.query(
                'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
                [cat.name, cat.slug]
            );
        }
        
        // Добавляем администратора (если нет)
        const adminHash = await bcrypt.hash('12345', 10);
        await client.query(`
            INSERT INTO users (full_name, email, phone, password_hash, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO NOTHING
        `, ['Администратор', 'admin@barelief.ru', '+70000000000', adminHash, 'admin']);
        
        console.log('✅ Начальные данные добавлены');
        
    } catch (err) {
        console.error('❌ Ошибка инициализации БД:', err);
    } finally {
        client.release();
    }
}

// Запускаем инициализацию БД
initDatabase();

// ===== MIDDLEWARE: ПРОВЕРКА JWT =====
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Требуется авторизация' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

// =====================================================
// АУТЕНТИФИКАЦИЯ
// =====================================================

// РЕГИСТРАЦИЯ
app.post('/api/auth/register', async (req, res) => {
    const { full_name, email, phone, password } = req.body;
    
    if (!full_name || !email || !phone || !password) {
        return res.status(400).json({ status: 'error', message: 'Все поля обязательны' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
            [full_name, email, phone, hashedPassword, 'user']
        );
        res.json({ status: 'success', message: 'Регистрация успешна' });
    } catch (err) {
        if (err.code === '23505') { // Unique violation in PostgreSQL
            return res.status(400).json({ status: 'error', message: 'Email уже зарегистрирован' });
        }
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
});

// ВХОД
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email и пароль обязательны' });
    }
    
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, phone, password_hash, role FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Неверный email или пароль' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ status: 'error', message: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.full_name, phone: user.phone },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.json({
            status: 'success',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.full_name,
                    phone: user.phone
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
});

// =====================================================
// ТОВАРЫ
// =====================================================

app.get('/api/products', async (req, res) => {
    const { category } = req.query;
    let sql = `
        SELECT p.*, c.name as category_name, c.slug as category_slug 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.is_available = true
    `;
    const params = [];
    
    if (category && category !== 'all') {
        sql += ` AND c.slug = $1`;
        params.push(category);
    }
    
    try {
        const result = await pool.query(sql, params);
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки товаров' });
    }
});

// =====================================================
// ЗАКАЗЫ
// =====================================================

app.post('/api/orders', verifyToken, async (req, res) => {
    const { product_id, quantity, comment } = req.body;
    const userId = req.user.id;
    
    try {
        const userResult = await pool.query(
            'SELECT full_name, email, phone FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(500).json({ status: 'error', message: 'Пользователь не найден' });
        }
        
        const user = userResult.rows[0];
        const validQuantity = parseInt(quantity) || 1;
        
        await pool.query(
            `INSERT INTO orders (product_id, user_id, customer_name, customer_phone, customer_email, quantity, comment)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [product_id || null, userId, user.full_name, user.phone, user.email, validQuantity, comment || null]
        );
        
        res.json({ status: 'success', message: 'Заказ успешно оформлен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка создания заказа' });
    }
});

app.get('/api/myorders', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT o.*, p.name as product_name, p.price as product_price 
             FROM orders o
             LEFT JOIN products p ON o.product_id = p.id
             WHERE o.user_id = $1 
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки заказов' });
    }
});

// =====================================================
// АДМИН-ПАНЕЛЬ
// =====================================================

app.get('/api/admin/orders', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    }
    
    try {
        const result = await pool.query(
            `SELECT o.*, p.name as product_name, u.full_name as user_name, u.email as user_email
             FROM orders o
             LEFT JOIN products p ON o.product_id = p.id
             LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC`
        );
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки заказов' });
    }
});

app.patch('/api/admin/orders/:id/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    }
    
    const orderId = req.params.id;
    const { status, admin_comment } = req.body;
    
    try {
        await pool.query(
            'UPDATE orders SET status = $1, admin_comment = $2 WHERE id = $3',
            [status || 'new', admin_comment || null, orderId]
        );
        res.json({ status: 'success', message: 'Статус обновлён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка обновления' });
    }
});

app.get('/api/admin/users', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    }
    
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки пользователей' });
    }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    }
    
    try {
        const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
        const newOrders = await pool.query('SELECT COUNT(*) FROM orders WHERE status = $1', ['new']);
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
        const totalProducts = await pool.query('SELECT COUNT(*) FROM products WHERE is_available = true');
        
        res.json({
            status: 'success',
            data: {
                totalOrders: parseInt(totalOrders.rows[0].count),
                newOrders: parseInt(newOrders.rows[0].count),
                totalUsers: parseInt(totalUsers.rows[0].count),
                totalProducts: parseInt(totalProducts.rows[0].count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки статистики' });
    }
});

// =====================================================
// ЗАПУСК СЕРВЕРА
// =====================================================
app.listen(PORT, () => {
    console.log(`
    ═══════════════════════════════════════════════════════
    🚀 СЕРВЕР УСПЕШНО ЗАПУЩЕН!
    ═══════════════════════════════════════════════════════
    📡 Адрес: http://localhost:${PORT}
    🔑 Админ: admin@barelief.ru
    🔐 Пароль: 12345
    ═══════════════════════════════════════════════════════
    `);
});