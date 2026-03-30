// =====================================================
// ARTICLECONTROLLER.JS - Gestion des articles
// =====================================================
// Toutes les requêtes GET/POST pour articles passent par ici
// Chaque fonction correspond à une action (list, create, edit, delete, etc)

const { get, all, run } = require('../config/database');

/**
 * GET /articles
 * Récupère tous les articles de l'utilisateur connecté
 * Charge aussi les catégories associées à chaque article
 */
const getArticles = async (req, res) => {
  try {
    // Récupérer TOUS les articles de l'utilisateur (req.user.id vient du middleware auth)
    const articles = await all(
      'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY date_creation DESC',
      [req.user.id]
    );

    // Pour CHAQUE article : récupérer les catégories associées
    // (Join avec la table de liaison articles_categories)
    for (const article of articles) {
      const categories = await all(
        `SELECT c.* FROM categories c
         JOIN articles_categories ac ON c.id_categorie = ac.id_categorie
         WHERE ac.id_article = ?`,
        [article.id_article]
      );
      article.categories = categories;  // Ajoute les catégories à l'objet article
    }

    // Affiche la page articles/list.ejs avec les données
    res.render('articles/list', { articles, title: 'Articles' });
  } catch (err) {
    console.error('Erreur getArticles:', err);
    res.status(500).render('error', { error: 'Erreur lors de la récupération des articles' });
  }
};

/**
 * GET /articles/new
 * Affiche le formulaire pour créer un nouvel article
 */
const showCreateForm = async (req, res) => {
  try {
    // Récupérer TOUTES les catégories disponibles pour les checkboxes du formulaire
    const categories = await all('SELECT * FROM categories ORDER BY nom_categorie');
    res.render('articles/form', { article: null, categories, title: 'Nouvel article' });
  } catch (err) {
    console.error('Erreur showCreateForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /articles
 * Crée un nouvel article et l'associe aux catégories sélectionnées
 */
const createArticle = async (req, res) => {
  try {
    const { nom_article, description, prix_unitaire, quantite_stock, categories } = req.body;

    // Validation : nom et prix obligatoires
    if (!nom_article || !prix_unitaire) {
      const categoriesData = await all('SELECT * FROM categories ORDER BY nom_categorie');
      return res.status(400).render('articles/form', { 
        error: 'Nom et prix sont requis',
        article: req.body,
        categories: categoriesData
      });
    }

    // INSERT dans la table articles
    const result = await run(
      `INSERT INTO articles (id_utilisateur, nom_article, description, prix_unitaire, quantite_stock) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, nom_article, description, parseFloat(prix_unitaire), parseInt(quantite_stock) || 0]
    );

    // Ajouter les catégories sélectionnées dans la table de liaison
    // result.lastID = l'ID du nouvel article qu'on vient d'insérer
    const categoryIds = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    for (const catId of categoryIds) {
      if (catId) {
        await run(
          'INSERT INTO articles_categories (id_article, id_categorie) VALUES (?, ?)',
          [result.lastID, catId]
        );
      }
    }

    // Redirection vers la liste des articles
    res.redirect('/articles');
  } catch (err) {
    console.error('Erreur createArticle:', err);
    res.status(500).render('articles/form', { error: 'Erreur lors de la création' });
  }
};

/**
 * GET /articles/:id/edit
 * Affiche le formulaire de modification pour un article spécifique
 */
const showEditForm = async (req, res) => {
  try {
    // Récupérer l'article à modifier (vérifier qu'il appartient à l'utilisateur)
    const article = await get(
      'SELECT * FROM articles WHERE id_article = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    
    // Sécurité : article inexistant ou pas propriétaire
    if (!article) {
      return res.status(404).render('error', { error: 'Article non trouvé' });
    }

    // Récupérer toutes les catégories disponibles
    const categories = await all('SELECT * FROM categories ORDER BY nom_categorie');
    
    // Récupérer les catégories DÉJÀ associées à cet article
    const linkedCategories = await all(
      'SELECT id_categorie FROM articles_categories WHERE id_article = ?',
      [req.params.id]
    );
    
    // Transformer en tableau simple [1, 5, 8] pour les checkboxes du formulaire
    article.linkedCategories = linkedCategories.map(c => c.id_categorie);

    res.render('articles/form', { article, categories, title: 'Modifier article' });
  } catch (err) {
    console.error('Erreur showEditForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /articles/:id
 * Modifie un article ET ses catégories
 */
const updateArticle = async (req, res) => {
  try {
    const { nom_article, description, prix_unitaire, quantite_stock, categories } = req.body;

    // UPDATE les infos de l'article
    await run(
      `UPDATE articles SET nom_article = ?, description = ?, prix_unitaire = ?, quantite_stock = ? 
       WHERE id_article = ? AND id_utilisateur = ?`,
      [nom_article, description, parseFloat(prix_unitaire), parseInt(quantite_stock) || 0, req.params.id, req.user.id]
    );

    // Supprimer les ANCIENNES associations catégories pour cet article
    await run(
      'DELETE FROM articles_categories WHERE id_article = ?',
      [req.params.id]
    );

    // Insérer les NOUVELLES associations catégories
    const categoryIds = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    for (const catId of categoryIds) {
      if (catId) {
        await run(
          'INSERT INTO articles_categories (id_article, id_categorie) VALUES (?, ?)',
          [req.params.id, catId]
        );
      }
    }

    // Retourne JSON au lieu de redirect (pour fetch)
    res.status(200).json({ success: true, message: 'Article mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur updateArticle:', err);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
};

/**
 * DELETE /articles/:id
 * Supprime un article (et toutes ses catégories via CASCADE)
 */
const deleteArticle = async (req, res) => {
  try {
    // DELETE qui supprime aussi automatiquement les lignes de articles_categories (CASCADE)
    await run(
      'DELETE FROM articles WHERE id_article = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteArticle:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getArticles,
  showCreateForm,
  createArticle,
  showEditForm,
  updateArticle,
  deleteArticle
};
