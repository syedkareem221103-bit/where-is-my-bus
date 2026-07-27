import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { submitAttendanceSchema, getAttendanceQuerySchema } from './attendance.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new AttendanceController();

router.use(authenticateUser);

// Students, Parents, and Admins can submit daily attendance
router.post(
  '/',
  requireRoles(UserRole.STUDENT, UserRole.PARENT, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(submitAttendanceSchema),
  controller.submit
);

// Only Institution Admins and Operators can view reports of daily attendance lists
router.get(
  '/today',
  requireRoles(UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getAttendanceQuerySchema),
  controller.getDaily
);

export default router;
