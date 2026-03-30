const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getChangePasswordForm, changePassword } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Afficher le profil
router.get('/', authenticateToken, getProfile);

// Mettre à jour le profil
router.put('/', authenticateToken, updateProfile);

// Formulaire de changement de mot de passe
router.get('/change-password', authenticateToken, getChangePasswordForm);

// Changer le mot de passe
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
