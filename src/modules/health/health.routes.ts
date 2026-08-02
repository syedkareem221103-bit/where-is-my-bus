import { Router } from 'express';
import { HealthController } from './health.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticateUser);

router.get('/', requireRoles('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR'), HealthController.getSystemHealth);
router.get('/history', requireRoles('SUPER_ADMIN'), HealthController.getHistoricalHealth);
router.post('/check', requireRoles('SUPER_ADMIN'), HealthController.forceHealthCheck);

export default router;
