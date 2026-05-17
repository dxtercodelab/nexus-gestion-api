const { z } = require('zod');

// Schéma pour créer un produit
const createProductSchema = z.object({
  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(150, 'Le nom est trop long'),
  
  description: z.string()
    .max(1000, 'La description est trop longue')
    .optional(),
  
  prix: z.number()
    .positive('Le prix doit etre positif'),
  
  stock: z.number()
    .int('Le stock doit etre un entier')
    .min(0, 'Le stock ne peut pas etre negatif')
    .default(0),
  
  image_url: z.string()
    .url('URL invalide')
    .max(500)
    .optional()
});

// Schéma pour modifier un produit (tous les champs optionnels)
const updateProductSchema = z.object({
  nom: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  prix: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  image_url: z.string().url().max(500).optional()
});

module.exports = {
  createProductSchema,
  updateProductSchema
};