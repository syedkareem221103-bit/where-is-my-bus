import { Router } from 'express';
import { parentController } from './parent.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  createParentSchema,
  getParentsQuerySchema,
  updateParentSchema,
  parentIdParams,
  linkStudentSchema,
  unlinkStudentSchema
} from './parent.validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createParentSchema),
  parentController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getParentsQuerySchema),
  parentController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.PARENT),
  validateRequest(parentIdParams),
  parentController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.PARENT),
  validateRequest(updateParentSchema),
  parentController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(parentIdParams),
  parentController.delete
);

router.post('/:id/students',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(linkStudentSchema),
  parentController.linkStudent
);

router.delete('/:id/students/:studentId',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(unlinkStudentSchema),
  parentController.unlinkStudent
);

export default router;
