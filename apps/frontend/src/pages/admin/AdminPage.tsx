import { useEffect, useState } from 'react';
import { Plus, Power, Shield, Search, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, Card } from '@/components/ui/Badge';
import { RoleFormModal } from '@/components/admin/RoleFormModal';
import { useRoles, useDeleteRole } from '@/hooks/useRoles';
import { userSchema, UserFormValues } from '@/schemas';
import type { Role } from '@/types';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ── Hooks ─────────────────────────────────────────────────────
function useUsers(search?: string) {
  return useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', { params: { search, limit: 50 } });
      return data.data as any[];
    },
  });
}

function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/audit-logs', { params: { limit: 50 } });
      return data.data as any[];
    },
  });
}

function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: UserFormValues) => {
      const { data } = await apiClient.post('/users', values);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur créé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UserFormValues }) => {
      const { data } = await apiClient.put(`/users/${id}`, values);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur mis à jour'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/users/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
}

// ── User form modal (création + édition) ──────────────────────
function UserFormModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: any | null }) {
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { fullName: '', email: '', password: '', roleIds: [] },
  });

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName,
        email: user.email,
        password: '',
        roleIds: user.roles?.map((ur: any) => ur.role.id) ?? [],
      });
    } else {
      reset({ fullName: '', email: '', password: '', roleIds: [] });
    }
  }, [user, reset, isOpen]);

  const onSubmit = (values: UserFormValues) => {
    if (user) {
      // Mot de passe laissé vide en édition = inchangé, on ne l'envoie pas.
      const { password, ...rest } = values;
      const payload = password ? values : rest;
      updateUser.mutate({ id: user.id, values: payload }, { onSuccess: () => { reset(); onClose(); } });
    } else {
      createUser.mutate(values, { onSuccess: () => { reset(); onClose(); } });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nom complet *" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label={user ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
          type="password"
          error={errors.password?.message}
          {...register('password', user ? { setValueAs: (v) => (v === '' ? undefined : v) } : {})}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Rôles</p>
          <div className="flex flex-col gap-2">
            {roles?.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={role.id} {...register('roleIds')} className="rounded" />
                <span className="font-medium">{role.name}</span>
                {role.description && <span className="text-slate-400">— {role.description}</span>}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" loading={createUser.isPending || updateUser.isPending} className="mt-2 w-full">
          {user ? 'Mettre à jour' : 'Créer l\'utilisateur'}
        </Button>
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [search, setSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data: users, isLoading: loadingUsers } = useUsers(search || undefined);
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: auditLogs, isLoading: loadingAudit } = useAuditLogs();
  const toggleUser = useToggleUser();
  const deleteRole = useDeleteRole();

  const filteredRoles = roles?.filter((role) => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      role.name.toLowerCase().includes(q) ||
      (role.description ?? '').toLowerCase().includes(q)
    );
  });

  const openCreateUser = () => { setEditingUser(null); setShowForm(true); };
  const openEditUser = (user: any) => { setEditingUser(user); setShowForm(true); };
  const closeUserForm = () => { setShowForm(false); setEditingUser(null); };

  const openCreateRole = () => { setEditingRole(null); setShowRoleForm(true); };
  const openEditRole = (role: Role) => { setEditingRole(role); setShowRoleForm(true); };
  const closeRoleForm = () => { setShowRoleForm(false); setEditingRole(null); };

  const handleDeleteRole = (role: Role) => {
    if (window.confirm(`Supprimer le rôle "${role.name}" ? Cette action est irréversible.`)) {
      deleteRole.mutate(role.id);
    }
  };

  const TABS = [
    { key: 'users', label: `Utilisateurs (${users?.length ?? 0})` },
    { key: 'roles', label: `Rôles (${roles?.length ?? 0})` },
    { key: 'audit', label: 'Journal d\'audit' },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
          <p className="text-sm text-slate-500">Gestion des utilisateurs, rôles et journaux</p>
        </div>
        {activeTab === 'users' && (
          <Button icon={<Plus size={16} />} onClick={openCreateUser}>Nouvel utilisateur</Button>
        )}
        {activeTab === 'roles' && (
          <Button icon={<Plus size={16} />} onClick={openCreateRole}>Nouveau rôle</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx('pb-2 px-3 text-sm font-medium', activeTab === key ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Rôles</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Créé le</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
                ) : users?.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((ur: any) => (
                          <Badge key={ur.role.id} color="blue">{ur.role.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'Actif' : 'Désactivé'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{dayjs(user.createdAt).format('DD/MM/YYYY')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditUser(user)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={13} />
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleUser.mutate(user.id)}
                          className={clsx('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium', user.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50')}
                        >
                          <Power size={13} />
                          {user.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Roles tab */}
      {activeTab === 'roles' && (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input placeholder="Rechercher un rôle..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingRoles ? (
              <div className="col-span-3 py-12 text-center text-slate-400">Chargement...</div>
            ) : filteredRoles?.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-400">Aucun rôle trouvé</div>
            ) : filteredRoles?.map((role) => (
              <Card key={role.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <Shield size={18} className="mt-0.5 text-primary-600" />
                  <p className="flex-1 font-semibold text-slate-800">{role.name}</p>
                  <button
                    onClick={() => openEditRole(role)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color="blue">{role._count?.users ?? 0} utilisateur(s)</Badge>
                  <Badge color="gray">{role.permissions?.length ?? 0} permissions</Badge>
                </div>
                {role.description && <p className="text-sm text-slate-500">{role.description}</p>}
                <div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.slice(0, 6).map((rp) => (
                      <span key={rp.permission.id} className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                        {rp.permission.action}:{rp.permission.resource}
                      </span>
                    ))}
                    {(role.permissions?.length ?? 0) > 6 && (
                      <span className="text-[10px] text-slate-400">+{(role.permissions?.length ?? 0) - 6} autres</span>
                    )}
                  </div>
                </div>
                <p className="mt-auto text-xs text-slate-400">Créé le {dayjs(role.createdAt).format('DD/MM/YYYY')}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Audit logs tab */}
      {activeTab === 'audit' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Ressource</th>
              </tr>
            </thead>
            <tbody>
              {loadingAudit ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
              ) : auditLogs?.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-400">{dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}</td>
                  <td className="px-4 py-3 text-slate-600">{log.user?.fullName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={log.action === 'deleted' ? 'red' : log.action === 'created' ? 'green' : 'blue'}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <UserFormModal isOpen={showForm} onClose={closeUserForm} user={editingUser} />
      <RoleFormModal isOpen={showRoleForm} onClose={closeRoleForm} role={editingRole} />
    </div>
  );
}
