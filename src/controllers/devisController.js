// =====================================================
// DEVISCONTROLLER.JS - Gestion des devis
// =====================================================
// TRÈS SIMILAIRE à factureController.js mais pour les devis
// Même logique : articles, lignes, validation stock, calcul montants
// Différence : pas de date de paiement, pas de "est_payee"

const { get, all, run } = require('../config/database');

/**
 * GET /devis
 * Liste tous les devis de l'utilisateur avec le nom du contact
 */
const getDevis = async (req, res) => {
  try {
    const devis = await all(
      `SELECT d.*, c.nom_contact FROM devis d 
       JOIN contacts c ON d.id_contact = c.id_contact 
       WHERE d.id_utilisateur = ? ORDER BY d.date_devis DESC`,
      [req.user.id]
    );
    res.render('devis/list', { devis, title: 'Devis' });
  } catch (err) {
    console.error('Erreur getDevis:', err);
    res.status(500).render('error', { error: 'Erreur lors de la récupération des devis' });
  }
};

/**
 * GET /devis/new
 * Affiche le formulaire pour créer un nouveau devis
 */
const showCreateForm = async (req, res) => {
  try {
    const contacts = await all(
      'SELECT * FROM contacts WHERE id_utilisateur = ? ORDER BY nom_contact',
      [req.user.id]
    );
    const articles = await all(
      'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
      [req.user.id]
    );
    res.render('devis/form', { 
      devis: null, 
      contacts, 
      articles, 
      title: 'Nouveau devis'
    });
  } catch (err) {
    console.error('Erreur showCreateForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /devis
 * Crée un nouveau devis vide (articles seront ajoutés après)
 */
const createDevis = async (req, res) => {
  try {
    const { numero_devis, id_contact, date_devis, date_validite, etat_devis, notes } = req.body;

    if (!numero_devis || !id_contact || !date_devis) {
      return res.status(400).render('devis/form', { 
        error: 'Numéro, contact et date sont requis',
        devis: req.body
      });
    }

    const result = await run(
      `INSERT INTO devis (id_utilisateur, numero_devis, id_contact, date_devis, date_validite, etat_devis, montant_ht, montant_tva, montant_ttc, notes) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [req.user.id, numero_devis, id_contact, date_devis, date_validite, etat_devis || 'brouillon', notes]
    );

    res.redirect(`/devis/${result.lastID}`);
  } catch (err) {
    console.error('Erreur createDevis:', err);
    res.status(500).render('error', { error: 'Erreur lors de la création' });
  }
};

/**
 * GET /devis/:id
 * Affiche un devis avec ses lignes et articles disponibles
 */
const viewDevis = async (req, res) => {
  try {
    const devis = await get(
      `SELECT d.*, c.nom_contact, c.email_contact, c.telephone FROM devis d 
       JOIN contacts c ON d.id_contact = c.id_contact 
       WHERE d.id_devis = ? AND d.id_utilisateur = ?`,
      [req.params.id, req.user.id]
    );

    if (!devis) {
      return res.status(404).render('error', { error: 'Devis non trouvé' });
    }

    const lignes = await all(
      'SELECT * FROM lignes_devis WHERE id_devis = ? ORDER BY id_ligne',
      [req.params.id]
    );

    const articles = await all(
      'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
      [req.user.id]
    );

    res.render('devis/view', { devis, lignes, articles, title: `Devis ${devis.numero_devis}`, error: null });
  } catch (err) {
    console.error('Erreur viewDevis:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /devis/:id/lignes
 * Ajoute une ligne (article) au devis
 * Même validation de stock que les factures
 */
const addLigneDevis = async (req, res) => {
  try {
    const { id_article, description, quantite } = req.body;
    const quantiteNum = parseInt(quantite);

    // Récupérer l'article (prix + stock)
    const article = await get(
      'SELECT prix_unitaire, quantite_stock FROM articles WHERE id_article = ? AND id_utilisateur = ?',
      [id_article, req.user.id]
    );

    if (!article) {
      return res.status(400).render('error', { error: 'Article non trouvé' });
    }

    // ⚠️ Vérifier que la quantité ne dépasse pas le stock
    if (quantiteNum > article.quantite_stock) {
      const devis = await get(
        `SELECT d.*, c.nom_contact FROM devis d 
         JOIN contacts c ON d.id_contact = c.id_contact 
         WHERE d.id_devis = ? AND d.id_utilisateur = ?`,
        [req.params.id, req.user.id]
      );
      const lignes = await all(
        'SELECT * FROM lignes_devis WHERE id_devis = ? ORDER BY id_ligne',
        [req.params.id]
      );
      const articles = await all(
        'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
        [req.user.id]
      );
      return res.status(400).render('devis/view', { 
        devis,
        lignes,
        articles,
        title: `Devis ${devis.numero_devis}`,
        error: `Quantité insuffisante. Stock disponible: ${article.quantite_stock}`
      });
    }

    const prix_unitaire = article.prix_unitaire;
    const montant = quantiteNum * prix_unitaire;

    // Insérer la ligne
    await run(
      `INSERT INTO lignes_devis (id_devis, id_article, description, quantite, prix_unitaire, montant) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, id_article || null, description, quantiteNum, prix_unitaire, montant]
    );

    // Diminuer le stock
    if (id_article) {
      await run(
        'UPDATE articles SET quantite_stock = quantite_stock - ? WHERE id_article = ? AND id_utilisateur = ?',
        [quantiteNum, id_article, req.user.id]
      );
    }

    // Recalculer les montants du devis
    await updateDevisAmounts(req.params.id, req.user.id);

    res.redirect(`/devis/${req.params.id}`);
  } catch (err) {
    console.error('Erreur addLigneDevis:', err);
    res.status(500).render('error', { error: 'Erreur lors de l\'ajout de la ligne' });
  }
};

/**
 * DELETE /devis/:id/lignes/:idLigne
 * Supprime une ligne du devis
 * Restaure le stock de l'article
 */
const deleteLigneDevis = async (req, res) => {
  try {
    const ligne = await get(
      'SELECT id_devis, id_article, quantite FROM lignes_devis WHERE id_ligne = ?',
      [req.params.idLigne]
    );

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    // Supprimer la ligne
    await run('DELETE FROM lignes_devis WHERE id_ligne = ?', [req.params.idLigne]);

    // Restituer le stock
    if (ligne.id_article) {
      await run(
        'UPDATE articles SET quantite_stock = quantite_stock + ? WHERE id_article = ? AND id_utilisateur = ?',
        [ligne.quantite, ligne.id_article, req.user.id]
      );
    }

    // Recalculer les montants
    await updateDevisAmounts(ligne.id_devis, req.user.id);

    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteLigneDevis:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

/**
 * HELPER - Recalcule montant_ht, montant_tva, montant_ttc du devis
 */
const updateDevisAmounts = async (devisId, userId) => {
  try {
    const result = await get(
      'SELECT SUM(montant) as total FROM lignes_devis WHERE id_devis = ?',
      [devisId]
    );

    const montant_ht = result.total || 0;
    const montant_tva = montant_ht * 0.20;  // TVA 20%
    const montant_ttc = montant_ht + montant_tva;

    await run(
      'UPDATE devis SET montant_ht = ?, montant_tva = ?, montant_ttc = ? WHERE id_devis = ? AND id_utilisateur = ?',
      [montant_ht, montant_tva, montant_ttc, devisId, userId]
    );
  } catch (err) {
    console.error('Erreur updateDevisAmounts:', err);
  }
};

/**
 * POST /devis/:id/status
 * Met à jour l'état du devis (brouillon, envoyé, accepté, refusé)
 */
const updateDevisStatus = async (req, res) => {
  try {
    const { etat_devis } = req.body;

    await run(
      `UPDATE devis SET etat_devis = ? WHERE id_devis = ? AND id_utilisateur = ?`,
      [etat_devis, req.params.id, req.user.id]
    );

    // Retourne JSON au lieu de redirect (pour fetch)
    res.status(200).json({ success: true, message: 'Statut mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur updateDevisStatus:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

/**
 * DELETE /devis/:id
 * Supprime un devis et toutes ses lignes
 */
const deleteDevis = async (req, res) => {
  try {
    // ⚠️ IMPORTANT: Restaurer le stock des articles AVANT de supprimer les lignes
    // Récupère toutes les lignes du devis avec leurs quantités
    const lignes = await all(
      'SELECT quantite, id_article FROM lignes_devis WHERE id_devis = ?',
      [req.params.id]
    );

    // Pour chaque ligne, on augmente le stock de l'article
    for (const ligne of lignes) {
      await run(
        'UPDATE articles SET quantite_stock = quantite_stock + ? WHERE id_article = ?',
        [ligne.quantite, ligne.id_article]
      );
    }

    // Maintenant supprimer les lignes du devis
    await run(
      'DELETE FROM lignes_devis WHERE id_devis = ?',
      [req.params.id]
    );

    // Supprimer le devis
    await run(
      'DELETE FROM devis WHERE id_devis = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteDevis:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getDevis,
  showCreateForm,
  createDevis,
  viewDevis,
  addLigneDevis,
  deleteLigneDevis,
  updateDevisStatus,
  deleteDevis
};
