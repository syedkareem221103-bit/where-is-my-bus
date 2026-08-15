import prisma from '../../config/database';
import { Student, Prisma, StudentStatus } from '@prisma/client';

export class StudentRepository {
  async create(data: Prisma.StudentCreateInput, tx?: Prisma.TransactionClient): Promise<Student> {
    const client = tx || prisma;
    return client.student.create({
      data,
      include: {
        parentChildren: { include: { parent: true } },
        stopAssignments: { include: { stop: true } },
      },
    });
  }

  async findById(id: string, organizationId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx || prisma;
    return client.student.findUnique({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      include: {
        parentChildren: { include: { parent: true } },
        stopAssignments: { include: { stop: true } },
      },
    });
  }

  async findByStudentNumber(studentNumber: string, organizationId: string, tx?: Prisma.TransactionClient): Promise<Student | null> {
    const client = tx || prisma;
    return client.student.findUnique({
      where: {
        organizationId_studentNumber: {
          organizationId,
          studentNumber,
        },
      },
    });
  }

  async findAll(
    organizationId: string,
    skip: number,
    take: number,
    status?: StudentStatus,
    search?: string
  ): Promise<{ data: any[]; total: number }> {
    const where: Prisma.StudentWhereInput = { organizationId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { studentNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { grade: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          parentChildren: { include: { parent: true } },
          stopAssignments: { include: { stop: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, organizationId: string, data: Prisma.StudentUpdateInput, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || prisma;
    return client.student.update({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      data,
      include: {
        parentChildren: { include: { parent: true } },
        stopAssignments: { include: { stop: true } },
      },
    });
  }

  async linkParent(studentId: string, parentId: string, organizationId: string, relationshipType = 'PARENT', tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || prisma;
    return client.parentChild.upsert({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      create: {
        organization: { connect: { organizationId } },
        parent: { connect: { id_organizationId: { id: parentId, organizationId } } },
        student: { connect: { id_organizationId: { id: studentId, organizationId } } },
        relationshipType,
      },
      update: {
        relationshipType,
      },
    });
  }

  async assignStop(studentId: string, stopId: string, organizationId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || prisma;
    return client.studentStop.upsert({
      where: {
        studentId_stopId: {
          studentId,
          stopId,
        },
      },
      create: {
        organization: { connect: { organizationId } },
        student: { connect: { id_organizationId: { id: studentId, organizationId } } },
        stop: { connect: { id_organizationId: { id: stopId, organizationId } } },
      },
      update: {},
    });
  }
}

export const studentRepository = new StudentRepository();
export default studentRepository;
