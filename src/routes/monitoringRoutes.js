const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { logConnection, getMonitoringLogs } = require('../controllers/monitoringController');

// Tout le monde connecté peut envoyer des logs
router.post('/log', protect, logConnection);

// Seul l'Admin peut voir les logs
router.get('/logs', protect, authorize('ADMIN'), getMonitoringLogs);

module.exports = router;