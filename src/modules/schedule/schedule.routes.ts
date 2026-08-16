import { Router } from 'express';
import { ScheduleController } from './schedule.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { getSchedulesQuerySchema, createScheduleSchema, updateScheduleSchema, scheduleIdParams } from './schedule.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new ScheduleController();

router.use(authenticateUser);

const writeAccess = requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR);
const deleteAccess = requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN);

router.post('/', writeAccess, validateRequest(createScheduleSchema), controller.create);
router.get('/', validateRequest(getSchedulesQuerySchema), controller.getAll);
router.get('/:id', validateRequest(scheduleIdParams), controller.getById);
router.patch('/:id', writeAccess, validateRequest(updateScheduleSchema), controller.update);
router.delete('/:id', deleteAccess, validateRequest(scheduleIdParams), controller.delete);

export default router;
