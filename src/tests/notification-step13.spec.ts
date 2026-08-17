import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import { randomUUID } from 'crypto';
import { RedisQueueProvider } from '../modules/notification/providers/redis-queue.provider';
import { NotificationDispatcher } from '../modules/notification/services/notification-dispatcher';
import { NotificationService } from '../modules/notification/services/notification.service';
import { NotificationRepository } from '../modules/notification/repositories/notification.repository';
import { NotificationPreferenceService } from '../modules/notification/services/notification-preference.service';
import { NotificationPreferenceRepository } from '../modules/notification/repositories/notification-preference.repository';
import { NotificationTemplateRepository } from '../modules/notification/repositories/notification-template.repository';
import { NotificationTemplateService } from '../modules/notification/services/notification-template.service';
import { MockEmailProvider, MockPushProvider, MockSmsProvider, MockInAppProvider } from '../modules/notification/providers/mock-channel.provider';

describe('Notification Module (Milestone 2 - Step 13)', () => {
  let queueProvider: RedisQueueProvider;
  let dispatcher: NotificationDispatcher;
  let notificationService: NotificationService;
  let emailProvider: MockEmailProvider;
  
  const ORG_ID = randomUUID();
  const USER_ID = randomUUID();

  beforeAll(async () => {
    // 1. Setup Prisma data
    await prisma.organization.create({
      data: {
        id: ORG_ID,
        organizationId: ORG_ID,
        name: 'Notification E2E Org',
        type: 'SCHOOL',
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {}
      }
    });

    const uniqueEmail = `notify-${randomUUID()}@example.com`;
    await prisma.user.create({
      data: {
        id: USER_ID,
        organizationId: ORG_ID,
        email: uniqueEmail,
        role: 'ORG_ADMIN',
        firstName: 'Notify',
        lastName: 'Test',
        passwordHash: 'dummy'
      }
    });

    await prisma.userNotificationPreference.create({
      data: {
        organizationId: ORG_ID,
        userId: USER_ID,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        emergencyOverride: true,
        language: 'en'
      }
    });

    // Initialize module independently for testing
    queueProvider = new RedisQueueProvider();
    emailProvider = new MockEmailProvider();
    
    const notifRepo = new NotificationRepository();
    const prefRepo = new NotificationPreferenceRepository();
    const prefService = new NotificationPreferenceService(prefRepo);
    
    notificationService = new NotificationService(notifRepo, prefService, queueProvider);
    
    dispatcher = new NotificationDispatcher(
      queueProvider,
      new NotificationTemplateService(new NotificationTemplateRepository()),
      notifRepo,
      emailProvider,
      new MockSmsProvider(),
      new MockPushProvider(),
      new MockInAppProvider()
    );

    dispatcher.startWorkers();
  });

  afterAll(async () => {
    if (queueProvider) await queueProvider.shutdown();
    await prisma.notificationRecipient.deleteMany({ where: { userId: USER_ID } });
    await prisma.notification.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.userNotificationPreference.deleteMany({ where: { userId: USER_ID } });
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.organization.deleteMany({ where: { id: ORG_ID } });
    await prisma.$disconnect();
  });

  describe('Transaction Atomicity', () => {
    it('should rollback notification if recipient creation fails', async () => {
      // We will spy on createRecipients and throw an error inside the repository transaction
      const notifRepo = new NotificationRepository();
      
      const originalCreate = notifRepo.createNotificationWithRecipients.bind(notifRepo);
      
      jest.spyOn(notifRepo, 'createNotificationWithRecipients').mockImplementationOnce(async (n, r) => {
        return prisma.$transaction(async (tx) => {
          await tx.notification.create({ data: n });
          // Force a crash
          throw new Error('Simulated DB Crash');
        });
      });

      const tempService = new NotificationService(notifRepo, new NotificationPreferenceService(new NotificationPreferenceRepository()), queueProvider);
      
      await expect(tempService.dispatch(ORG_ID, 'test.event', 'HIGH', {}, [USER_ID])).rejects.toThrow('Simulated DB Crash');

      // Verify no orphaned notification exists
      const count = await prisma.notification.count({ where: { eventKey: 'test.event' } });
      expect(count).toBe(0);
    });
  });

  describe('Queue Behavior, Tenant Context and Retries', () => {
    it('should enqueue and successfully process preserving tenant context', async () => {
      let resolveEmail: (val: unknown) => void;
      const emailPromise = new Promise(r => resolveEmail = r);
      
      const dispatchSpy = jest.spyOn(emailProvider, 'sendEmail').mockImplementation(async () => {
        resolveEmail(true);
        return true;
      });
      
      await notificationService.dispatch(ORG_ID, 'test.event.success', 'HIGH', { userEmail: 'notify@example.com' }, [USER_ID]);
      
      await emailPromise; // Wait for the worker to process the job
      
      expect(dispatchSpy).toHaveBeenCalled();
      
      const notifs = await prisma.notification.findFirst({
        where: { 
          eventKey: 'test.event.success',
          organizationId: ORG_ID
        },
        include: { recipients: true }
      });

      expect(notifs).not.toBeNull();
      expect(notifs!.organizationId).toBe(ORG_ID); // tenant isolation
      
      const emailRecipient = notifs!.recipients.find(r => r.channel === 'EMAIL');
      expect(emailRecipient).toBeDefined();
      expect(emailRecipient!.userId).toBe(USER_ID);
      // Wait for DB update to complete
      await new Promise(r => setTimeout(r, 1000));
      
      const updatedNotifs = await prisma.notification.findFirst({
        where: { 
          eventKey: 'test.event.success',
          organizationId: ORG_ID
        },
        include: { recipients: true }
      });
      const updatedEmailRecipient = updatedNotifs!.recipients.find(r => r.channel === 'EMAIL');
      expect(updatedEmailRecipient!.status).toBe('SENT');
      
      dispatchSpy.mockRestore();
    });

    it('should retry on failure and eventually exhaust retries', async () => {
      let failureCount = 0;
      let resolveFailures: (val: unknown) => void;
      const failurePromise = new Promise(r => resolveFailures = r);

      const dispatchSpy = jest.spyOn(emailProvider, 'sendEmail').mockImplementation(async () => {
        failureCount++;
        if (failureCount >= 3) {
          resolveFailures(true);
        }
        throw new Error('Transient Error');
      });
      
      await notificationService.dispatch(ORG_ID, 'test.event.fail', 'LOW', { userEmail: 'fail@example.com' }, [USER_ID]);
      
      await failurePromise; // wait until 3 retries are hit
      await new Promise(r => setTimeout(r, 200)); // allow final DB update
      
      expect(dispatchSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
      
      const notifs = await prisma.notification.findFirst({
        where: { 
          eventKey: 'test.event.fail',
          organizationId: ORG_ID
        },
        include: { recipients: true }
      });

      const emailRecipient = notifs!.recipients.find(r => r.channel === 'EMAIL');
      expect(emailRecipient!.status).toBe('FAILED');
      expect(emailRecipient!.errorMessage).toContain('Transient Error');
      
      dispatchSpy.mockRestore();
    }, 10000);
  });
});
