const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { scopeTenant } = require('../middleware/tenant');

// Guard all parent/student routes
router.use(authenticate);
router.use(authorize('PARENT', 'STUDENT', 'INST_ADMIN'));
router.use(scopeTenant);

router.get('/students', parentController.getLinkedStudents);
router.post('/attendance', parentController.submitAttendance);
router.get('/notifications', parentController.getNotifications);
router.put('/notifications/:id/read', parentController.markNotificationRead);
router.get('/trips/:id/eta', parentController.getTripETA);
router.get('/student-stops', parentController.getStudentStops);
router.get('/student-qr', parentController.getStudentQR);
router.get('/emergencies', parentController.getRouteEmergencies);

module.exports = router;
