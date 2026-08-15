import prisma from '../../config/database';
import { User, DriverLicense, Prisma, UserRole, UserStatus } from '@prisma/client';

export type DriverWithLicense = User & { driverLicense: DriverLicense | null };

export class DriverRepository {
  async createDriverWithLicense(
    userData: Omit<Prisma.UserCreateInput, 'role'>,
    licenseData: { licenseNumber: string; expiryDate: Date; licenseClass: string },
    txClient?: Prisma.TransactionClient
  ): Promise<DriverWithLicense> {
    const execute = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          role: UserRole.DRIVER,
        },
      });

      const license = await tx.driverLicense.create({
        data: {
          licenseNumber: licenseData.licenseNumber,
          expiryDate: licenseData.expiryDate,
          licenseClass: licenseData.licenseClass,
          user: { connect: { id: user.id } },
          organization: { connect: { organizationId: user.organizationId } },
        },
      });

      return { ...user, driverLicense: license };
    };

    return txClient ? execute(txClient) : prisma.$transaction(execute);
  }

  async findById(id: string, organizationId: string, tx?: Prisma.TransactionClient): Promise<DriverWithLicense | null> {
    const db = tx || prisma;
    return db.user.findFirst({
      where: {
        id,
        organizationId,
        role: UserRole.DRIVER,
      },
      include: {
        driverLicense: true,
      },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { email },
    });
  }

  async findByLicenseNumber(licenseNumber: string, tx?: Prisma.TransactionClient): Promise<DriverLicense | null> {
    const db = tx || prisma;
    return db.driverLicense.findUnique({
      where: { licenseNumber },
    });
  }

  async findAll(
    organizationId: string,
    skip: number,
    take: number,
    status?: UserStatus,
    search?: string
  ): Promise<{ data: DriverWithLicense[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      organizationId,
      role: UserRole.DRIVER,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { driverLicense: { licenseNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { driverLicense: true },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async updateDriverWithLicense(
    id: string,
    organizationId: string,
    userData: Prisma.UserUpdateInput,
    licenseData?: Prisma.DriverLicenseUpdateInput,
    txClient?: Prisma.TransactionClient
  ): Promise<DriverWithLicense> {
    const execute = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.update({
        where: {
          id_organizationId: { id, organizationId },
        },
        data: userData,
      });

      let license: DriverLicense | null = null;
      if (licenseData && Object.keys(licenseData).length > 0) {
        license = await tx.driverLicense.upsert({
          where: { userId: id },
          create: {
            licenseNumber: (licenseData.licenseNumber as string) || '',
            expiryDate: (licenseData.expiryDate as Date) || new Date(),
            licenseClass: (licenseData.licenseClass as string) || '',
            user: { connect: { id } },
            organization: { connect: { organizationId } },
          },
          update: licenseData,
        });
      } else {
        license = await tx.driverLicense.findUnique({ where: { userId: id } });
      }

      return { ...user, driverLicense: license };
    };

    return txClient ? execute(txClient) : prisma.$transaction(execute);
  }
}

export const driverRepository = new DriverRepository();
export default driverRepository;
