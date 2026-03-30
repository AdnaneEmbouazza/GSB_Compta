/**
 * Express Application Configuration
 * 
 * Ce fichier configure l'application Express:
 * - Moteur de templates EJS pour les vues HTML
 * - Middlewares (parsing, cookies, fichiers statiques)
 * - Routes (authentification, articles, factures, etc.)
 * - Gestion des erreurs (404, erreurs serveur)
 * 
 * FLUX D'UNE REQUÊTE HTTP:
 * 1. Requête arrive → Express
 * 2. Passe par les middlewares (order important!)
 * 3. Match contre une route
 * 4. Contrôleur répond (renderise vue ou JSON)
 * 5. Erreur Handler 404 si pas de route match
 * 6. Erreur Handler 500 si exception
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// ===== CONFIGURATION DU MOTEUR DE TEMPLATES =====
// EJS = "Embedded JavaScript" template engine
// Permet d'utiliser JavaScript dans HTML avec <% %> syntax
app.set('view engine', 'ejs');
// Dossier où se trouvent les fichiers templates .ejs
app.set('views', path.join(__dirname, 'views'));

// ===== MIDDLEWARES GLOBAUX (appliqués à toutes les requêtes) =====

// 1. Serve static files (CSS, JS, images, etc.)
//    Fichiers du dossier /public accessibles directement
//    ex: /css/style.css → __dirname/public/css/style.css
app.use(express.static(path.join(__dirname, 'public')));

// 2. Parse URL-encoded form data (formulaires HTML)
//    extended: true = accepte les données récursives complexes
app.use(express.urlencoded({ extended: true }));

// 3. Parse JSON (si client envoie Content-Type: application/json)
app.use(express.json());

// 4. Parse cookies depuis le header Cookie
//    Rend accessible via req.cookies.nomDuCookie
//    Important pour les JWT stockés dans cookies httpOnly
app.use(cookieParser());

// ===== ROUTES PUBLIQUES (sans authentification) =====

// Route racine / → affiche la page d'accueil
// Redirige vers /dashboard si déjà connecté
app.get('/', (req, res) => {
  // Vérifie si utilisateur a un cookie token (donc connecté)
  if (req.cookies.token) {
    return res.redirect('/dashboard');
  }
  // Sinon affiche page d'accueil (index.ejs)
  res.render('index');
});

// Route dashboard - page d'accueil pour utilisateur connecté
// Vérifie manuellement le token (sans middleware authenticateToken)
app.get('/dashboard', (req, res) => {
  const token = req.cookies.token;
  
  // Si pas de token: redirige vers login
  if (!token) {
    return res.redirect('/login');
  }
  
  // Sinon affiche le dashboard
  res.render('dashboard');
});

// Routes d'authentification (login, signup, logout)
// Gérées dans /routes/auth.js
app.use('/', require('./routes/auth'));

// ===== ROUTES PROTÉGÉES (nécessitent authentification JWT) =====
// Chacune de ces routes utilise le middleware authenticateToken
// qui vérifie le JWT avant d'exécuter le contrôleur
// Si pas de token ou token invalide → redirection vers /login

app.use('/profile', require('./routes/user'));          // Profil utilisateur
app.use('/articles', require('./routes/articles'));    // Gestion des articles
app.use('/categories', require('./routes/categories')); // Gestion des catégories
app.use('/contacts', require('./routes/contacts'));    // Gestion des contacts
app.use('/factures', require('./routes/factures'));    // Gestion des factures
app.use('/devis', require('./routes/devis'));          // Gestion des devis

// ===== GESTION DES ERREURS =====

// 404 Handler - appélé si aucune route n'a matché
// Important: DOIT être après toutes les routes pour être appelé en dernier
app.use((req, res) => {
  // Rend la page error.ejs avec un message 404
  res.status(404).render('error', { error: 'Page non trouvée' });
});

// Global Error Handler - capte les exceptions non gérées
// Important: DOIT avoir exactement 4 paramètres (err, req, res, next)
// C'est comme ça qu'Express sait que c'est un error handler
// 
// UTILISATION:
// Dans un contrôleur:
//   throw new Error('Message d\'erreur');
// → Le error handler ci-dessous le capture et affiche la page d'erreur
app.use((err, req, res, next) => {
  // Log l'erreur pour debugging
  console.error(err);
  
  // Rend la page error.ejs avec le message d'erreur
  res.status(500).render('error', { error: 'Erreur serveur' });
});

// Exporte l'app pour utilisation dans server.js
module.exports = app;
