const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyProject, getClientLogistics } = require('../controllers/orderController');

router.post('/order', protect, createOrder);
router.get('/my-project', protect, getMyProject);
router.get('/logistics', protect, getClientLogistics); // <-- NOUVELLE ROUTE

module.exports = router;