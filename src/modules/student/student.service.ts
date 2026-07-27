import { studentRepository } from './student.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, StudentStatus, UserRole } from '@prisma/client';

export class StudentService {
  async createStudent(data: any, actorId: string, actorRole: UserRole, organizationId: string) {
    const existing = await studentRepository.findByStudentNumber(data.studentNumber, organizationId);
    if (existing) {
      throw new ConflictError(`Student with admission number '${data.studentNumber}' already exists in your organization`);
    }

    const student = await studentRepository.create({
      studentNumber: data.studentNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      grade: data.grade,
      status: data.status || StudentStatus.ACTIVE,
      organization: { connect: { organizationId } },
    });

    if (data.parentId) {
      await studentRepository.linkParent(student.id, data.parentId, organizationId, data.relationshipType);
    }

    if (data.stopId) {
      await studentRepository.assignStop(student.id, data.stopId, organizationId);
    }

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'STUDENT_CREATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { studentId: student.id, studentNumber: student.studentNumber, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    if (data.stopId) {
      await prisma.auditLog.create({
        data: {
          action: 'STUDENT_ASSIGNED_ROUTE',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { studentId: student.id, stopId: data.stopId, targetOrganizationId: organizationId },
          ipAddress: '0.0.0.0',
        },
      });
    }

    return this.getStudent(student.id, organizationId);
  }

  async getStudents(organizationId: string, page: number, limit: number, status?: StudentStatus, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await studentRepository.findAll(organizationId, skip, limit, status, search);

    return {
      students: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudent(id: string, organizationId: string) {
    const student = await studentRepository.findById(id, organizationId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }
    return student;
  }

  async updateStudent(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole) {
    const student = await this.getStudent(id, organizationId);

    // OPERATOR role restricted to status & assignments updates only
    if (actorRole === 'OPERATOR') {
      if (data.studentNumber || data.firstName || data.lastName || data.grade) {
        throw new ForbiddenError('OPERATOR is only permitted to update student status and assignments');
      }
    }

    // Duplicate studentNumber check if modifying
    if (data.studentNumber && data.studentNumber !== student.studentNumber) {
      const existing = await studentRepository.findByStudentNumber(data.studentNumber, organizationId);
      if (existing) {
        throw new ConflictError(`Student with admission number '${data.studentNumber}' already exists in your organization`);
      }
    }

    const updateData: Prisma.StudentUpdateInput = {
      ...(data.studentNumber && { studentNumber: data.studentNumber }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.grade !== undefined && { grade: data.grade }),
      ...(data.status && { status: data.status }),
    };

    let updated = student;
    if (Object.keys(updateData).length > 0) {
      updated = await studentRepository.update(id, organizationId, updateData);
    }

    if (data.parentId) {
      await studentRepository.linkParent(id, data.parentId, organizationId, data.relationshipType);
    }

    if (data.stopId) {
      await studentRepository.assignStop(id, data.stopId, organizationId);
    }

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    if (data.status && data.status !== student.status) {
      await prisma.auditLog.create({
        data: {
          action: 'STUDENT_STATUS_CHANGED',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { studentId: id, oldStatus: student.status, newStatus: data.status, targetOrganizationId: organizationId },
          ipAddress: '0.0.0.0',
        },
      });
    }

    if (data.stopId) {
      await prisma.auditLog.create({
        data: {
          action: 'STUDENT_ASSIGNED_ROUTE',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { studentId: id, stopId: data.stopId, targetOrganizationId: organizationId },
          ipAddress: '0.0.0.0',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'STUDENT_UPDATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { studentId: id, targetOrganizationId: organizationId, updates: Object.keys(data) },
        ipAddress: '0.0.0.0',
      },
    });

    return this.getStudent(id, organizationId);
  }

  async deleteStudent(id: string, organizationId: string, actorId: string, actorRole: UserRole) {
    const student = await this.getStudent(id, organizationId);

    const deleted = await studentRepository.update(id, organizationId, { status: StudentStatus.INACTIVE });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'STUDENT_DELETED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { studentId: id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return deleted;
  }
}

export const studentService = new StudentService();
export default studentService;
