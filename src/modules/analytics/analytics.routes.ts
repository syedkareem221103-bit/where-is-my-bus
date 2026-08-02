import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Only ADMINs (ORG_ADMIN, SUPER_ADMIN) should access analytics
router.use(authenticateUser);
router.use(requireRoles('ORG_ADMIN', 'SUPER_ADMIN'));

router.get('/historical', AnalyticsController.getHistorical);
router.get('/live', AnalyticsController.getLive);

export default router;
