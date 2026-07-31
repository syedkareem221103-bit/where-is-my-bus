import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { TripResponse, CreateTripRequest, UpdateTripStatusRequest, TripPingResponse } from '@/types/trip.dto';

export const tripService = {
  list: async (page = 1, limit = 10, status?: string): Promise<PaginatedResponse<TripResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<TripResponse> }>('/api/v1/trips', {
      params: { page, limit, status }
    });
    return data.data;
  },

  getById: async (id: string): Promise<TripResponse> => {
    const { data } = await apiClient.get<{ data: TripResponse }>(`/api/v1/trips/${id}`);
    return data.data;
  },

  create: async (payload: CreateTripRequest): Promise<TripResponse> => {
    const { data } = await apiClient.post<{ data: TripResponse }>('/api/v1/trips', payload);
    return data.data;
  },

  updateStatus: async (id: string, payload: UpdateTripStatusRequest): Promise<TripResponse> => {
    const { data } = await apiClient.put<{ data: TripResponse }>(`/api/v1/trips/${id}/status`, payload);
    return data.data;
  },

  getPings: async (id: string): Promise<TripPingResponse[]> => {
    const { data } = await apiClient.get<{ data: TripPingResponse[] }>(`/api/v1/trips/${id}/pings`);
    return data.data;
  },

  // Driver specific
  getMyActiveTrip: async (): Promise<TripResponse | null> => {
    try {
      const { data } = await apiClient.get<{ data: TripResponse }>('/api/v1/trips/my-active');
      return data.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) return null;
      throw error;
    }
  },
};
