const { z } = require('zod');

const createClientSchema = z.object({
  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(100, 'Le nom est trop long'),
  
  email: z.string()
    .email('Email invalide')
    .max(150),
  
  telephone: z.string()
    .max(20)
    .optional(),
  
  adresse: z.string()
    .max(500)
    .optional(),
  
  ville: z.string()
    .max(100)
    .optional()
});

const updateClientSchema = z.object({
  nom: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  telephone: z.string().max(20).optional(),
  adresse: z.string().max(500).optional(),
  ville: z.string().max(100).optional()
});

module.exports = {
  createClientSchema,
  updateClientSchema
};