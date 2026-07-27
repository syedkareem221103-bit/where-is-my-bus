import { Router } from 'express';
import { driverController } from './driver.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createDriverSchema, getDriversQuerySchema, updateDriverSchema, driverIdParams } from './driver.validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createDriverSchema),
  driverController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getDriversQuerySchema),
  driverController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.DRIVER),
  validateRequest(driverIdParams),
  driverController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(updateDriverSchema),
  driverController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(driverIdParams),
  driverController.delete
);

export default router;
