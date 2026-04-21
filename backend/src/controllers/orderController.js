const { query }              = require('../config/database');
const { decrementInventory } = require('../config/redis');
const { v4: uuidv4 }         = require('uuid');
const logger                 = require('../utils/logger');

// POST /api/orders/checkout
exports.checkout = async (req, res, next) => {
  const conn = await require('../config/database').pool.getConnection();
  try {
    const { items, shipping_address, payment_method } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // ── Validate products and compute total ───────────────────────────────────
    const productIds = items.map(i => i.product_id);
    const products = await query(
      `SELECT id, name, price, stock_qty FROM products
       WHERE id IN (${productIds.map(() => '?').join(',')}) AND is_active = 1`,
      productIds
    );

    if (products.length !== items.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    let total = 0;
    for (const item of items) {
      const p = productMap[item.product_id];
      if (!p) throw new Error(`Product ${item.product_id} not found`);
      total += p.price * item.quantity;
    }

    // ── Atomically decrement Redis inventory ──────────────────────────────────
    const reservations = [];
    try {
      for (const item of items) {
        await decrementInventory(item.product_id, item.quantity);
        reservations.push(item);
      }
    } catch (inventoryErr) {
      // Rollback any successful decrements
      for (const r of reservations) {
        const { client } = require('../config/redis');
        await client.incrBy(`inventory:${r.product_id}`, r.quantity);
      }
      return res.status(409).json({ error: inventoryErr.message });
    }

    // ── Write order to DB (transaction) ───────────────────────────────────────
    await conn.beginTransaction();

    const orderId = uuidv4();
    await conn.execute(
      `INSERT INTO orders (id, user_id, total_amount, status, shipping_address, payment_method)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [orderId, userId, total, JSON.stringify(shipping_address), payment_method]
    );

    for (const item of items) {
      const p = productMap[item.product_id];
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, p.price]
      );

      // Update DB stock (async, best effort — Redis is source of truth in real-time)
      await conn.execute(
        `UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    await conn.commit();

    logger.info(`Order ${orderId} created — user ${userId} — total ₹${total.toFixed(2)}`);
    res.status(201).json({ order_id: orderId, total, status: 'pending' });

  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/orders
exports.listUserOrders = async (req, res, next) => {
  try {
    const orders = await query(
      `SELECT o.id, o.total_amount, o.status, o.created_at,
              COUNT(oi.id) AS item_count
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
exports.getOrder = async (req, res, next) => {
  try {
    const [order] = await query(
      `SELECT o.*, u.email AS user_email
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await query(
      `SELECT oi.*, p.name AS product_name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    res.json({ ...order, items });
  } catch (err) {
    next(err);
  }
};
