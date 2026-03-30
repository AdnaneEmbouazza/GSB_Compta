// =====================================================
// AUTHCONTROLLER.JS - Authentification utilisateur
// =====================================================
// Gère l'inscription, la connexion, le logout
// Utilise bcryptjs pour hasher les mots de passe
// Utilise JWT pour créer les tokens d'authentification

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run, all } = require('../config/database');
require('dotenv').config();

/**
 * POST /signup
 * Crée un nouvel utilisateur
 * 1. Valide les données
 * 2. Vérifie que l'email n'existe pas
 * 3. Hash le mot de passe (sécurité)
 * 4. Crée l'utilisateur en BD
 * 5. Génère un token JWT
 * 6. Enregistre le token en cookie
 */
const signup = async (req, res) => {
  try {
    const { email, password, nom, prenom } = req.body;

    // Validation
    if (!email || !password || !nom) {
      return res.status(400).render('signup', { 
        error: 'Email, mot de passe et nom sont requis' 
      });
    }

    // Vérifier déjà existe
    const existing = await get('SELECT id_utilisateur FROM utilisateurs WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).render('signup', { 
        error: 'Un utilisateur avec cet email existe déjà' 
      });
    }

    // Hash du mot de passe (10 = force du hash)
    // On stocke JAMAIS le mot de passe en clair !
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur en BD
    const result = await run(
      'INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, nom, prenom]
    );

    // Créer un JWT token (valable 7 jours selon .env)
    const token = jwt.sign(
      { id: result.lastID, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Sauvegarder le token en cookie (httpOnly = pas modifiable en JavaScript)
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erreur signup:', err);
    res.status(500).render('signup', { error: 'Erreur serveur' });
  }
};

/**
 * POST /login
 * Authentifie un utilisateur existant
 * 1. Valide email/password
 * 2. Cherche l'utilisateur en BD
 * 3. Compare le mot de passe avec bcrypt
 * 4. Crée le token JWT
 * 5. Enregistre en cookie
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).render('login', { 
        error: 'Email et mot de passe requis' 
      });
    }

    // Chercher l'utilisateur dans la BD
    const user = await get('SELECT * FROM utilisateurs WHERE email = ?', [email]);

    // Email non trouvé
    if (!user) {
      return res.status(401).render('login', { 
        error: 'Email ou mot de passe incorrect' 
      });
    }

    // Comparer le mot de passe fourni avec le hash en BD
    // bcrypt.compare(mot_de_passe_clair, hash_bd) → true/false
    const validPassword = await bcrypt.compare(password, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).render('login', { 
        error: 'Email ou mot de passe incorrect' 
      });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { id: user.id_utilisateur, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Sauvegarder le token en cookie
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).render('login', { error: 'Erreur serveur' });
  }
};

/**
 * GET /signup
 * Affiche le formulaire d'inscription
 */
const showSignup = (req, res) => {
  res.render('signup', { error: null });
};

/**
 * GET /login
 * Affiche le formulaire de connexion
 */
const showLogin = (req, res) => {
  res.render('login', { error: null });
};

/**
 * GET /logout
 * Déconnecte l'utilisateur
 * - Efface le cookie token
 * - Redirige vers accueil
 */
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = {
  signup,
  login,
  logout,
  showSignup,
  showLogin
};
