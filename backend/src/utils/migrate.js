require('dotenv').config();
const { connectDB, query } = require('../config/database');

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin      TINYINT(1) DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS categories (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS products (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    sku         VARCHAR(80) UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL,
    category_id INT NOT NULL,
    stock_qty   INT DEFAULT 0,
    image_url   VARCHAR(500),
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_category (category_id),
    INDEX idx_active   (is_active),
    FULLTEXT  idx_search (name, description)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS orders (
    id               CHAR(36) PRIMARY KEY,
    user_id          INT NOT NULL,
    total_amount     DECIMAL(10,2) NOT NULL,
    status           ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
    shipping_address JSON,
    payment_method   VARCHAR(50),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user   (user_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    order_id   CHAR(36) NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

(async () => {
  await connectDB();
  console.log('Running migrations...');
  for (const sql of migrations) {
    await query(sql);
    console.log('  ✓', sql.slice(0, 60).replace(/\n/g, ' ').trim() + '...');
  }
  console.log('All migrations complete.');
  process.exit(0);
})();
