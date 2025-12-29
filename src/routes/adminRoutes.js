const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// IMPORT : Assure-toi que 'getProjectDetails' est bien dans la liste ci-dessous !
const { 
    getDashboardData, updateProjectStatus, getProjectDetails,
    getUsersByRole, getActiveProjects, assignManager,createManager, getUserDetails, getAllContacts, markContactAsRead, getAnalyticsData,
    getAllSupplyRequests, updateSupplyStatus, getProjectInventoryAdmin
} = require('../controllers/adminController');

// Protection globale : Seul l'ADMIN passe
router.use(protect);
router.use(authorize('ADMIN'));

// Routes
router.get('/dashboard', getDashboardData);
router.put('/projects/:projectId/status', updateProjectStatus);

// LA ROUTE MANQUANTE :
router.get('/projects/:id', getProjectDetails);

router.get('/users', getUsersByRole); // ?role=MANAGER
router.get('/projects-active', getActiveProjects);
router.put('/projects/:projectId/assign', assignManager);

router.post('/managers', createManager);
router.get('/users/:userId', getUserDetails);

// Routes Contact / Messagerie
router.get('/contacts', getAllContacts);
router.put('/contacts/:id/read', markContactAsRead);
router.get('/analytics', getAnalyticsData); // <-- NOUVELLE ROUTE

// Routes Logistique Admin
router.get('/logistics', getAllSupplyRequests);
router.put('/logistics/:id/status', updateSupplyStatus);

router.get('/projects/:projectId/inventory', getProjectInventoryAdmin); // <-- ROUTE

module.exports = router;