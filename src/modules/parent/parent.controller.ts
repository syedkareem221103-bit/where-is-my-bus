import { Request, Response, NextFunction } from 'express';
import { parentService } from './parent.service';
import { UserStatus, UserRole } from '@prisma/client';
import { ForbiddenError } from '../../errors';

export class ParentController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org;
      const ipAddress = req.ip || '0.0.0.0';

      const parent = await parentService.createParent(data, actorId, actorRole, organizationId, ipAddress);

      const { passwordHash, ...safeParent } = parent;

      res.status(201).json({
        status: 'success',
        data: { parent: safeParent },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as UserStatus | undefined;
      const search = req.query.search as string | undefined;
      const organizationId = req.user!.org;

      const result = await parentService.getParents(organizationId, page, limit, status, search);
      
      result.parents = result.parents.map(p => {
        const { passwordHash, ...safeP } = p;
        return safeP;
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const { id } = req.params;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;

      if (actorRole === UserRole.PARENT && id !== actorId) {
        throw new ForbiddenError('You can only access your own profile');
      }

      const parent = await parentService.getParent(id, organizationId);
      
      const { passwordHash, ...safeParent } = parent;

      res.status(200).json({
        status: 'success',
        data: { parent: safeParent },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const { id } = req.params;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const data = req.body;
      const ipAddress = req.ip || '0.0.0.0';

      if (actorRole === UserRole.PARENT && id !== actorId) {
        throw new ForbiddenError('You can only update your own profile');
      }

      const parent = await parentService.updateParent(id, organizationId, data, actorId, actorRole, ipAddress);
      
      const { passwordHash, ...safeParent } = parent;

      res.status(200).json({
        status: 'success',
        data: { parent: safeParent },
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
      const ipAddress = req.ip || '0.0.0.0';

      await parentService.deleteParent(id, organizationId, actorId, actorRole, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Parent deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  linkStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { studentId, relationshipType } = req.body;
      const organizationId = req.user!.org;
      const actorId = req.user!.sub;
      const ipAddress = req.ip || '0.0.0.0';

      await parentService.linkStudent(id, organizationId, studentId, relationshipType, actorId, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Student linked successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  unlinkStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, studentId } = req.params;
      const organizationId = req.user!.org;
      const actorId = req.user!.sub;
      const ipAddress = req.ip || '0.0.0.0';

      await parentService.unlinkStudent(id, organizationId, studentId, actorId, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Student unlinked successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const parentController = new ParentController();
export default parentController;
