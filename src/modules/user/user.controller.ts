import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { UserRole } from '@prisma/client';

// Helper to strip passwordHash
const sanitizeUser = (user: any) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

export class UserController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org;

      const user = await userService.createUser(data, actorId, actorRole, organizationId);

      res.status(201).json({
        status: 'success',
        data: { user: sanitizeUser(user) },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const role = req.query.role as UserRole | undefined;
      const organizationId = req.user!.org;

      const result = await userService.getUsers(organizationId, page, limit, role);

      res.status(200).json({
        status: 'success',
        data: {
          ...result,
          users: result.users.map(sanitizeUser)
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const id = (!req.params.id || req.params.id === 'me') ? req.user!.sub : req.params.id;

      const user = await userService.getUser(id, organizationId);

      res.status(200).json({
        status: 'success',
        data: { user: sanitizeUser(user) },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const id = (!req.params.id || req.params.id === 'me') ? req.user!.sub : req.params.id;
      
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      
      let data = req.body;

      // If a user is updating their own profile and they are not an Admin, restrict fields
      if (id === actorId && actorRole !== 'SUPER_ADMIN' && actorRole !== 'ORG_ADMIN') {
        data = {
          firstName: req.body.firstName,
          lastName: req.body.lastName
        };
      }

      const user = await userService.updateUser(id, organizationId, data, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        data: { user: sanitizeUser(user) },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.org;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;

      await userService.deleteUser(id, organizationId, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
