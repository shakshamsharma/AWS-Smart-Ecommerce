const router = require('express').Router();
const ctrl   = require('../controllers/metricsController');
const auth   = require('../middleware/auth');
const admin  = require('../middleware/admin');

router.get('/dashboard', auth, admin, ctrl.getDashboard);

module.exports = router;
