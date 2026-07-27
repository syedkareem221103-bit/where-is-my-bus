import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { BadRequestError } from '../../errors';

export class AttendanceController {
  private attendanceService = new AttendanceService();

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const callerId = req.user!.id;
      const callerRole = req.user!.role;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can submit attendance');
      }

      const { studentId, date, status } = req.body;
      const record = await this.attendanceService.submitAttendance(organizationId, callerId, callerRole, {
        studentId,
        date,
        status,
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
      res.status(200).json({
        status: 'success',
        data: { records: [] },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AttendanceController;
