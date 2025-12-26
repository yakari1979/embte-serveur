const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getManagerDashboard, getManagerTeams, createWorker, getManagerReports, validateReport, updateProjectProgress, getManagerProjectDetails,
createTask, getProjectTasks, updateTask, getProjectLogistics, createSupplyRequest, receiveSupply } = require('../controllers/managerController');


router.use(protect);
router.use(authorize('MANAGER'));

router.get('/dashboard', getManagerDashboard);
router.get('/teams', getManagerTeams);
router.post('/workers', createWorker);


router.get('/reports', getManagerReports);
router.put('/reports/:reportId/validate', validateReport); 

router.put('/projects/:projectId/progress', updateProjectProgress);
router.get('/projects/:id', getManagerProjectDetails);

// Routes Tâches
router.post('/tasks', createTask);
router.get('/projects/:projectId/tasks', getProjectTasks);
router.put('/tasks/:taskId', updateTask);


router.get('/projects/:projectId/logistics', getProjectLogistics);
router.post('/supply-request', createSupplyRequest);
router.put('/supply-request/:requestId/receive', receiveSupply);


module.exports = router;