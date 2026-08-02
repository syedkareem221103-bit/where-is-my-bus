import { Router } from 'express';
import { AlertController } from './alert.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticateUser);

router.get('/', requireRoles('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR'), AlertController.getAlerts);
router.post('/:id/acknowledge', requireRoles('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR'), AlertController.acknowledgeAlert);
router.post('/:id/resolve', requireRoles('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR'), AlertController.resolveAlert);

export default router;
