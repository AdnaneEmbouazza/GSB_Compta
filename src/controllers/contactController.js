// =====================================================
// CONTACTCONTROLLER.JS - Gestion des contacts
// =====================================================
// CRUD complet pour les contacts (clients, fournisseurs)
// Chaque utilisateur ne voit que ses propres contacts (req.user.id)

const { get, all, run } = require('../config/database');

/**
 * GET /contacts
 * Récupère tous les contacts de l'utilisateur connecté
 */
const getContacts = async (req, res) => {
  try {
    // Récupère les contacts filtrés par id_utilisateur
    const contacts = await all(
      'SELECT * FROM contacts WHERE id_utilisateur = ? ORDER BY date_creation DESC',
      [req.user.id]
    );
    res.render('contacts/list', { contacts, title: 'Contacts' });
  } catch (err) {
    console.error('Erreur getContacts:', err);
    res.status(500).render('error', { error: 'Erreur lors de la récupération des contacts' });
  }
};

/**
 * GET /contacts/new
 * Affiche le formulaire pour créer un nouveau contact
 */
const showCreateForm = async (req, res) => {
  res.render('contacts/form', { contact: null, title: 'Nouveau contact' });
};

/**
 * POST /contacts
 * Crée un nouveau contact pour l'utilisateur
 * Champs : nom, type (client/fournisseur), email, téléphone, adresse, etc
 */
const createContact = async (req, res) => {
  try {
    const { nom_contact, type_contact, email_contact, telephone, adresse, code_postal, ville } = req.body;

    // Validation : nom et type obligatoires
    if (!nom_contact || !type_contact) {
      return res.status(400).render('contacts/form', { 
        error: 'Nom et type sont requis',
        contact: req.body
      });
    }

    // Insérer le contact avec l'ID de l'utilisateur
    await run(
      `INSERT INTO contacts (id_utilisateur, nom_contact, type_contact, email_contact, telephone, adresse, code_postal, ville) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, nom_contact, type_contact, email_contact, telephone, adresse, code_postal, ville]
    );

    res.redirect('/contacts');
  } catch (err) {
    console.error('Erreur createContact:', err);
    res.status(500).render('contacts/form', { error: 'Erreur lors de la création' });
  }
};

/**
 * GET /contacts/:id/edit
 * Affiche le formulaire d'édition pour un contact
 * Sécurité : vérifier que c'est le propriétaire
 */
const showEditForm = async (req, res) => {
  try {
    // Récupérer le contact en vérifiant que l'utilisateur en est propriétaire
    const contact = await get(
      'SELECT * FROM contacts WHERE id_contact = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    
    // 404 si pas trouvé ou pas propriétaire
    if (!contact) {
      return res.status(404).render('error', { error: 'Contact non trouvé' });
    }

    res.render('contacts/form', { contact, title: 'Modifier contact' });
  } catch (err) {
    console.error('Erreur showEditForm:', err);
    res.status(500).render('error', { error: 'Erreur' });
  }
};

/**
 * POST /contacts/:id
 * Modifie un contact existant
 * Sécurité : UPDATE seulement si propriétaire
 */
const updateContact = async (req, res) => {
  try {
    const { nom_contact, type_contact, email_contact, telephone, adresse, code_postal, ville } = req.body;

    // UPDATE en vérifiant la propriété (WHERE id_utilisateur = ?)
    await run(
      `UPDATE contacts SET nom_contact = ?, type_contact = ?, email_contact = ?, telephone = ?, adresse = ?, code_postal = ?, ville = ? 
       WHERE id_contact = ? AND id_utilisateur = ?`,
      [nom_contact, type_contact, email_contact, telephone, adresse, code_postal, ville, req.params.id, req.user.id]
    );

    // Retourne JSON au lieu de redirect (pour fetch)
    res.json({ success: true, message: 'Contact mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur updateContact:', err);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
};

/**
 * DELETE /contacts/:id
 * Supprime un contact
 * Sécurité : DELETE seulement si propriétaire
 */
const deleteContact = async (req, res) => {
  try {
    await run(
      'DELETE FROM contacts WHERE id_contact = ? AND id_utilisateur = ?',
      [req.params.id, req.user.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur deleteContact:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getContacts,
  showCreateForm,
  createContact,
  showEditForm,
  updateContact,
  deleteContact
};
