import prisma from '../../../config/database';
import { Emergency, EmergencyStatus, Prisma } from '@prisma/client';

export class EmergencyRepository {
  async createWithHistory(
    emergencyData: Prisma.EmergencyUncheckedCreateInput,
    actorId: string,
    reason?: string
  ): Promise<Emergency> {
    return prisma.$transaction(async (tx) => {
      const emergency = await tx.emergency.create({
        data: emergencyData
      });

      await tx.emergencyHistory.create({
        data: {
          organizationId: emergency.organizationId,
          emergencyId: emergency.id,
          actorId,
          newState: emergency.status,
          eventType: 'STATE_TRANSITION',
          metadata: reason ? { reason } : {}
        }
      });

      return emergency;
    });
  }

  async transitionState(
    id: string,
    expectedVersion: number,
    newState: EmergencyStatus,
    actorId: string,
    reason?: string
  ): Promise<Emergency> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.emergency.findUnique({ where: { id } });
      if (!current) throw new Error('Emergency not found');

      // Throws RecordNotFound if version mismatches
      const updated = await tx.emergency.update({
        where: { id, version: expectedVersion },
        data: {
          status: newState,
          version: { increment: 1 }
        }
      });

      await tx.emergencyHistory.create({
        data: {
          organizationId: updated.organizationId,
          emergencyId: updated.id,
          actorId,
          previousState: current.status,
          newState: updated.status,
          eventType: 'STATE_TRANSITION',
          metadata: reason ? { reason } : {}
        }
      });

      return updated;
    });
  }

  async findActiveByTripId(tripId: string): Promise<Emergency | null> {
    return prisma.emergency.findFirst({
      where: {
        tripId,
        status: { in: [EmergencyStatus.ACTIVE, EmergencyStatus.ACKNOWLEDGED, EmergencyStatus.RESPONDING] }
      }
    });
  }

  async findById(id: string): Promise<Emergency | null> {
    return prisma.emergency.findUnique({
      where: { id },
      include: {
        tripPing: true
      }
    });
  }
}
