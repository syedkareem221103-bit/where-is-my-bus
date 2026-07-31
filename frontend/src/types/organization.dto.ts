export type OrgType = 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'OTHER';
export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type AttendPolicy = 'AUTO_PRESENT' | 'AUTO_ABSENT';

export interface OrganizationResponse {
  id: string;
  organizationId: string;
  name: string;
  type: OrgType;
  timezone: string;
  attendancePolicy: AttendPolicy;
  routeSettings: Record<string, unknown>;
  notifySettings: Record<string, unknown>;
  operatingSchedule: Record<string, unknown>;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  type: OrgType;
  timezone?: string;
  attendancePolicy?: AttendPolicy;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: OrgType;
  timezone?: string;
  attendancePolicy?: AttendPolicy;
  status?: OrgStatus;
}
