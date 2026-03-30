// =====================================================
// FACTURECONTROLLER.JS - Gestion des factures
// =====================================================
// Gère les factures et leurs lignes (articles)
// Points clés :
// - Validation du stock (quantité demandée ≤ stock disponible)
// - Calcul automatique des montants HT, TVA, TTC
// - Mise à jour du stock quand on ajoute/retire des articles

const { get, all, run } = require('../config/database');

/**
 * GET /factures
 * Liste toutes les factures de l'utilisateur avec le nom du contact
 */
const getFactures = async (req, res) => {
  try {
    // JOIN avec contacts pour afficher le nom du client
    const factures = await all(
      `SELECT f.*, c.nom_contact FROM factures f 
       JOIN contacts c ON f.id_contact = c.id_contact 
       WHERE f.id_utilisateur = ? ORDER BY f.date_facture DESC`,
      [req.user.id]
    );
    res.render('factures/list', { factures, title: 'Factures' });
  } catch (err) {
    console.error('Erreur getFactures:', err);
    res.status(500).render('error', { error: 'Erreur lors de la récupération des factures' });
  }
};

/**
 * GET /factures/new
 * Affiche le formulaire de création d'une nouvelle facture
 * Charge : contacts + articles de l'utilisateur
 */
const showCreateForm = async (req, res) => {
  try {
    // Récupérer les contacts et articles de l'utilisateur
    const contacts = await all(
      'SELECT * FROM contacts WHERE id_utilisateur = ? ORDER BY nom_contact',
      [req.user.id]
    );
    const articles = await all(
      'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
      [req.user.id]
    );
    res.render('factures/form', { 
      facture: null, 
      contacts, 
      articles, 
      title: 'Nouvelle facture'
    });
  } catch (err) {
    console.error('Erreur showCreateForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /factures
 * Crée une nouvelle facture vide (sans articles)
 * Les articles seront ajoutés après via addLigneFacture()
 */
const createFacture = async (req, res) => {
  try {
    const { numero_facture, id_contact, date_facture, date_echeance, etat_facture, notes } = req.body;

    // Validation : minimum requis
    if (!numero_facture || !id_contact || !date_facture) {
      return res.status(400).render('factures/form', { 
        error: 'Numéro, contact et date sont requis',
        facture: req.body
      });
    }

    // INSERT une facture vide (montants = 0 pour l'instant)
    const result = await run(
      `INSERT INTO factures (id_utilisateur, numero_facture, id_contact, date_facture, date_echeance, etat_facture, montant_ht, montant_tva, montant_ttc, notes) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [req.user.id, numero_facture, id_contact, date_facture, date_echeance, etat_facture || 'brouillon', notes]
    );

    // Redirection vers la vue détail pour ajouter des articles
    res.redirect(`/factures/${result.lastID}`);
  } catch (err) {
    console.error('Erreur createFacture:', err);
    res.status(500).render('error', { error: 'Erreur lors de la création' });
  }
};

/**
 * GET /factures/:id
 * Affiche une facture avec ses lignes et ses articles disponibles
 */
const viewFacture = async (req, res) => {
  try {
    // Récupérer la facture + infos du contact
    const facture = await get(
      `SELECT f.*, c.nom_contact, c.email_contact, c.telephone FROM factures f 
       JOIN contacts c ON f.id_contact = c.id_contact 
       WHERE f.id_facture = ? AND f.id_utilisateur = ?`,
      [req.params.id, req.user.id]
    );

    if (!facture) {
      return res.status(404).render('error', { error: 'Facture non trouvée' });
    }

    // Récupérer les lignes de la facture
    const lignes = await all(
      'SELECT * FROM lignes_facture WHERE id_facture = ? ORDER BY id_ligne',
      [req.params.id]
    );

    // Récupérer les articles disponibles pour en ajouter
    const articles = await all(
      'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
      [req.user.id]
    );

    res.render('factures/view', { facture, lignes, articles, title: `Facture ${facture.numero_facture}`, error: null });
  } catch (err) {
    console.error('Erreur viewFacture:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /factures/:id/lignes
 * Ajoute une ligne (article) à une facture
 * ⚠️ VALIDATION DU STOCK : quantité demandée ne doit pas dépasser le stock
 */
const addLigneFacture = async (req, res) => {
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

    // ⚠️ VALIDATION DU STOCK
    // Vérifier que quantite_stock >= quantité demandée
    if (quantiteNum > article.quantite_stock) {
      // Rechargez la page avec erreur
      const facture = await get(
        `SELECT f.*, c.nom_contact FROM factures f 
         JOIN contacts c ON f.id_contact = c.id_contact 
         WHERE f.id_facture = ? AND f.id_utilisateur = ?`,
        [req.params.id, req.user.id]
      );
      const lignes = await all(
        'SELECT * FROM lignes_facture WHERE id_facture = ? ORDER BY id_ligne',
        [req.params.id]
      );
      const articles = await all(
        'SELECT * FROM articles WHERE id_utilisateur = ? ORDER BY nom_article',
        [req.user.id]
      );
      return res.status(400).render('factures/view', { 
        facture,
        lignes,
        articles,
        title: `Facture ${facture.numero_facture}`,
        error: `Quantité insuffisante. Stock disponible: ${article.quantite_stock}`
      });
    }

    // Calcul du montant de la ligne
    const prix_unitaire = article.prix_unitaire;
    const montant = quantiteNum * prix_unitaire;

    // Insérer la ligne dans lignes_facture
    await run(
      `INSERT INTO lignes_facture (id_facture, id_article, description, quantite, prix_unitaire, montant) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, id_article || null, description, quantiteNum, prix_unitaire, montant]
    );

    // Diminuer le stock de l'article
    if (id_article) {
      await run(
        'UPDATE articles SET quantite_stock = quantite_stock - ? WHERE id_article = ? AND id_utilisateur = ?',
        [quantiteNum, id_article, req.user.id]
      );
    }

    // Recalculer les montants totaux de la facture (HT, TVA, TTC)
    await updateFactureAmounts(req.params.id, req.user.id);

    res.redirect(`/factures/${req.params.id}`);
  } catch (err) {
    console.error('Erreur addLigneFacture:', err);
    res.status(500).render('error', { error: 'Erreur lors de l\'ajout de la ligne' });
  }
};

/**
 * DELETE /factures/:id/lignes/:idLigne
 * Supprime une ligne d'une facture
 * Restaure le stock de l'article
 * Recalcule les montants
 */
const deleteLigneFacture = async (req, res) => {
  try {
    // Récupérer la ligne pour connaître l'article et la quantité
    const ligne = await get(
      'SELECT id_facture, id_article, quantite FROM lignes_facture WHERE id_ligne = ?',
      [req.params.idLigne]
    );

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    // Supprimer la ligne
    await run('DELETE FROM lignes_facture WHERE id_ligne = ?', [req.params.idLigne]);

    // Restituer le stock de l'article
    if (ligne.id_article) {
      await run(
        'UPDATE articles SET quantite_stock = quantite_stock + ? WHERE id_article = ? AND id_utilisateur = ?',
        [ligne.quantite, ligne.id_article, req.user.id]
      );
    }

    // Recalculer les montants de la facture
    await updateFactureAmounts(ligne.id_facture, req.user.id);

    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteLigneFacture:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

/**
 * HELPER - Recalcule montant_ht, montant_tva, montant_ttc
 * Appelée automatiquement après avoir ajouté/supprimé une ligne
 */
const updateFactureAmounts = async (factureId, userId) => {
  try {
    // Somme des montants de toutes les lignes
    const result = await get(
      'SELECT SUM(montant) as total FROM lignes_facture WHERE id_facture = ?',
      [factureId]
    );

    const montant_ht = result.total || 0;
    const montant_tva = montant_ht * 0.20;  // TVA 20%
    const montant_ttc = montant_ht + montant_tva;

    // UPDATE les montants de la facture
    await run(
      'UPDATE factures SET montant_ht = ?, montant_tva = ?, montant_ttc = ? WHERE id_facture = ? AND id_utilisateur = ?',
      [montant_ht, montant_tva, montant_ttc, factureId, userId]
    );
  } catch (err) {
    console.error('Erreur updateFactureAmounts:', err);
  }
};

/**
 * POST /factures/:id/status
 * Met à jour l'état de la facture (brouillon, envoyée, payée)
 * et la date de paiement
 */
const updateFactureStatus = async (req, res) => {
  try {
    const { etat_facture, est_payee, date_paiement } = req.body;

    await run(
      `UPDATE factures SET etat_facture = ?, est_payee = ?, date_paiement = ? 
       WHERE id_facture = ? AND id_utilisateur = ?`,
      [etat_facture, est_payee ? 1 : 0, date_paiement, req.params.id, req.user.id]
    );

    // Retourne JSON au lieu de redirect (pour fetch)
    res.status(200).json({ success: true, message: 'Statut mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur updateFactureStatus:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

/**
 * DELETE /factures/:id
 * Supprime une facture ET toutes ses lignes
 * (lignes supprimées automatiquement via CASCADE)
 */
const deleteFacture = async (req, res) => {
  try {
    // Supprimer les lignes de la facture
    // (ne serait pas strictement nécessaire avec CASCADE, mais par prudence)
    await run(
      'DELETE FROM lignes_facture WHERE id_facture = ?',
      [req.params.id]
    );

    // Supprimer la facture
    await run(
      'DELETE FROM factures WHERE id_facture = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteFacture:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getFactures,
  showCreateForm,
  createFacture,
  viewFacture,
  addLigneFacture,
  deleteLigneFacture,
  updateFactureStatus,
  deleteFacture
};
