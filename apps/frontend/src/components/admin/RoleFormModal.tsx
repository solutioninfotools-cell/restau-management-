import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { roleSchema, RoleFormValues } from '@/schemas';
import { useCreateRole, useUpdateRole, usePermissions } from '@/hooks/useRoles';
import type { Permission, Role } from '@/types';

export function RoleFormModal({
  isOpen,
  onClose,
  role,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}) {
  const { data: permissions, isLoading: loadingPermissions } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', permissionIds: [] },
  });

  // Permissions groupées par module (ressource) pour la checklist
  const groups = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    (permissions ?? []).forEach((perm) => {
      (map[perm.resource] ??= []).push(perm);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? '',
        permissionIds: role.permissions?.map((rp) => rp.permission.id) ?? [],
      });
    } else {
      reset({ name: '', description: '', permissionIds: [] });
    }
  }, [role, reset, isOpen]);

  const onSubmit = (values: RoleFormValues) => {
    if (role) {
      updateRole.mutate({ id: role.id, values }, { onSuccess: () => { reset(); onClose(); } });
    } else {
      createRole.mutate(values, { onSuccess: () => { reset(); onClose(); } });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={role ? 'Modifier le rôle' : 'Nouveau rôle'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nom du rôle *" error={errors.name?.message} {...register('name')} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            {...register('description')}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
          {loadingPermissions ? (
            <p className="text-sm text-slate-400">Chargement des permissions...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groups.map(([resource, perms]) => (
                <div key={resource} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{resource}</p>
                  <div className="flex flex-col gap-1.5">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm capitalize">
                        <input type="checkbox" value={perm.id} {...register('permissionIds')} className="rounded" />
                        <span>{perm.action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" loading={createRole.isPending || updateRole.isPending} className="mt-2 w-full">
          {role ? 'Mettre à jour le rôle' : 'Créer le rôle'}
        </Button>
      </form>
    </Modal>
  );
}
