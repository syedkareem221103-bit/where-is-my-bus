export interface IEmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

export interface IPushProvider {
  sendPush(token: string, title: string, body: string, data?: any): Promise<boolean>;
}

export interface IInAppProvider {
  sendInApp(userId: string, payload: any): Promise<boolean>;
}
