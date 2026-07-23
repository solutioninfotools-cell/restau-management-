import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types';
import toast from 'react-hot-toast';

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  roles: { role: { id: string; name: string } }[];
}

export interface UserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  roleIds?: string[];
}

export function useUsers(search?: string) {
  return useQuery({
    queryKey: ['users', search ?? ''],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ApiUser>>('/users', {
        params: { search: search || undefined, limit: 100 },
      });
      return data.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: UserPayload) => {
      const { data } = await apiClient.post('/users', values);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur créé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la création'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UserPayload }) => {
      const { data } = await apiClient.put(`/users/${id}`, values);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur mis à jour'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la mise à jour'),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/users/${id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la suppression'),
  });
}

export function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/users/${id}/toggle`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}
