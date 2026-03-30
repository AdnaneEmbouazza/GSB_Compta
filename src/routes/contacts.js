const express = require('express');
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', contactController.getContacts);
router.get('/new', contactController.showCreateForm);
router.post('/', contactController.createContact);
router.get('/:id/edit', contactController.showEditForm);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
