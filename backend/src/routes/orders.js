// routes/orders.js
const router = require('express').Router();
const ctrl   = require('../controllers/orderController');
const auth   = require('../middleware/auth');

router.post('/checkout', auth, ctrl.checkout);
router.get('/',          auth, ctrl.listUserOrders);
router.get('/:id',       auth, ctrl.getOrder);

module.exports = router;
