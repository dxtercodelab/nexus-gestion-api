// Middleware pour les routes non trouvées (404)
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvee: ${req.method} ${req.originalUrl}`
  });
};

// Middleware de gestion d'erreurs centralisé
const errorHandler = (err, req, res, next) => {
  // Log l'erreur dans la console
  console.error('Erreur:', err.message);
  
  // Si c'est une erreur connue, utiliser son status
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    // En développement, on envoie aussi la stack trace
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler
};