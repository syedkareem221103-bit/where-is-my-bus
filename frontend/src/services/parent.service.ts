import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { StudentResponse, CreateStudentRequest, UpdateStudentRequest, ParentChildResponse } from '@/types/parent.dto';

export const parentService = {
  // Students
  listStudents: async (page = 1, limit = 10): Promise<PaginatedResponse<StudentResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<StudentResponse> }>('/api/v1/students', {
      params: { page, limit }
    });
    return data.data;
  },

  getStudentById: async (id: string): Promise<StudentResponse> => {
    const { data } = await apiClient.get<{ data: StudentResponse }>(`/api/v1/students/${id}`);
    return data.data;
  },

  createStudent: async (payload: CreateStudentRequest): Promise<StudentResponse> => {
    const { data } = await apiClient.post<{ data: StudentResponse }>('/api/v1/students', payload);
    return data.data;
  },

  updateStudent: async (id: string, payload: UpdateStudentRequest): Promise<StudentResponse> => {
    const { data } = await apiClient.put<{ data: StudentResponse }>(`/api/v1/students/${id}`, payload);
    return data.data;
  },

  deleteStudent: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/students/${id}`);
  },

  // Parents
  listMyChildren: async (): Promise<ParentChildResponse[]> => {
    const { data } = await apiClient.get<{ data: ParentChildResponse[] }>('/api/v1/parents/my-children');
    return data.data;
  }
};
