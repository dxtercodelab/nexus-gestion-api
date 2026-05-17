const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const { validate } = require('../middlewares/validateMiddleware');
const { 
  createProductSchema, 
  updateProductSchema 
} = require('../validators/productValidator');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', validate(createProductSchema), createProduct);
router.put('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;