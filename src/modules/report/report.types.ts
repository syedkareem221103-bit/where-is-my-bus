import { z } from 'zod';

export const ReportTypeSchema = z.enum(['FLEET_UTILIZATION', 'ATTENDANCE_SUMMARY']);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const ReportFrequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type ReportFrequency = z.infer<typeof ReportFrequencySchema>;

export const ReportFormatSchema = z.enum(['CSV', 'JSON']);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const CreateReportSubscriptionSchema = z.object({
  reportType: ReportTypeSchema,
  frequency: ReportFrequencySchema,
  format: ReportFormatSchema,
  targetEmails: z.array(z.string().email()).min(1, 'At least one target email is required'),
});

export type CreateReportSubscriptionDTO = z.infer<typeof CreateReportSubscriptionSchema>;

export const OnDemandExportSchema = z.object({
  reportType: ReportTypeSchema,
  format: ReportFormatSchema,
});

export type OnDemandExportDTO = z.infer<typeof OnDemandExportSchema>;
