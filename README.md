# 📊 Nexus Gestion API

API REST complète pour la gestion de produits, clients et commandes avec dashboard analytique en temps réel.

## ✨ Fonctionnalités

- 📦 **CRUD Produits** avec soft delete et galerie d'images (3 vues)
- 👥 **CRUD Clients** avec historique des commandes
- 🛒 **CRUD Commandes** avec transactions SQL atomiques
- 📊 **Dashboard analytique** avec statistiques et graphiques
- 🔍 **Filtres dynamiques** (recherche, prix, statut, dates)
- 📄 **Pagination** sur toutes les listes
- 🛡️ **Sécurité** : Helmet, CORS, Rate Limiting

## 🛠️ Stack technique

- **Node.js** + **Express.js**
- **PostgreSQL** avec relations, contraintes et transactions
- **Zod** pour la validation
- **Helmet**, **CORS**, **Express Rate Limit**

## 📦 Installation

\`\`\`bash
# Cloner le projet
git clone https://github.com/dxtercodelab/nexus-gestion-api.git
cd nexus-gestion-api

# Installer les dépendances
npm install

# Créer la base de données
psql -U postgres
CREATE DATABASE gestion_db;

# Copier .env.example en .env et configurer
cp .env.example .env

# Lancer le serveur
npm run dev
\`\`\`

## 🌐 Routes API

### Produits
- \`GET /api/products\` - Liste paginée + filtres
- \`GET /api/products/:id\` - Détails
- \`POST /api/products\` - Créer
- \`PUT /api/products/:id\` - Modifier
- \`DELETE /api/products/:id\` - Soft delete

### Clients
- \`GET /api/clients\` - Liste + filtres
- \`GET /api/clients/:id\` - Détails + commandes
- \`POST /api/clients\` - Créer
- \`PUT /api/clients/:id\` - Modifier
- \`DELETE /api/clients/:id\` - Soft delete

### Commandes
- \`GET /api/orders\` - Liste + filtres
- \`GET /api/orders/:id\` - Détails complets
- \`POST /api/orders\` - Créer (transaction SQL)
- \`PUT /api/orders/:id\` - Changer statut
- \`DELETE /api/orders/:id\` - Supprimer

### Dashboard
- \`GET /api/dashboard/stats\` - Statistiques générales
- \`GET /api/dashboard/recent-orders\` - Dernières commandes
- \`GET /api/dashboard/top-products\` - Top produits vendus
- \`GET /api/dashboard/monthly-sales\` - Ventes par mois
- \`GET /api/dashboard/orders-by-status\` - Répartition par statut

## 🔒 Sécurité

- Validation stricte avec Zod
- Tri sécurisé (anti-injection SQL)
- Transactions atomiques pour les commandes
- Helmet pour les headers HTTP
- CORS configuré
- Rate limiting

## 👨‍💻 Auteur

**Carlos** - Développeur Backend

## 📄 Licence

ISC