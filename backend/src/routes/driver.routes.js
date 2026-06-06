const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { scopeTenant } = require('../middleware/tenant');

// Guard all driver routes
router.use(authenticate);
router.use(authorize('DRIVER'));
router.use(scopeTenant);

router.get('/assigned-bus', driverController.getAssignedBus);
router.post('/trips/start', driverController.startTrip);
router.post('/trips/:id/stop', driverController.stopTrip);
router.post('/trips/student-pickup', driverController.markStudentPickup);

// Scheduled routes
router.get('/assigned-schedule', driverController.getAssignedSchedule);
router.post('/trips/start-schedule', driverController.startTripSchedule);
router.post('/stops/:id/status', driverController.updateStopStatus);
router.post('/qr/verify', driverController.verifyStudentQR);
router.post('/emergency', driverController.reportEmergency);
router.post('/delay', driverController.reportDelay);

module.exports = router;
