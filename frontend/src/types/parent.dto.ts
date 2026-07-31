import type { UserResponse } from './user.dto';

export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface StudentResponse {
  id: string;
  organizationId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  grade?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ParentChildResponse {
  id: string;
  organizationId: string;
  parentId: string;
  studentId: string;
  relationshipType: string;
  createdAt: string;
  student?: StudentResponse;
  parent?: UserResponse;
}

export interface CreateStudentRequest {
  studentNumber: string;
  firstName: string;
  lastName: string;
  grade?: string;
}

export interface UpdateStudentRequest {
  studentNumber?: string;
  firstName?: string;
  lastName?: string;
  grade?: string;
  status?: StudentStatus;
}
