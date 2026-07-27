import { UserRole } from '@prisma/client';

export const RolePermissions = {
  [UserRole.SUPER_ADMIN]: ['*'], // Platform-wide access
  [UserRole.ORG_ADMIN]: ['tenant:manage'],
  [UserRole.OPERATOR]: ['trips:manage', 'schedules:manage', 'incidents:manage'],
  [UserRole.DRIVER]: ['trips:execute'],
  [UserRole.PARENT]: ['students:read'],
  [UserRole.STUDENT]: ['self:read'],
};
