import { Router } from 'express';
import { TripController } from './trip.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { startTripSchema, recordPingSchema, tripIdParams } from './trip.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new TripController();

router.use(authenticateUser);

// Driver endpoints for controlling trip status and GPS ingestion
router.post('/start', requireRoles(UserRole.DRIVER), validateRequest(startTripSchema), controller.start);
router.post('/:id/stop', requireRoles(UserRole.DRIVER), validateRequest(tripIdParams), controller.end);
router.post('/:id/ping', requireRoles(UserRole.DRIVER), validateRequest(recordPingSchema), controller.ping);

// Passenger, Driver, and Admin endpoints for tracking buses
router.get('/active', controller.getActive);
router.get('/:id/location', validateRequest(tripIdParams), controller.getLocation);

export default router;
