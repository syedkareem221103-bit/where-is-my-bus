import { IEmailProvider, ISmsProvider, IPushProvider, IInAppProvider } from './channel.provider.interfaces';
import logger from '../../../utils/logger';

export class MockEmailProvider implements IEmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    logger.info(`[MockEmail] Sending email to ${to} | Subject: ${subject}`);
    return true;
  }
}

export class MockSmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    logger.info(`[MockSms] Sending SMS to ${to} | Message: ${message}`);
    return true;
  }
}

export class MockPushProvider implements IPushProvider {
  async sendPush(token: string, title: string, body: string, data?: any): Promise<boolean> {
    logger.info(`[MockPush] Sending Push to ${token} | Title: ${title}`);
    return true;
  }
}

export class MockInAppProvider implements IInAppProvider {
  async sendInApp(userId: string, payload: any): Promise<boolean> {
    logger.info(`[MockInApp] Sending InApp to user ${userId}`);
    return true;
  }
}
