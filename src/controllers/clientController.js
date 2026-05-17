const pool = require('../config/db');

const { paginate, buildPaginationMeta } = require('../utils/pagination');

// GET /api/clients?search=...&ville=...&sort=...&order=...
const getAllClients = async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, ville, sort, order } = req.query;

    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;

    // Filtre : recherche par nom OU email
    if (search) {
      conditions.push(`(nom ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtre : par ville
    if (ville) {
      conditions.push(`ville ILIKE $${paramIndex}`);
      values.push(`%${ville}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Tri sécurisé
    const allowedSorts = ['id', 'nom', 'email', 'ville', 'created_at'];
    const sortField = allowedSorts.includes(sort) ? sort : 'id';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Compter
    const countQuery = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Récupérer
    const dataQuery = `
      SELECT * FROM clients 
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
      filters: { search, ville, sort, order }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/clients/:id → Un client + ses commandes
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le client
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouve'
      });
    }

    // Récupérer ses commandes
    const ordersResult = await pool.query(
      'SELECT id, status, montant_total, created_at FROM orders WHERE client_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...clientResult.rows[0],
        orders: ordersResult.rows,
        ordersCount: ordersResult.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/clients → Créer
const createClient = async (req, res) => {
  try {
    const { nom, email, telephone, adresse, ville } = req.body;

    // Vérifier que l'email n'existe pas déjà
    const existing = await pool.query(
      'SELECT id FROM clients WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est deja utilise'
      });
    }

    const result = await pool.query(
      `INSERT INTO clients (nom, email, telephone, adresse, ville) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nom, email, telephone || null, adresse || null, ville || null]
    );

    res.status(201).json({
      success: true,
      message: 'Client cree avec succes',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/clients/:id → Modifier
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, telephone, adresse, ville } = req.body;

    const existing = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouve'
      });
    }

    // Si email modifié, vérifier qu'il n'est pas déjà pris
    if (email && email !== existing.rows[0].email) {
      const emailCheck = await pool.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cet email est deja utilise'
        });
      }
    }

    const client = existing.rows[0];

    const result = await pool.query(
      `UPDATE clients 
       SET nom = $1, email = $2, telephone = $3, adresse = $4, ville = $5
       WHERE id = $6 
       RETURNING *`,
      [
        nom || client.nom,
        email || client.email,
        telephone !== undefined ? telephone : client.telephone,
        adresse !== undefined ? adresse : client.adresse,
        ville !== undefined ? ville : client.ville,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Client modifie',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/clients/:id → Soft delete (avec vérification commandes)
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le client a des commandes actives
    const ordersCheck = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE client_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
      [id]
    );

    if (parseInt(ordersCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer : ce client a des commandes en cours'
      });
    }

    const result = await pool.query(
      `UPDATE clients 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouve'
      });
    }

    res.json({
      success: true,
      message: 'Client supprime'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};