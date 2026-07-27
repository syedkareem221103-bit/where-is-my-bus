import { ScheduleRepository } from './schedule.repository';
import { NotFoundError } from '../../errors';

export class ScheduleService {
  private scheduleRepository = new ScheduleRepository();

  async createSchedule(
    organizationId: string,
    data: {
      routeId: string;
      name: string;
      cutoffTime: string;
      operatingDays: number[];
    }
  ) {
    return this.scheduleRepository.create({
      routeId: data.routeId,
      name: data.name,
      cutoffTime: data.cutoffTime,
      operatingDays: data.operatingDays,
      organizationId,
      isActive: true,
    });
  }

  async getSchedules(organizationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const take = limit;

    const [schedules, total] = await Promise.all([
      this.scheduleRepository.findAllByOrg(organizationId, skip, take),
      this.scheduleRepository.countByOrg(organizationId),
    ]);

    return {
      schedules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getScheduleById(organizationId: string, id: string) {
    const schedule = await this.scheduleRepository.findByIdAndOrg(id, organizationId);
    if (!schedule) {
      throw new NotFoundError('Schedule not found in your organization');
    }
    return schedule;
  }

  async updateSchedule(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      cutoffTime?: string;
      operatingDays?: number[];
      isActive?: boolean;
    }
  ) {
    await this.getScheduleById(organizationId, id);
    return this.scheduleRepository.update(id, organizationId, data);
  }

  async deleteSchedule(organizationId: string, id: string) {
    await this.getScheduleById(organizationId, id);
    await this.scheduleRepository.delete(id, organizationId);
  }
}

export default ScheduleService;
