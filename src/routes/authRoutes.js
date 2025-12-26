const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register); // Pour créer le premier admin ou via page inscription
router.post('/login', login);

module.exports = router;