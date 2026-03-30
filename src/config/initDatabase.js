// =====================================================
// INITDATABASE.JS - Script d'initialisation de la base de données
// =====================================================
// Lance avec : npm run init-db
// Rôle : Lire le fichier script.sql et créer toutes les tables

const { run } = require('./database');
const fs = require('fs');
const path = require('path');

/**
 * Fonction principale : initialise la base de données
 * - Lit le script SQL depuis script.sql
 * - Exécute chaque instruction CREATE TABLE
 * - Gère les erreurs (ignore "already exists")
 * - Quitte le processus à la fin
 */
async function initDatabase() {
  try {
    console.log('Initialisation de la base de données...');

    // Lire le fichier script.sql depuis la racine du projet
    const sqlScript = fs.readFileSync(
      path.join(__dirname, '../..', 'script.sql'),
      'utf-8'
    );

    // Diviser le script en instructions individuelles (séparées par ';')
    // et nettoyer les espaces vides
    const statements = sqlScript
      .split(';')                  // Divise par la fin de chaque instruction
      .map(stmt => stmt.trim())    // Enlève espaces avant/après
      .filter(stmt => stmt.length > 0);  // Enlève les lignes vides

    // Exécuter chaque instruction SQL une par une
    for (const statement of statements) {
      try {
        await run(statement);
      } catch (err) {
        // Ignorer les erreurs "table already exists" 
        // (tables déjà créées lors d'une exec précédente)
        if (!err.message.includes('already exists')) {
          console.warn('Avertissement:', err.message);
        }
      }
    }

    console.log('✅ Base de données initialisée avec succès !');
    process.exit(0);  // Quitter avec code 0 (succès)
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation:', err.message);
    process.exit(1);  // Quitter avec code 1 (erreur)
  }
}

// Lancer la fonction
initDatabase();
