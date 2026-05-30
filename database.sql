CREATE DATABASE IF NOT EXISTS barelief_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE barelief_db;

-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА КАТЕГОРИЙ
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE
);

-- ТАБЛИЦА ТОВАРОВ
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ТАБЛИЦА ЗАКАЗОВ
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NULL,
    user_id INT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    quantity INT DEFAULT 1,
    comment TEXT,
    status ENUM('new', 'processing', 'completed', 'declined') DEFAULT 'new',
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ЗАПОЛНЕНИЕ КАТЕГОРИЙ
INSERT INTO categories (name, slug) VALUES
('Гномы', 'gnome'),
('Животные', 'animals'),
('Птицы', 'birds'),
('Новогодние', 'newyear'),
('Декор', 'decor');

-- ЗАПОЛНЕНИЕ ТОВАРОВ
INSERT INTO products (name, description, short_description, price, category_id, image_url) VALUES
('Садовая фигура навесная Дятел', 'Высота 25 см, детализированная роспись', 'Дятел на дерево', 942, 3, 'https://basket-14.wbbasket.ru/vol2103/part210328/210328074/images/big/1.webp'),
('Фигурка садовая Семейство сов', 'Большая декоративная композиция, высота 26 см', 'Семейство сов', 1702, 3, 'https://basket-05.wbbasket.ru/vol839/part83943/83943528/images/big/2.webp'),
('Садовая фигура на газон Ёжик', 'Высота 20 см, натуралистичный окрас', 'Ёжик для сада', 1240, 2, 'https://basket-10.wbbasket.ru/vol1509/part150926/150926656/images/big/1.webp'),
('Садовая фигурка Заяц с морковью', 'Высота 22 см, для дачи и дома', 'Заяц с морковью', 942, 2, 'https://basket-15.wbbasket.ru/vol2339/part233985/233985771/images/big/1.webp'),
('Фигура декоративная "Конь" (золото)', 'Эффектное украшение сада, покрытие под золото', 'Конь золотой', 1706, 2, 'https://basket-27.wbbasket.ru/vol5025/part502560/502560339/images/big/1.webp'),
('Садовая Фигура Зайчик на ветке', 'Подвесная, 17 см', 'Зайчик на ветке', 871, 2, 'https://basket-08.wbbasket.ru/vol1142/part114205/114205201/images/big/1.webp'),
('Фигурка садовая гном', 'Классический садовый гном, высота 30 см', 'Садовый гном', 1419, 1, 'https://basket-10.wbbasket.ru/vol1515/part151582/151582677/images/big/1.webp'),
('Новогодняя статуэтка Дед Мороз', 'Высота 30 см, интерьерная', 'Дед Мороз под ёлку', 1400, 4, 'https://basket-17.wbbasket.ru/vol2675/part267595/267595916/images/big/1.webp'),
('Новогодний сувенир Фигура со светодиодом', 'Декоративная подсветка', 'Фигура со светодиодом', 1004, 4, 'https://basket-18.wbbasket.ru/vol2864/part286417/286417133/images/big/1.webp'),
('Подвеска новогодняя "Золотая подкова"', 'Сувенир "На счастье!"', 'Золотая подкова', 1251, 5, 'https://basket-27.wbbasket.ru/vol5025/part502560/502560341/images/big/1.webp');

INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('Администратор', 'admin@barelief.ru', '+70000000000', '$2a$10$TqHqYqXqYqXqYqXqYqXqYu', 'admin');