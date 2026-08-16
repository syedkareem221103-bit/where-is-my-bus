import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { BadRequestError } from '../../errors';

export class AttendanceController {
  private attendanceService = new AttendanceService();

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId || req.user!.org;
      const callerId = req.user!.id || req.user!.sub;
      const callerRole = req.user!.role;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can submit attendance');
      }

      const { studentId, scheduleId, date, status } = req.body;
      const ipAddress = req.ip || '127.0.0.1';
      const record = await this.attendanceService.submitAttendance(organizationId, callerId, callerRole, {
        studentId,
        scheduleId,
        date,
        status,
        ipAddress,
      });

      res.status(200).json({
        status: 'success',
        message: 'Attendance submitted successfully',
        data: { record },
      });
    } catch (error) {
      next(error);
    }
  };

  getDaily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId || req.user!.org;
      const date = req.query.date as string;

      const records = await this.attendanceService.getDailyAttendance(organizationId, date);

      res.status(200).json({
        status: 'success',
        data: { records },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AttendanceController;
