// routes/products.js
const router = require('express').Router();
const ctrl   = require('../controllers/productController');
const auth   = require('../middleware/auth');
const admin  = require('../middleware/admin');
const upload = require('../middleware/upload');

router.get('/',       ctrl.list);
router.get('/search', ctrl.search);
router.get('/:id',    ctrl.getOne);
router.post('/', auth, admin, upload.single('image'), ctrl.create);

module.exports = router;
