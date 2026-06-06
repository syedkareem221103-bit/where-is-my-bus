const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validateRegistration } = require('../middleware/validation');

router.post('/login', authController.login);
router.post('/register', validateRegistration, authController.register);
router.get('/profile', authenticate, authController.profile);

module.exports = router;
