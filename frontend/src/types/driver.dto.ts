import type { UserResponse } from './user.dto';

export interface DriverLicenseResponse {
  id: string;
  organizationId: string;
  userId: string;
  licenseNumber: string;
  expiryDate: string;
  licenseClass: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverResponse extends UserResponse {
  driverLicense?: DriverLicenseResponse;
}

export interface CreateDriverRequest {
  email: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  expiryDate: string;
  licenseClass: string;
}

export interface UpdateDriverRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  licenseNumber?: string;
  expiryDate?: string;
  licenseClass?: string;
}
