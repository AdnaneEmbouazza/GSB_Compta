// =====================================================
// CATEGORYCONTROLLER.JS - Gestion des catégories
// =====================================================
// CRUD complet pour les catégories des articles
// Simple : pas lié à l'utilisateur (catégories globales)

const { get, all, run } = require('../config/database');

/**
 * GET /categories
 * Récupère toutes les catégories et les affiche
 */
const getCategories = async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY nom_categorie');
    res.render('categories/list', { categories, title: 'Catégories' });
  } catch (err) {
    console.error('Erreur getCategories:', err);
    res.status(500).render('error', { error: 'Erreur lors de la récupération des catégories' });
  }
};

/**
 * GET /categories/new
 * Affiche le formulaire pour créer une nouvelle catégorie
 */
const showCreateForm = async (req, res) => {
  res.render('categories/form', { category: null, title: 'Nouvelle catégorie' });
};

/**
 * POST /categories
 * Crée une nouvelle catégorie
 * Validation : nom obligatoire
 * Gère les doublons (constraint UNIQUE sur nom_categorie)
 */
const createCategory = async (req, res) => {
  try {
    const { nom_categorie } = req.body;

    // Validation
    if (!nom_categorie) {
      return res.status(400).render('categories/form', { 
        error: 'Le nom est requis',
        category: req.body
      });
    }

    // Insérer la catégorie
    await run(
      'INSERT INTO categories (nom_categorie) VALUES (?)',
      [nom_categorie]
    );

    res.redirect('/categories');
  } catch (err) {
    console.error('Erreur createCategory:', err);
    // Erreur UNIQUE = nom existe déjà
    if (err.message.includes('UNIQUE')) {
      const categories = await all('SELECT * FROM categories ORDER BY nom_categorie');
      res.status(400).render('categories/form', { 
        error: 'Cette catégorie existe déjà',
        category: req.body,
        categories
      });
    } else {
      res.status(500).render('categories/form', { error: 'Erreur lors de la création' });
    }
  }
};

/**
 * GET /categories/:id/edit
 * Affiche le formulaire d'édition pour une catégorie
 */
const showEditForm = async (req, res) => {
  try {
    const category = await get(
      'SELECT * FROM categories WHERE id_categorie = ?',
      [req.params.id]
    );
    
    // Sécurité : vérifier que la catégorie existe
    if (!category) {
      return res.status(404).render('error', { error: 'Catégorie non trouvée' });
    }

    res.render('categories/form', { category, title: 'Modifier catégorie' });
  } catch (err) {
    console.error('Erreur showEditForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /categories/:id
 * Modifie une catégorie existante
 */
const updateCategory = async (req, res) => {
  try {
    const { nom_categorie } = req.body;

    // UPDATE la catégorie
    await run(
      'UPDATE categories SET nom_categorie = ? WHERE id_categorie = ?',
      [nom_categorie, req.params.id]
    );

    res.redirect('/categories');
  } catch (err) {
    console.error('Erreur updateCategory:', err);
    res.status(500).render('error', { error: 'Erreur lors de la modification' });
  }
};

/**
 * DELETE /categories/:id
 * Supprime une catégorie
 * Note: les associations dans articles_categories sont supprimées via CASCADE
 */
const deleteCategory = async (req, res) => {
  try {
    await run(
      'DELETE FROM categories WHERE id_categorie = ?',
      [req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteCategory:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getCategories,
  showCreateForm,
  createCategory,
  showEditForm,
  updateCategory,
  deleteCategory
};
