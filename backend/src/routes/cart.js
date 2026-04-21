const router = require('express').Router();
const auth   = require('../middleware/auth');
const { client: redis } = require('../config/redis');

// Cart stored in Redis keyed by user ID — fast, stateless
// Key: cart:<userId>  Value: JSON array of { product_id, quantity }

router.get('/', auth, async (req, res, next) => {
  try {
    const raw = await redis.get(`cart:${req.user.id}`);
    res.json(raw ? JSON.parse(raw) : []);
  } catch (err) { next(err); }
});

router.post('/add', auth, async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const key = `cart:${req.user.id}`;
    const raw = await redis.get(key);
    const cart = raw ? JSON.parse(raw) : [];

    const idx = cart.findIndex(i => i.product_id === product_id);
    if (idx >= 0) cart[idx].quantity += quantity;
    else cart.push({ product_id, quantity });

    await redis.setEx(key, 86400, JSON.stringify(cart)); // TTL 24h
    res.json(cart);
  } catch (err) { next(err); }
});

router.put('/update', auth, async (req, res, next) => {
  try {
    const { product_id, quantity } = req.body;
    const key = `cart:${req.user.id}`;
    const raw = await redis.get(key);
    let cart  = raw ? JSON.parse(raw) : [];

    if (quantity <= 0) {
      cart = cart.filter(i => i.product_id !== product_id);
    } else {
      const idx = cart.findIndex(i => i.product_id === product_id);
      if (idx >= 0) cart[idx].quantity = quantity;
    }

    await redis.setEx(key, 86400, JSON.stringify(cart));
    res.json(cart);
  } catch (err) { next(err); }
});

router.delete('/clear', auth, async (req, res, next) => {
  try {
    await redis.del(`cart:${req.user.id}`);
    res.json({ message: 'Cart cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
