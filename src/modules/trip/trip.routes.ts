import { Router } from 'express';
import { TripController } from './trip.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { requireOwnership } from '../../middlewares/authorization';
import { validateRequest } from '../../middlewares/validate.middleware';
import { startTripSchema, recordPingSchema, tripIdParams, updateTripStatusSchema, assignTripSchema } from './trip.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new TripController();

router.use(authenticateUser);

// Trip Assignment
router.post('/assign', requireRoles(UserRole.ORG_ADMIN, UserRole.OPERATOR), validateRequest(assignTripSchema), controller.assign);

// Driver endpoints for controlling trip status and GPS ingestion
router.post('/start', requireRoles(UserRole.DRIVER), validateRequest(startTripSchema), controller.start);
router.post('/:id/stop', requireRoles(UserRole.DRIVER), validateRequest(tripIdParams), controller.end);
router.post('/:id/status', requireRoles(UserRole.DRIVER), validateRequest(updateTripStatusSchema), controller.updateStatus);
router.post('/:id/ping', requireRoles(UserRole.DRIVER), requireOwnership('trip'), validateRequest(recordPingSchema), controller.ping);

// Passenger, Driver, and Admin endpoints for tracking buses
router.get('/active', controller.getActive);
router.get('/:id/location', validateRequest(tripIdParams), controller.getLocation);

export default router;
