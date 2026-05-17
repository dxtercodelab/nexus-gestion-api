// Helper pour gérer la pagination
const paginate = (page = 1, limit = 10) => {
  // Convertir en nombre et valider
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 10));
  
  // Calculer l'OFFSET
  const offset = (currentPage - 1) * itemsPerPage;
  
  return {
    page: currentPage,
    limit: itemsPerPage,
    offset
  };
};

// Construire les métadonnées de pagination
const buildPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems,
    limit,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

module.exports = {
  paginate,
  buildPaginationMeta
};