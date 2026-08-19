import { AuditService } from '../audit/audit.service';
import { studentRepository } from './student.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, StudentStatus, UserRole } from '@prisma/client';

export class StudentService {
  async createStudent(data: any, actorId: string, actorRole: UserRole, organizationId: string, ipAddress: string) {
    const existing = await studentRepository.findByStudentNumber(data.studentNumber, organizationId);
    if (existing) {
      throw new ConflictError(`Student with admission number '${data.studentNumber}' already exists in your organization`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const student = await studentRepository.create({
        studentNumber: data.studentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        status: data.status || StudentStatus.ACTIVE,
        organization: { connect: { organizationId } },
      }, tx);

      if (data.parentId) {
        await studentRepository.linkParent(student.id, data.parentId, organizationId, data.relationshipType, tx);
      }

      if (data.stopId) {
        await studentRepository.assignStop(student.id, data.stopId, organizationId, tx);
      }

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_CREATED',
        metadata: { studentId: student.id, studentNumber: student.studentNumber, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);

      if (data.stopId) {
        await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_ASSIGNED_ROUTE',
        metadata: { studentId: student.id, stopId: data.stopId, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);
      }

      return student;
    });

    return this.getStudent(result.id, organizationId);
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

  async updateStudent(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole, ipAddress: string) {
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

    await prisma.$transaction(async (tx) => {
      let updated = student;
      if (Object.keys(updateData).length > 0) {
        updated = await studentRepository.update(id, organizationId, updateData, tx);
      }

      if (data.parentId) {
        await studentRepository.linkParent(id, data.parentId, organizationId, data.relationshipType, tx);
      }

      if (data.stopId) {
        await studentRepository.assignStop(id, data.stopId, organizationId, tx);
      }

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      if (data.status && data.status !== student.status) {
        await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_STATUS_CHANGED',
        metadata: { studentId: id, oldStatus: student.status, newStatus: data.status, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);
      }

      if (data.stopId) {
        await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_ASSIGNED_ROUTE',
        metadata: { studentId: id, stopId: data.stopId, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);
      }

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_UPDATED',
        metadata: { studentId: id, targetOrganizationId: organizationId, updates: Object.keys(data) },
        ipAddress: ipAddress
      }, tx);
    });

    return this.getStudent(id, organizationId);
  }

  async deleteStudent(id: string, organizationId: string, actorId: string, actorRole: UserRole, ipAddress: string) {
    const student = await this.getStudent(id, organizationId);

    const deleted = await prisma.$transaction(async (tx) => {
      const deletedStudent = await studentRepository.update(id, organizationId, { status: StudentStatus.INACTIVE }, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'STUDENT_DELETED',
        metadata: { studentId: id, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);

      return deletedStudent;
    });

    return deleted;
  }
}

export const studentService = new StudentService();
export default studentService;
