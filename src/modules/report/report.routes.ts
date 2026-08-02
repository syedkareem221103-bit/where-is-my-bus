import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for on-demand exports (Max 3 per 10 minutes)
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 3,
  message: { error: 'Too many on-demand exports requested. Please try again later.' }
});

// All routes (except download) require authentication and ORG_ADMIN/SUPER_ADMIN roles
router.use(authenticateUser);

router.post(
  '/subscriptions',
  requireRoles('ORG_ADMIN', 'SUPER_ADMIN'),
  reportController.createSubscription.bind(reportController)
);

router.get(
  '/subscriptions',
  requireRoles('ORG_ADMIN', 'SUPER_ADMIN'),
  reportController.getSubscriptions.bind(reportController)
);

router.delete(
  '/subscriptions/:id',
  requireRoles('ORG_ADMIN', 'SUPER_ADMIN'),
  reportController.deleteSubscription.bind(reportController)
);

router.get(
  '/executions',
  requireRoles('ORG_ADMIN', 'SUPER_ADMIN'),
  reportController.getExecutions.bind(reportController)
);

router.post(
  '/export',
  requireRoles('ORG_ADMIN', 'SUPER_ADMIN'),
  exportLimiter,
  reportController.exportOnDemand.bind(reportController)
);

// Download endpoint: secure via the one-time token in URL
router.get(
  '/download/:token',
  reportController.downloadExport.bind(reportController)
);

export const reportRoutes = router;
