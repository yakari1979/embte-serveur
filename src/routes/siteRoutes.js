const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Il faut créer ce fichier (voir étape suivante)
const { addTask, updateTaskStatus, createDailyReport } = require('../controllers/siteController');

router.post('/tasks', protect, addTask);
router.patch('/tasks/:taskId', protect, updateTaskStatus);

// Route avec Upload d'image
router.post('/reports', protect, upload.single('photo'), createDailyReport);

module.exports = router;