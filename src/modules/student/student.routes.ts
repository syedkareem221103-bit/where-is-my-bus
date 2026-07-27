import { Router } from 'express';
import { studentController } from './student.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createStudentSchema, getStudentsQuerySchema, updateStudentSchema, studentIdParams } from './student.validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createStudentSchema),
  studentController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getStudentsQuerySchema),
  studentController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR, UserRole.DRIVER, UserRole.PARENT, UserRole.STUDENT),
  validateRequest(studentIdParams),
  studentController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(updateStudentSchema),
  studentController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(studentIdParams),
  studentController.delete
);

export default router;
