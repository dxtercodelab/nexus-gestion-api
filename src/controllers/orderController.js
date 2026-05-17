const pool = require('../config/db');

const { paginate, buildPaginationMeta } = require('../utils/pagination');

// GET /api/orders?status=...&clientId=...&dateFrom=...&dateTo=...&sort=...&order=...
const getAllOrders = async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, clientId, dateFrom, dateTo, sort, order } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Filtre : par statut
    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Filtre : par client
    if (clientId) {
      conditions.push(`o.client_id = $${paramIndex}`);
      values.push(parseInt(clientId));
      paramIndex++;
    }

    // Filtre : date de début
    if (dateFrom) {
      conditions.push(`o.created_at >= $${paramIndex}`);
      values.push(dateFrom);
      paramIndex++;
    }

    // Filtre : date de fin
    if (dateTo) {
      conditions.push(`o.created_at <= $${paramIndex}`);
      values.push(dateTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Tri sécurisé
    const allowedSorts = ['id', 'status', 'montant_total', 'created_at'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Compter
    const countQuery = `SELECT COUNT(*) FROM orders o ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Récupérer avec JOIN
    const dataQuery = `
      SELECT 
        o.id, 
        o.status, 
        o.montant_total, 
        o.created_at,
        c.id as client_id,
        c.nom as client_nom,
        c.email as client_email
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      ${whereClause}
      ORDER BY o.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await pool.query(dataQuery, [...values, limit, offset]);

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: result.rows,
      pagination,
      filters: { status, clientId, dateFrom, dateTo, sort, order }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id → Détails (commande + client + items)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la commande avec le client
    const orderResult = await pool.query(`
      SELECT 
        o.*,
        c.nom as client_nom,
        c.email as client_email,
        c.telephone as client_telephone
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvee'
      });
    }

    // Récupérer les items
    const itemsResult = await pool.query(`
      SELECT 
        oi.id,
        oi.quantity,
        oi.prix_unitaire,
        (oi.quantity * oi.prix_unitaire) as sous_total,
        p.id as product_id,
        p.nom as product_nom
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/orders → Créer une commande (avec transaction)
const createOrder = async (req, res) => {
  // Démarrer une transaction
  const client = await pool.connect();

  try {
    const { client_id, items } = req.body;

    await client.query('BEGIN');

    // 1. Vérifier que le client existe
    const clientCheck = await client.query(
      'SELECT id FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [client_id]
    );

    if (clientCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Client non trouve'
      });
    }

    let montantTotal = 0;
    const validatedItems = [];

    // 2. Vérifier chaque produit (existence + stock)
    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, nom, prix, stock FROM products WHERE id = $1 AND deleted_at IS NULL',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Produit ${item.product_id} non trouve`
        });
      }

      const product = productResult.rows[0];

      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour ${product.nom} (disponible: ${product.stock}, demande: ${item.quantity})`
        });
      }

      const sousTotal = parseFloat(product.prix) * item.quantity;
      montantTotal += sousTotal;

      validatedItems.push({
        ...item,
        prix_unitaire: product.prix
      });
    }

    // 3. Créer la commande
    const orderResult = await client.query(
      `INSERT INTO orders (client_id, montant_total, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [client_id, montantTotal]
    );

    const newOrder = orderResult.rows[0];

    // 4. Insérer les items
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, prix_unitaire) 
         VALUES ($1, $2, $3, $4)`,
        [newOrder.id, item.product_id, item.quantity, item.prix_unitaire]
      );

      // 5. Décrémenter le stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 6. Valider la transaction
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Commande creee avec succes',
      data: newOrder
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// PUT /api/orders/:id → Modifier le statut
const updateOrderStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    await client.query('BEGIN');

    // Récupérer la commande actuelle
    const existing = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvee'
      });
    }

    const oldStatus = existing.rows[0].status;

    // Si on annule une commande qui n'était pas annulée, restaurer le stock
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const items = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // Mettre à jour le statut
    const result = await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Statut mis a jour: ${status}`,
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// DELETE /api/orders/:id → Supprimer (avec restauration stock)
const deleteOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvee'
      });
    }

    // Si la commande n'était pas déjà annulée, restaurer le stock
    if (existing.rows[0].status !== 'cancelled') {
      const items = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // Supprimer (ON DELETE CASCADE supprime aussi les items)
    await client.query('DELETE FROM orders WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Commande supprimee'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
};