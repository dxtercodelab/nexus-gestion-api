const { z } = require('zod');

// Schéma pour un item de commande
const orderItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive('La quantite doit etre superieure a 0')
});

// Schéma pour créer une commande
const createOrderSchema = z.object({
  client_id: z.number().int().positive(),
  items: z.array(orderItemSchema)
    .min(1, 'La commande doit contenir au moins 1 produit')
});

// Schéma pour modifier le statut
const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Statut invalide' })
  })
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema
};