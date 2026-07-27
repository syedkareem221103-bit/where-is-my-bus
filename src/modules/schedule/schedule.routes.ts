import { Router } from 'express';
import { ScheduleController } from './schedule.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { getSchedulesQuerySchema, createScheduleSchema, updateScheduleSchema, scheduleIdParams } from './schedule.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new ScheduleController();

router.use(authenticateUser);

const writeAccess = requireRoles(UserRole.ORG_ADMIN, UserRole.OPERATOR);

router.post('/', writeAccess, validateRequest(createScheduleSchema), controller.create);
router.get('/', validateRequest(getSchedulesQuerySchema), controller.getAll);
router.get('/:id', validateRequest(scheduleIdParams), controller.getById);
router.put('/:id', writeAccess, validateRequest(updateScheduleSchema), controller.update);
router.delete('/:id', writeAccess, validateRequest(scheduleIdParams), controller.delete);

export default router;
