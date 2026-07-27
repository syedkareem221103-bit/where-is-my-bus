import { Router } from 'express';
import { routeController } from './route.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createRouteSchema, getRoutesQuerySchema, updateRouteSchema, routeIdParams } from './route.validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createRouteSchema),
  routeController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getRoutesQuerySchema),
  routeController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.DRIVER, UserRole.PARENT, UserRole.STUDENT),
  validateRequest(routeIdParams),
  routeController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(updateRouteSchema),
  routeController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(routeIdParams),
  routeController.delete
);

export default router;
