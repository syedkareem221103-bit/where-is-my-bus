import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parentService } from '@/services/parent.service';
import type { CreateStudentRequest, UpdateStudentRequest } from '@/types/parent.dto';
import { useToast } from '@/hooks/use-toast';

export const parentKeys = {
  all: ['parents'] as const,
  studentsList: () => [...parentKeys.all, 'studentsList'] as const,
  studentList: (page?: number, limit?: number) => [...parentKeys.studentsList(), { page, limit }] as const,
  studentDetails: () => [...parentKeys.all, 'studentDetail'] as const,
  studentDetail: (id: string) => [...parentKeys.studentDetails(), id] as const,
  myChildren: () => [...parentKeys.all, 'myChildren'] as const,
};

export function useStudents(page = 1, limit = 10) {
  return useQuery({
    queryKey: parentKeys.studentList(page, limit),
    queryFn: () => parentService.listStudents(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: parentKeys.studentDetail(id),
    queryFn: () => parentService.getStudentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyChildren() {
  return useQuery({
    queryKey: parentKeys.myChildren(),
    queryFn: () => parentService.listMyChildren(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateStudentRequest) => parentService.createStudent(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: parentKeys.studentsList() });
      toast({ title: 'Success', description: 'Student created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create student.' });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStudentRequest }) => parentService.updateStudent(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: parentKeys.studentsList() });
      queryClient.invalidateQueries({ queryKey: parentKeys.studentDetail(variables.id) });
      toast({ title: 'Success', description: 'Student updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update student.' });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => parentService.deleteStudent(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: parentKeys.studentsList() });
      toast({ title: 'Success', description: 'Student deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete student.' });
    },
  });
}
