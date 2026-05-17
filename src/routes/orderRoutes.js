const express = require('express');
const router = express.Router();

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');

const { validate } = require('../middlewares/validateMiddleware');
const {
  createOrderSchema,
  updateOrderStatusSchema
} = require('../validators/orderValidator');

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.post('/', validate(createOrderSchema), createOrder);
router.put('/:id', validate(updateOrderStatusSchema), updateOrderStatus);
router.delete('/:id', deleteOrder);

module.exports = router;