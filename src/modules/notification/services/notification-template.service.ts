import { NotificationTemplateRepository } from '../repositories/notification-template.repository';

export class NotificationTemplateService {
  private repo: NotificationTemplateRepository;

  constructor(repo?: NotificationTemplateRepository) {
    this.repo = repo || new NotificationTemplateRepository();
  }

  async compile(
    organizationId: string, 
    eventKey: string, 
    channel: string, 
    language: string, 
    payload: Record<string, any>
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.repo.getTemplate(organizationId, eventKey, channel, language);

    if (!template) {
      // Fallback simple rendering if no template exists
      return {
        subject: `Notification: ${eventKey}`,
        body: `Event ${eventKey} occurred. Data: ${JSON.stringify(payload)}`
      };
    }

    const compiledSubject = template.subject ? this.replacePlaceholders(template.subject, payload) : undefined;
    const compiledBody = this.replacePlaceholders(template.body, payload);

    return { subject: compiledSubject, body: compiledBody };
  }

  private replacePlaceholders(text: string, payload: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return payload[trimmedKey] !== undefined ? String(payload[trimmedKey]) : match;
    });
  }
}
