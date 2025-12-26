const express = require('express');
const router = express.Router();
const { submitContact } = require('../controllers/contactController');

// Route publique (pas de protect)
router.post('/', submitContact);

module.exports = router;