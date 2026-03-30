const express = require('express');
const devisController = require('../controllers/devisController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', devisController.getDevis);
router.get('/new', devisController.showCreateForm);
router.post('/', devisController.createDevis);
router.get('/:id', devisController.viewDevis);
router.delete('/:id', devisController.deleteDevis);
router.put('/:id/status', devisController.updateDevisStatus);

// Routes pour les lignes
router.post('/:id/lignes', devisController.addLigneDevis);
router.get('/:id/lignes/:idLigne/delete', devisController.deleteLigneDevis);

module.exports = router;
