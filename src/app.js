const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

require('./config/db');

// Routes
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Middlewares d'erreurs
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// =========================================
// MIDDLEWARES DE SÉCURITÉ
// =========================================

// Sécurise les headers HTTP
app.use(helmet());

// CORS : autoriser le frontend à appeler l'API
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Rate limiting : max 100 requêtes par 15 min par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,  // 1000 requêtes au lieu de 100
  message: {
    success: false,
    message: 'Trop de requetes, veuillez reessayer plus tard'
  }
});
app.use('/api', limiter);

// =========================================
// MIDDLEWARES UTILITAIRES
// =========================================

// Parser le JSON
app.use(express.json());

// Logger les requêtes (uniquement en développement)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =========================================
// ROUTES
// =========================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'API de gestion - Bienvenue !',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      clients: '/api/clients',
      orders: '/api/orders',
      dashboard: '/api/dashboard'
    }
  });
});

app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

// =========================================
// MIDDLEWARES D'ERREURS (toujours à la fin !)
// =========================================

app.use(notFound);
app.use(errorHandler);

module.exports = app;