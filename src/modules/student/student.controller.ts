import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service';
import { StudentStatus, UserRole } from '@prisma/client';
import { ForbiddenError } from '../../errors';
import prisma from '../../config/database';

export class StudentController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org;
      const ipAddress = req.ip || '0.0.0.0';

      const student = await studentService.createStudent(data, actorId, actorRole, organizationId, ipAddress);

      res.status(201).json({
        status: 'success',
        data: { student },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as StudentStatus | undefined;
      const search = req.query.search as string | undefined;
      const organizationId = req.user!.org;

      const result = await studentService.getStudents(organizationId, page, limit, status, search);

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

      const student = await studentService.getStudent(id, organizationId);

      // STUDENT role can only fetch their own profile
      if (actorRole === UserRole.STUDENT && student.userId !== actorId) {
        throw new ForbiddenError('You can only access your own student profile');
      }

      // PARENT role can only fetch their linked children
      if (actorRole === UserRole.PARENT) {
        const link = await prisma.parentChild.findUnique({
          where: {
            parentId_studentId: {
              parentId: actorId,
              studentId: id,
            },
          },
        });
        if (!link) {
          throw new ForbiddenError('You can only access your own linked children');
        }
      }

      res.status(200).json({
        status: 'success',
        data: { student },
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

      const student = await studentService.updateStudent(id, organizationId, data, actorId, actorRole, ipAddress);

      res.status(200).json({
        status: 'success',
        data: { student },
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

      await studentService.deleteStudent(id, organizationId, actorId, actorRole, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Student deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const studentController = new StudentController();
export default studentController;
