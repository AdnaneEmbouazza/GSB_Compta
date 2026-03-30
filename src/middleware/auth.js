/**
 * Authentication Middleware for JWT Token Verification
 * 
 * Ce fichier contient les middlewares pour vérifier les tokens JWT (JSON Web Tokens)
 * utilisés pour l'authentification dans l'application.
 * 
 * JWT EXPLIQUÉ:
 * Un JWT est un token encodé qui contient des informations utilisateur (payload)
 * signé avec une clé secrète (process.env.JWT_SECRET).
 * 
 * Structure d'un JWT:
 *   header.payload.signature
 *   exemple: eyJhbGciOiJIUzI1NiIs...eyJpZCI6MTIz...j5XYIjlpN3Xz...
 * 
 * - header: type d'algorithme (HS256, RS256, etc.)
 * - payload: contient les données (id_utilisateur, email, etc.)
 * - signature: hash calculé avec JWT_SECRET pour vérifier l'authenticité
 * 
 * AVANTAGES:
 * - Stateless (pas besoin de base de données pour vérifier)
 * - Client stocke le token et l'envoie à chaque requête
 * - Impossible à falsifier sans la clé secrète
 * - Peut avoir une date d'expiration
 * 
 * CYCLE DE VIE:
 * 1. Utilisateur se connecte → authController génère JWT → stocke dans cookie httpOnly
 * 2. Client envoie le cookie à chaque requête
 * 3. Middleware vérifie le token:
 *    - Extrait du cookie ou du header Authorization
 *    - Valide la signature avec JWT_SECRET
 *    - Décrit le payload → attach à req.user
 * 4. Contrôleurs utilisent req.user.id pour filtrer les données
 * 
 * SÉCURITÉ JWT:
 * - stocké dans un cookie httpOnly (JavaScript ne peut pas y accéder)
 * - Signé avec JWT_SECRET (impossible de modifier sans la clé)
 * - Peut avoir une expiration (exp claim)
 * - Si expiré → redirects vers /login ou erreur 403
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware d'authentification pour requêtes normales (page HTML)
 * 
 * Vérifie que l'utilisateur est authentifié avant d'accéder aux pages protégées.
 * Si le token est manquant ou invalide, redirige vers /login.
 * 
 * @param {Object} req - Objet requête Express
 * @param {Object} res - Objet réponse Express
 * @param {Function} next - Fonction pour appeler le prochain middleware
 * 
 * ÉTAPES:
 * 1. Récherche le token:
 *    - D'abord dans req.cookies.token (chemin normal)
 *    - Sinon dans header Authorization: "Bearer <token>"
 * 2. Si pas de token → redirection vers /login
 * 3. jwt.verify() décode et valide le token:
 *    - Utilise JWT_SECRET pour vérifier la signature
 *    - Retourne le payload décodé (contient id_utilisateur, email, etc.)
 *    - Lève une exception si le token est expiré ou invalide
 * 4. Si valide:
 *    - Attach le payload décodé à req.user
 *    - Appelle next() pour continuer vers le contrôleur
 *    - req.user.id sera disponible dans tous les contrôleurs
 * 5. Si erreur:
 *    - Efface le cookie token (token expiré/invalide)
 *    - Redirige vers /login
 * 
 * UTILISATION:
 * router.get('/articles', authenticateToken, articleController.getArticles);
 * → authenticateToken vérifie d'abord, puis appelle articleController.getArticles
 * 
 * VARIABLES D'ENVIRONNEMENT REQUISES:
 * - JWT_SECRET: clé secrète pour signer/vérifier les tokens
 * - JWT_EXPIRE: durée d'expiration du token (ex: "7d")
 * 
 * EXEMPLE DE PAYLOAD DÉCODÉ (req.user):
 * {
 *   id: 1,
 *   email: "user@example.com",
 *   nom: "Dupont",
 *   prenom: "Jean",
 *   iat: 1699000000,        // issued at
 *   exp: 1699604800         // expiration timestamp
 * }
 */
const authenticateToken = (req, res, next) => {
  // Récherche le token dans le cookie 'token' ou dans le header Authorization
  // Syntaxe Authorization: "Bearer <token>"
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

  // Si pas de token: utilisateur non authentifié
  if (!token) {
    return res.redirect('/login');
  }

  try {
    // jwt.verify() valide la signature et décode le token
    // Lance une exception si:
    // - La signature est invalide (token a été modifié)
    // - Le token a expiré (exp < Date.now())
    // - JWT_SECRET ne correspond pas
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach le payload décodé à req.user
    // Les contrôleurs peuvent maintenant accéder à req.user.id, req.user.email, etc.
    req.user = decoded;
    
    // Appelle le prochain middleware/contrôleur
    next();
  } catch (err) {
    // Token expiré, invalide, ou falsifié
    console.error('Token invalide:', err.message);
    
    // Efface le cookie pour "logout" l'utilisateur
    res.clearCookie('token');
    
    // Redirige vers la page de login
    res.redirect('/login');
  }
};

/**
 * Middleware d'authentification pour routes API (JSON responses)
 * 
 * Similaire à authenticateToken mais pour les APIs:
 * - Retourne JSON au lieu de redirection
 * - Code erreur 401 (Unauthorized) si manquant
 * - Code erreur 403 (Forbidden) si invalide/expiré
 * 
 * @param {Object} req - Objet requête Express
 * @param {Object} res - Objet réponse Express  
 * @param {Function} next - Fonction pour appeler le prochain middleware
 * 
 * UTILISATION:
 * router.post('/api/articles', authenticateAPI, articleController.createArticle);
 * 
 * RÉPONSES:
 * - Sans token: { error: "Token manquant" } avec status 401
 * - Token invalide: { error: "Token invalide ou expiré" } avec status 403
 */
const authenticateAPI = (req, res, next) => {
  // Récherche le token (même logique que authenticateToken)
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

  // Si pas de token: retourne erreur JSON 401 (Unauthorized)
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    // Valide et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Token invalide ou expiré: retourne erreur JSON 403 (Forbidden)
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

module.exports = {
  authenticateToken,
  authenticateAPI
};
