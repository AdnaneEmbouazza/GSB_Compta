// =====================================================
// DATABASE.JS - Configuration de la base de données SQLite
// =====================================================
// Ce fichier gère la connexion à SQLite et expose les fonctions
// pour exécuter des requêtes SQL de manière asynchrone

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Chemin vers le fichier de base de données
// Par défaut : ./src/data/compta.db
const DB_PATH = process.env.DB_PATH || './src/data/compta.db';

// Créer le répertoire /data s'il n'existe pas
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Établir la connexion à la base de données SQLite
// Si erreur → arrête l'app (process.exit(1))
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur connexion base de données:', err.message);
    process.exit(1);
  }
});

// =====================================================
// FONCTIONS ASYNC POUR LES REQUÊTES SQL
// =====================================================
// SQLite3 utilise les callbacks, on les convertit en Promises
// pour pouvoir utiliser async/await

/**
 * Exécute une requête SQL (INSERT, UPDATE, DELETE)
 * @param {string} sql - Requête SQL
 * @param {array} params - Paramètres à lier (protection SQL injection)
 * @returns {Promise} Résultat de l'exécution
 */
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

/**
 * Récupère UNE SEULE ligne de la base de données
 * @param {string} sql - Requête SQL
 * @param {array} params - Paramètres à lier
 * @returns {Promise} Un objet (la première ligne trouvée)
 */
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Récupère TOUTES les lignes correspondant à la requête
 * @param {string} sql - Requête SQL
 * @param {array} params - Paramètres à lier
 * @returns {Promise} Un tableau d'objets (toutes les lignes)
 */
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

// Exporte les fonctions pour qu'on puisse les utiliser partout dans l'app
module.exports = {
  db,
  run,
  get,
  all
};
