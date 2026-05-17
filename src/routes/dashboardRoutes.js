const express = require('express');
const router = express.Router();

const {
  getStats,
  getRecentOrders,
  getTopProducts,
  getMonthlySales,
  getOrdersByStatus
} = require('../controllers/dashboardController');

router.get('/stats', getStats);
router.get('/recent-orders', getRecentOrders);
router.get('/top-products', getTopProducts);
router.get('/monthly-sales', getMonthlySales);
router.get('/orders-by-status', getOrdersByStatus);

module.exports = router;