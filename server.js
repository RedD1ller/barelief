const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'barelief_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL подключение
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
        return;
    }
    console.log('✅ Подключено к PostgreSQL');
});

// Инициализация таблиц
async function initDatabase() {
    const client = await pool.connect();
    try {
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
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(50) UNIQUE NOT NULL
            )
        `);
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
        console.log('✅ Таблицы созданы');

        // Категории
        const categories = [
            ['Гномы', 'gnome'],
            ['Животные', 'animals'],
            ['Птицы', 'birds'],
            ['Новогодние', 'newyear'],
            ['Декор', 'decor']
        ];
        for (const [name, slug] of categories) {
            await client.query(
                'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
                [name, slug]
            );
        }

        // Администратор
        const adminHash = await bcrypt.hash('12345', 10);
        await client.query(`
            INSERT INTO users (full_name, email, phone, password_hash, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO NOTHING
        `, ['Администратор', 'admin@barelief.ru', '+70000000000', adminHash, 'admin']);

        console.log('✅ Начальные данные добавлены');
    } catch (err) {
        console.error('Ошибка инициализации:', err);
    } finally {
        client.release();
    }
}
initDatabase();

// ===== АУТЕНТИФИКАЦИЯ =====
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
        if (err.code === '23505') {
            return res.status(400).json({ status: 'error', message: 'Email уже зарегистрирован' });
        }
        res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
});

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
            data: { token, user: { id: user.id, email: user.email, role: user.role, name: user.full_name, phone: user.phone } }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
});

// ===== ТОВАРЫ =====
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
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки товаров' });
    }
});

// ===== ЗАКАЗЫ =====
app.post('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Требуется авторизация' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const { product_id, quantity, comment } = req.body;
        const userResult = await pool.query('SELECT full_name, email, phone FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
        const user = userResult.rows[0];
        await pool.query(
            `INSERT INTO orders (product_id, user_id, customer_name, customer_phone, customer_email, quantity, comment)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [product_id || null, decoded.id, user.full_name, user.phone, user.email, parseInt(quantity) || 1, comment || null]
        );
        res.json({ status: 'success', message: 'Заказ успешно оформлен' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Ошибка создания заказа' });
    }
});

app.get('/api/myorders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Требуется авторизация' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const result = await pool.query(
            `SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
            [decoded.id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Ошибка загрузки заказов' });
    }
});

// ===== АДМИН-ПАНЕЛЬ =====
function verifyAdmin(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded.role === 'admin' ? decoded : null;
    } catch {
        return null;
    }
}

app.get('/api/admin/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const admin = verifyAdmin(token);
    if (!admin) return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    const result = await pool.query(
        `SELECT o.*, p.name as product_name, u.full_name as user_name FROM orders o LEFT JOIN products p ON o.product_id = p.id LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`
    );
    res.json({ status: 'success', data: result.rows });
});

app.patch('/api/admin/orders/:id/status', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const admin = verifyAdmin(token);
    if (!admin) return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    const { status, admin_comment } = req.body;
    await pool.query('UPDATE orders SET status = $1, admin_comment = $2 WHERE id = $3', [status || 'new', admin_comment || null, req.params.id]);
    res.json({ status: 'success', message: 'Статус обновлён' });
});

app.get('/api/admin/users', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const admin = verifyAdmin(token);
    if (!admin) return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
    const result = await pool.query('SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ status: 'success', data: result.rows });
});

app.get('/api/admin/stats', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const admin = verifyAdmin(token);
    if (!admin) return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
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
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔑 Админ: admin@barelief.ru / 12345`);
});