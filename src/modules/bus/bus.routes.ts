import { Router } from 'express';
import { vehicleController } from './vehicle.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createVehicleSchema, getVehiclesQuerySchema, updateVehicleSchema, vehicleIdParams } from './vehicle.validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createVehicleSchema),
  vehicleController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getVehiclesQuerySchema),
  vehicleController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.DRIVER),
  validateRequest(vehicleIdParams),
  vehicleController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(updateVehicleSchema),
  vehicleController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(vehicleIdParams),
  vehicleController.delete
);

export default router;
