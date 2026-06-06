const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { scopeTenant } = require('../middleware/tenant');
const { validateBusCreation, validateStudentCreation } = require('../middleware/validation');

// Guard all admin routes with authentication, role checking and tenant mapping
router.use(authenticate);
router.use(authorize('INST_ADMIN', 'SUPER_ADMIN'));
router.use(scopeTenant);

// Buses endpoints
router.get('/buses', adminController.getBuses);
router.post('/buses', validateBusCreation, adminController.createBus);
router.put('/buses/:id', validateBusCreation, adminController.updateBus);
router.delete('/buses/:id', adminController.deleteBus);

// Routes endpoints
router.get('/routes', adminController.getRoutes);
router.post('/routes', adminController.createRoute);
router.post('/routes/:id/optimize', adminController.optimizeRouteStops);

// Students endpoints
router.get('/students', adminController.getStudents);
router.post('/students', validateStudentCreation, adminController.createStudent);

// Analytics endpoints
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/eta', adminController.getETAAnalytics);

// Schedules endpoints
router.post('/schedules/generate', adminController.generateDailySchedules);
router.get('/schedules/today', adminController.getTodaySchedules);

// Emergency endpoints
router.get('/emergencies/active', adminController.getActiveEmergencies);
router.post('/emergencies/:id/resolve', adminController.resolveEmergency);
router.get('/analytics/emergencies', adminController.getEmergencyAnalytics);

module.exports = router;
