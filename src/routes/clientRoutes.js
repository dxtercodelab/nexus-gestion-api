const express = require('express');
const router = express.Router();

const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');

const { validate } = require('../middlewares/validateMiddleware');
const { 
  createClientSchema, 
  updateClientSchema 
} = require('../validators/clientValidator');

router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', validate(createClientSchema), createClient);
router.put('/:id', validate(updateClientSchema), updateClient);
router.delete('/:id', deleteClient);

module.exports = router;