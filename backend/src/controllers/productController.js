const { query }    = require('../config/database');
const { getOrSet, invalidate } = require('../config/redis');
const { uploadToS3 } = require('../utils/s3');
const logger       = require('../utils/logger');

const CACHE_TTL = {
  list:   300,   // 5 minutes
  single: 600,   // 10 minutes
  search: 60,    // 1 minute (dynamic)
};

// GET /api/products
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `products:list:${page}:${limit}:${category || 'all'}:${sort}:${order}`;

    const data = await getOrSet(cacheKey, CACHE_TTL.list, async () => {
      let sql = `SELECT p.*, c.name AS category_name
                 FROM products p
                 JOIN categories c ON c.id = p.category_id
                 WHERE p.is_active = 1`;
      const params = [];

      if (category) {
        sql += ' AND c.slug = ?';
        params.push(category);
      }

      sql += ` ORDER BY p.${sort} ${order} LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const [products, [{ total }]] = await Promise.all([
        query(sql, params),
        query(`SELECT COUNT(*) AS total FROM products WHERE is_active = 1${category ? ' AND category_id = (SELECT id FROM categories WHERE slug = ?)' : ''}`, category ? [category] : []),
      ]);

      return { products, total, page: Number(page), limit: Number(limit) };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `products:single:${id}`;

    const product = await getOrSet(cacheKey, CACHE_TTL.single, async () => {
      const [rows] = await Promise.all([
        query(`SELECT p.*, c.name AS category_name, c.slug AS category_slug
               FROM products p
               JOIN categories c ON c.id = p.category_id
               WHERE p.id = ? AND p.is_active = 1`, [id]),
      ]);
      return rows[0] || null;
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// GET /api/products/search?q=
exports.search = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const cacheKey = `products:search:${q.toLowerCase().substring(0, 50)}:${limit}`;

    const results = await getOrSet(cacheKey, CACHE_TTL.search, async () => {
      return query(
        `SELECT id, name, price, image_url, stock_qty
         FROM products
         WHERE is_active = 1
           AND (name LIKE ? OR description LIKE ?)
         ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, stock_qty DESC
         LIMIT ?`,
        [`%${q}%`, `%${q}%`, `${q}%`, Number(limit)]
      );
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// POST /api/products  (admin)
exports.create = async (req, res, next) => {
  try {
    const { name, description, price, category_id, stock_qty, sku } = req.body;
    let image_url = null;

    if (req.file) {
      image_url = await uploadToS3(req.file, `products/${Date.now()}-${req.file.originalname}`);
    }

    const result = await query(
      `INSERT INTO products (name, description, price, category_id, stock_qty, sku, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, stock_qty, sku, image_url]
    );

    await invalidate('products:list:*');
    res.status(201).json({ id: result.insertId, message: 'Product created' });
  } catch (err) {
    next(err);
  }
};
