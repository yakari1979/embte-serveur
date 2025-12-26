const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createProject, getAllProjects, getProjectDetails } = require('../controllers/projectController');

// Seuls Admin et Manager peuvent créer des projets
router.post('/', protect, authorize('ADMIN', 'MANAGER'), createProject);

// Tout le personnel peut voir la liste (mais filtrée par le contrôleur)
router.get('/', protect, getAllProjects);

// Détails
router.get('/:id', protect, getProjectDetails);

module.exports = router;