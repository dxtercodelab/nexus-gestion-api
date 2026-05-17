const pool = require('../config/db');
const { paginate, buildPaginationMeta } = require('../utils/pagination');

// GET /api/products?search=...&minPrice=...&maxPrice=...&inStock=...&sort=...&order=...
const getAllProducts = async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, minPrice, maxPrice, inStock, sort, order } = req.query;

    // Construire la requête WHERE dynamiquement
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;

    // Filtre : recherche par nom
    if (search) {
      conditions.push(`nom ILIKE $${paramIndex}`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtre : prix minimum
    if (minPrice) {
      conditions.push(`prix >= $${paramIndex}`);
      values.push(parseFloat(minPrice));
      paramIndex++;
    }

    // Filtre : prix maximum
    if (maxPrice) {
      conditions.push(`prix <= $${paramIndex}`);
      values.push(parseFloat(maxPrice));
      paramIndex++;
    }

    // Filtre : en stock
    if (inStock === 'true') {
      conditions.push('stock > 0');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Tri sécurisé (uniquement champs autorisés)
    const allowedSorts = ['id', 'nom', 'prix', 'stock', 'created_at'];
    const sortField = allowedSorts.includes(sort) ? sort : 'id';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Récupérer les données
    const dataQuery = `
      SELECT * FROM products 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await pool.query(dataQuery, [...values, limit, offset]);

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: result.rows,
      pagination,
      filters: { search, minPrice, maxPrice, inStock, sort, order }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/products/:id → Un produit
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouve'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/products → Créer un produit
const createProduct = async (req, res) => {
  try {
    const { nom, description, prix, stock, image_url } = req.body;

    const result = await pool.query(
      `INSERT INTO products (nom, description, prix, stock, image_url) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nom, description || null, prix, stock || 0, image_url || null]
    );

    res.status(201).json({
      success: true,
      message: 'Produit cree avec succes',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/products/:id → Modifier un produit
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, prix, stock, image_url } = req.body;

    // Vérifier que le produit existe
    const existing = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouve'
      });
    }

    const product = existing.rows[0];

    // Mettre à jour seulement les champs fournis
    const result = await pool.query(
      `UPDATE products 
       SET nom = $1, description = $2, prix = $3, stock = $4, image_url = $5
       WHERE id = $6 
       RETURNING *`,
      [
        nom || product.nom,
        description !== undefined ? description : product.description,
        prix !== undefined ? prix : product.prix,
        stock !== undefined ? stock : product.stock,
        image_url !== undefined ? image_url : product.image_url,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Produit modifie',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/products/:id → Soft delete
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouve'
      });
    }

    res.json({
      success: true,
      message: 'Produit supprime'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};