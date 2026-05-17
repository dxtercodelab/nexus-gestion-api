const pool = require('../config/db');

// GET /api/dashboard/stats → Statistiques générales
const getStats = async (req, res) => {
  try {
    // Compter les clients actifs
    const clientsResult = await pool.query(
      'SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL'
    );
    
    // Compter les produits actifs
    const productsResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE deleted_at IS NULL'
    );
    
    // Compter les commandes
    const ordersResult = await pool.query(
      'SELECT COUNT(*) FROM orders'
    );
    
    // Calculer le chiffre d'affaires total (commandes non annulées)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(montant_total), 0) as total 
       FROM orders 
       WHERE status != 'cancelled'`
    );

    // Calculer le panier moyen
    const avgResult = await pool.query(
      `SELECT COALESCE(AVG(montant_total), 0) as average 
       FROM orders 
       WHERE status != 'cancelled'`
    );

    res.json({
      success: true,
      data: {
        totalClients: parseInt(clientsResult.rows[0].count),
        totalProducts: parseInt(productsResult.rows[0].count),
        totalOrders: parseInt(ordersResult.rows[0].count),
        totalRevenue: parseFloat(revenueResult.rows[0].total),
        averageOrderValue: parseFloat(avgResult.rows[0].average).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/recent-orders → 5 dernières commandes
const getRecentOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.status,
        o.montant_total,
        o.created_at,
        c.nom as client_nom,
        c.email as client_email
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/top-products → Top 10 produits les plus vendus
const getTopProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nom,
        p.prix,
        SUM(oi.quantity) as total_vendu,
        SUM(oi.quantity * oi.prix_unitaire) as chiffre_affaires
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id, p.nom, p.prix
      ORDER BY total_vendu DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/monthly-sales → Ventes par mois (12 derniers mois)
const getMonthlySales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mois,
        COUNT(*) as nombre_commandes,
        COALESCE(SUM(montant_total), 0) as chiffre_affaires
      FROM orders
      WHERE 
        status != 'cancelled'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mois ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/orders-by-status → Répartition par statut
const getOrdersByStatus = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(montant_total), 0) as total
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  getRecentOrders,
  getTopProducts,
  getMonthlySales,
  getOrdersByStatus
};