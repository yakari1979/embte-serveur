const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Pour l'upload de fichiers

// Import des contrôleurs
const { 
    getWorkerDashboard, 
    clockIn, 
    createReport, 
    getMyReports 
} = require('../controllers/workerController');

// Protection Globale : Seul un WORKER connecté peut accéder
router.use(protect);
router.use(authorize('WORKER'));

// --- ROUTES ---

// 1. Dashboard (Infos + Projets)
router.get('/dashboard', getWorkerDashboard);

// 2. Pointage (Clock In)
router.post('/clock-in', clockIn);

// 3. Rapports
router.get('/reports', getMyReports); // <-- C'est cette route qui manquait !
router.post('/reports', upload.array('files', 5), createReport); // Envoi avec fichiers

module.exports = router;