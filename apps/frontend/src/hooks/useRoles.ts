import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Permission, Role } from '@/types';
import type { RoleFormValues } from '@/schemas';
import toast from 'react-hot-toast';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get<Role[]>('/roles');
      return data;
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Permission[]>('/roles/permissions/all');
      return data;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const { data } = await apiClient.post('/roles', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle créé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la création du rôle'),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<RoleFormValues> }) => {
      const { data } = await apiClient.put(`/roles/${id}`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la mise à jour du rôle'),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/roles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle supprimé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la suppression du rôle'),
  });
}
