/**
 * User Profile Management Controller
 * 
 * Ce fichier gère la gestion du profil utilisateur:
 * - Affichage des informations du profil (nom, prenom, email, date d'inscription)
 * - Mise à jour des informations personnelles (nom, prenom, email)
 * - Changement du mot de passe avec validation de l'ancien mot de passe
 * 
 * SÉCURITÉ IMPORTANTE:
 * - Tous les accès utilisent req.user.id (établi par middleware JWT)
 * - Les utilisateurs ne peuvent modifier que leur propre profil
 * - Les mots de passe sont toujours hashés avec bcryptjs avant stockage
 * - Les emails doivent être uniques dans la base (contrainte UNIQUE)
 * 
 * UTILISATION:
 * - GET /profile → getProfile() → affiche le profil
 * - POST /profile → updateProfile() → met à jour nom/prenom/email
 * - GET /change-password → getChangePasswordForm() → affiche le formulaire
 * - POST /change-password → changePassword() → change le mot de passe
 */

const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');

/**
 * Affiche le profil utilisateur de l'utilisateur connecté
 * 
 * @param {Object} req - Objet requête Express (contient req.user.id établi par JWT)
 * @param {Object} res - Objet réponse Express
 * 
 * FLOW:
 * 1. Récupère l'ID utilisateur de req.user.id (défini par middleware d'authentification)
 * 2. Requête SELECT sur la table utilisateurs avec WHERE id_utilisateur = ?
 *    → Récupère: id_utilisateur, email, nom, prenom, date_inscription
 * 3. Rend la vue 'user/profile' avec les données utilisateur
 * 4. Affiche un message de succès si ?success=1 dans l'URL (après mise à jour)
 * 
 * SÉCURITÉ:
 * - Utilise req.user.id pour filtrer (utilisateur connecté)
 * - Parametre binding [userId] prévient les injections SQL
 * - L'utilisateur ne peut voir que son propre profil
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // ID d'authentification JWT

    // Récupère les informations du profil utilisateur
    // Les ? sont remplacés par [userId] via parametre binding (sécurité)
    const user = await get(
      'SELECT id_utilisateur, email, nom, prenom, date_inscription FROM utilisateurs WHERE id_utilisateur = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).render('error', { 
        error: 'Utilisateur non trouvé' 
      });
    }

    // Rend la vue profile avec les données utilisateur
    // req.query.success vient de la redirection après updateProfile
    res.render('user/profile', { 
      title: 'Mon Profil',
      user,
      success: req.query.success ? 'Profil mis à jour avec succès' : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors de la récupération du profil' 
    });
  }
};

/**
 * Mettre à jour les informations du profil utilisateur
 * 
 * @param {Object} req - Objet requête avec req.body.nom/prenom/email et req.user.id
 * @param {Object} res - Objet réponse Express
 * 
 * PARAMÈTRES ATTENDUS (req.body):
 * - nom: string (requis)
 * - prenom: string (requis)
 * - email: string (requis, doit être unique)
 * 
 * VALIDATION:
 * 1. Vérifie que tous les champs sont fournis
 * 2. Vérfie que l'email n'existe pas chez un autre utilisateur
 *    (SELECT WHERE email = ? AND id_utilisateur != ?)
 * 3. Met à jour la table utilisateurs
 * 
 * SÉCURITÉ:
 * - Filtre par req.user.id (utilisateur connecté uniquement)
 * - Parametre binding prévient les injections SQL
 * - Vérification de l'email unique evite les doublons
 * - Les modifications sont isolées à l'utilisateur courant
 * 
 * CONTRAINTE BDD:
 * - UNIQUE (email) sur la table utilisateurs
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // ID d'authentification JWT
    const { nom, prenom, email } = req.body;

    // Validation: tous les champs doivent être fournis
    if (!nom || !prenom || !email) {
      const user = await get(
        'SELECT * FROM utilisateurs WHERE id_utilisateur = ?',
        [userId]
      );
      return res.status(400).render('user/profile', { 
        title: 'Mon Profil',
        user,
        error: 'Tous les champs sont requis'
      });
    }

    // Vérification que l'email est unique
    // AND id_utilisateur != ? permet à l'utilisateur de garder son email actuel
    // mais empêche d'utiliser l'email d'un autre utilisateur
    const existing = await get(
      'SELECT id_utilisateur FROM utilisateurs WHERE email = ? AND id_utilisateur != ?',
      [email, userId]
    );
    if (existing) {
      const user = await get(
        'SELECT * FROM utilisateurs WHERE id_utilisateur = ?',
        [userId]
      );
      return res.status(400).render('user/profile', { 
        title: 'Mon Profil',
        user,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Mettre à jour le profil
    // WHERE id_utilisateur = ? assure qu'on modifie uniquement cet utilisateur
    await run(
      'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id_utilisateur = ?',
      [nom, prenom, email, userId]
    );

    // Retourne JSON au lieu de redirect (pour fetch)
    res.json({ success: true, message: 'Profil mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du profil' 
    });
  }
};

/**
 * Affiche le formulaire de changement de mot de passe
 * 
 * @param {Object} req - Objet requête Express
 * @param {Object} res - Objet réponse Express
 * 
 * Page simple qui affiche le formulaire HTML avec les champs:
 * - Mot de passe actuel (vérification de l'utilisateur)
 * - Nouveau mot de passe (min 6 caractères)
 * - Confirmation du nouveau mot de passe (doit correspondre)
 * 
 * Le traitement du formulaire est géré par changePassword()
 */
const getChangePasswordForm = async (req, res) => {
  try {
    res.render('user/changePassword', { 
      title: 'Changer le mot de passe'
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors de l\'accès au formulaire' 
    });
  }
};

/**
 * Traite le changement de mot de passe utilisateur
 * 
 * @param {Object} req - Objet requête avec req.body et req.user.id
 * @param {Object} res - Objet réponse Express
 * 
 * PARAMÈTRES ATTENDUS (req.body):
 * - currentPassword: string (mot de passe actuellement en base, hashé avec bcrypt)
 * - newPassword: string (minimum 6 caractères)
 * - confirmPassword: string (doit égaler newPassword)
 * 
 * VALIDATIONS EFFECTUÉES:
 * 1. Vérifi que tous les champs sont fournis
 * 2. Vérifi que newPassword === confirmPassword
 * 3. Vérifi que newPassword.length >= 6 (minimum 6 caractères)
 * 4. Récupère le mot de passe actuellment hashé en base
 * 5. Utilise bcrypt.compare() pour vérifier le currentPassword
 *    - bcrypt.compare(plaintext, hash) retourne true/false
 *    - Compare la version plaintext saisie avec le hash en base
 *    - Impossible de déchiffrer le mot de passe en base (one-way hash)
 * 6. Hash le nouveau mot de passe avec bcrypt.hash(password, 10)
 * 7. Stocke le nouveau hash en base
 * 
 * SÉCURITÉ - BCRYPTJS EXPLIQUÉ:
 * 
 * Pourquoi bcrypt?
 * - Fonction de hachage "lente" conçue pour les mots de passe
 * - Une itération prend ~100ms (rend force brute infaisable)
 * - Inclut un "salt" aléatoire dans chaque hash → même mot de passe = hash différent
 * 
 * Hachage (registration/changePassword):
 *   bcrypt.hash('monMotDePasse', 10)
 *   → Génère un salt aléatoire
 *   → Hash le mot de passe 2^10 fois
 *   → Retourne un string: "$2a$10$...abcdef123456..." (contient salt + hash)
 *   → On stocke CE STRING en base
 * 
 * Vérification (login/changePassword):
 *   bcrypt.compare('monMotDePasse', '$2a$10$...abcdef123456...')
 *   → Extrait le salt du hash stocké
 *   → Hash le mot de passe saisi avec ce même salt
 *   → Compare les deux hashes
 *   → Retourne true si ils correspondent, false sinon
 * 
 * Avantage clé: On ne peut jamais décrypter le mot de passe original
 * Si la base est compromise, les mots de passe restent sécurisés
 * 
 * Le "10" = coût de calcul (nombre d'itérations = 2^10 = 1024)
 * Plus le coût est élevé, plus lent le hachage, plus sécurisé (mais aussi plus lent)
 * 10 est un bon équilibre pour 2024
 * 
 * SÉCURITÉ - UTILISATEUR ISOLÉ:
 * - Filtre par req.user.id pour s'assurer qu'on change le mot de passe de cet utilisateur
 * - Même si quelqu'un connait un mot de passe, il ne peut changer que le sien
 * 
 * APRÈS SUCCÈS:
 * - Redirige vers /profile?success=1
 * - Les sessions JWT existantes restent valides jusqu'à expiration
 * - Nouveau login requiert le nouveau mot de passe
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // ID d'authentification JWT
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation 1: tous les champs doivent être fournis
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).render('user/changePassword', { 
        title: 'Changer le mot de passe',
        error: 'Tous les champs sont requis'
      });
    }

    // Validation 2: les nouveaux mots de passe doivent correspondre
    if (newPassword !== confirmPassword) {
      return res.status(400).render('user/changePassword', { 
        title: 'Changer le mot de passe',
        error: 'Les mots de passe ne correspondent pas'
      });
    }

    // Validation 3: minimum de sécurité (6 caractères)
    if (newPassword.length < 6) {
      return res.status(400).render('user/changePassword', { 
        title: 'Changer le mot de passe',
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Récupère le mot de passe hashé actuellement en base
    // On a besoin du hash pour utiliser bcrypt.compare()
    const user = await get(
      'SELECT mot_de_passe FROM utilisateurs WHERE id_utilisateur = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).render('error', { 
        error: 'Utilisateur non trouvé' 
      });
    }

    // Validation 4: vérifier que le mot de passe actuel saisi est correct
    // bcrypt.compare(plaintext, hash) effectue la vérification sécurisée
    // Compare le plaintext saisi avec le hash en base
    const isPasswordValid = await bcrypt.compare(currentPassword, user.mot_de_passe);
    if (!isPasswordValid) {
      return res.status(400).render('user/changePassword', { 
        title: 'Changer le mot de passe',
        error: 'Le mot de passe actuel est incorrect'
      });
    }

    // Hasher le nouveau mot de passe avec bcryptjs
    // bcrypt.hash(password, 10) génère un hash sécurisé
    // 10 = coût (nombre d'itérations = 2^10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe en base
    // WHERE id_utilisateur = ? assure qu'on modifie uniquement cet utilisateur
    // On stocke toujours le hash, jamais le plaintext
    await run(
      'UPDATE utilisateurs SET mot_de_passe = ? WHERE id_utilisateur = ?',
      [hashedPassword, userId]
    );

    // Succès: redirection avec message de confirmation
    res.redirect('/profile?success=1');
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du changement de mot de passe' 
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getChangePasswordForm,
  changePassword
};
