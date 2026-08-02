import { Router } from 'express';
import { GeofenceController } from './geofence.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticateUser);

router.get('/', requireRoles('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR'), GeofenceController.getGeofences);
router.post('/', requireRoles('SUPER_ADMIN', 'ORG_ADMIN'), GeofenceController.createGeofence);
router.put('/:id', requireRoles('SUPER_ADMIN', 'ORG_ADMIN'), GeofenceController.updateGeofence);
router.delete('/:id', requireRoles('SUPER_ADMIN', 'ORG_ADMIN'), GeofenceController.deleteGeofence);

export default router;
