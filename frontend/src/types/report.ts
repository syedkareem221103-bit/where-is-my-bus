export type ReportType = 'FLEET_UTILIZATION' | 'ATTENDANCE_SUMMARY';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ReportFormat = 'CSV' | 'JSON';
export type ReportStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface ReportSubscription {
  id: string;
  organizationId: string;
  creatorId: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  format: ReportFormat;
  targetEmails: string[];
  isActive: boolean;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExecution {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  status: ReportStatus;
  errorMessage?: string;
  fileSize?: number;
  tokenHash?: string;
  tokenExpiresAt?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  subscription?: ReportSubscription;
}

export interface CreateReportSubscriptionDTO {
  reportType: ReportType;
  frequency: ReportFrequency;
  format: ReportFormat;
  targetEmails: string[];
}

export interface OnDemandExportDTO {
  reportType: ReportType;
  format: ReportFormat;
}
