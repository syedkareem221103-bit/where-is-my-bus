import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import type { LogAttendanceRequest, BulkLogAttendanceRequest } from '@/types/attendance.dto';
import { useToast } from '@/hooks/use-toast';

export const attendanceKeys = {
  all: ['attendance'] as const,
  byTrip: (tripId: string) => [...attendanceKeys.all, 'trip', tripId] as const,
  byStudent: (studentId: string, page?: number, limit?: number) => [...attendanceKeys.all, 'student', studentId, { page, limit }] as const,
};

export function useAttendanceByTrip(tripId: string) {
  return useQuery({
    queryKey: attendanceKeys.byTrip(tripId),
    queryFn: () => attendanceService.listByTrip(tripId),
    enabled: !!tripId,
    staleTime: 0, // Highly dynamic during an active trip
  });
}

export function useAttendanceByStudent(studentId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: attendanceKeys.byStudent(studentId, page, limit),
    queryFn: () => attendanceService.listByStudent(studentId, page, limit),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: LogAttendanceRequest) => attendanceService.logAttendance(payload),
    onSuccess: (data, variables) => { void data; void variables;
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      toast({ title: 'Success', description: 'Attendance logged successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to log attendance.' });
    },
  });
}

export function useBulkLogAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: BulkLogAttendanceRequest) => attendanceService.bulkLogAttendance(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      toast({ title: 'Success', description: `Logged attendance for ${data.updatedCount} students.` });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to bulk log attendance.' });
    },
  });
}
