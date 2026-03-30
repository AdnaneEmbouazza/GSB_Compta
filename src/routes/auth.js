const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Routes publiques (sans authentification)
router.get('/login', authController.showLogin);
router.post('/login', authController.login);

router.get('/signup', authController.showSignup);
router.post('/signup', authController.signup);

router.get('/logout', authController.logout);

module.exports = router;
