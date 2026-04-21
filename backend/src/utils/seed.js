require('dotenv').config();
const { connectDB, query } = require('../config/database');
const bcrypt = require('bcryptjs');

const categories = [
  { name: 'Electronics',  slug: 'electronics' },
  { name: 'Clothing',     slug: 'clothing' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Sports',       slug: 'sports' },
];

const products = [
  { sku: 'ELEC-001', name: 'Wireless Noise Cancelling Headphones', description: 'Premium ANC headphones with 30h battery life', price: 4999.00,  category_slug: 'electronics', stock_qty: 200 },
  { sku: 'ELEC-002', name: 'Smart Watch Pro 5',                   description: '1.9" AMOLED, GPS, heart rate, SpO2',           price: 9999.00,  category_slug: 'electronics', stock_qty: 150 },
  { sku: 'ELEC-003', name: '65" 4K QLED Smart TV',               description: 'Dolby Vision IQ, HDMI 2.1, 120Hz',            price: 79999.00, category_slug: 'electronics', stock_qty: 50  },
  { sku: 'CLO-001',  name: 'Men\'s Running Jacket',              description: 'Lightweight, windproof, reflective',           price: 1499.00,  category_slug: 'clothing',     stock_qty: 500 },
  { sku: 'CLO-002',  name: 'Women\'s Yoga Leggings',             description: '4-way stretch, moisture wicking',             price: 999.00,   category_slug: 'clothing',     stock_qty: 800 },
  { sku: 'HK-001',   name: 'Air Fryer 5L',                       description: 'Digital display, 8 presets, rapid air tech', price: 3499.00,  category_slug: 'home-kitchen', stock_qty: 300 },
  { sku: 'HK-002',   name: 'Coffee Machine Deluxe',              description: 'Bean-to-cup, 15 bar pump, built-in grinder', price: 12999.00, category_slug: 'home-kitchen', stock_qty: 80  },
  { sku: 'SP-001',   name: 'Resistance Band Set (5 levels)',      description: 'Natural latex, 10-50 lbs, carry bag',        price: 799.00,   category_slug: 'sports',       stock_qty: 1000},
  { sku: 'SP-002',   name: 'Foam Roller Pro',                    description: 'High density EVA, 45cm, massage grid',       price: 599.00,   category_slug: 'sports',       stock_qty: 600 },
];

(async () => {
  await connectDB();

  // Categories
  for (const cat of categories) {
    await query(
      'INSERT IGNORE INTO categories (name, slug) VALUES (?, ?)',
      [cat.name, cat.slug]
    );
  }
  console.log('Categories seeded');

  // Category map
  const catRows = await query('SELECT id, slug FROM categories');
  const catMap  = Object.fromEntries(catRows.map(c => [c.slug, c.id]));

  // Products
  for (const p of products) {
    await query(
      `INSERT IGNORE INTO products (sku, name, description, price, category_id, stock_qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.sku, p.name, p.description, p.price, catMap[p.category_slug], p.stock_qty]
    );
  }
  console.log('Products seeded');

  // Admin user
  const hash = await bcrypt.hash('Admin@1234', 12);
  await query(
    'INSERT IGNORE INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)',
    ['Admin User', 'admin@ecommerce.com', hash]
  );
  console.log('Admin user created: admin@ecommerce.com / Admin@1234');

  process.exit(0);
})();
