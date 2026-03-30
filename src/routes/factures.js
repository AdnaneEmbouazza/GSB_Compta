const express = require('express');
const factureController = require('../controllers/factureController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', factureController.getFactures);
router.get('/new', factureController.showCreateForm);
router.post('/', factureController.createFacture);
router.get('/:id', factureController.viewFacture);
router.delete('/:id', factureController.deleteFacture);
router.put('/:id/status', factureController.updateFactureStatus);

// Routes pour les lignes
router.post('/:id/lignes', factureController.addLigneFacture);
router.delete('/:id/lignes/:idLigne', factureController.deleteLigneFacture);

module.exports = router;
