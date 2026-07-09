import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { Plus, UserCheck, ShieldAlert, Key, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

export default function Staff() {
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('officer');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => fetchAPI('/auth/staff', 'GET', null, token),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newStaff: any) => fetchAPI('/auth/register', 'POST', newStaff, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      fetchAPI(`/auth/staff/${id}`, 'PATCH', payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const closeModal = () => setModalOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate({ name, email, password, role });
  };

  const handleStatusToggle = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({ id, payload: { status: nextStatus } });
  };

  const handleRoleChange = (id: string, nextRole: string) => {
    updateMutation.mutate({ id, payload: { role: nextRole } });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff & Permissions</h1>
          <p className="text-xs text-slate-500">Add collection officers, manage executive roles, and audit access credentials.</p>
        </div>
        {currentUser?.role === 'super_admin' && (
          <button
            onClick={() => {
              setName('');
              setEmail('');
              setPassword('');
              setRole('officer');
              setFormError(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus size={15} />
            Register Staff
          </button>
        )}
      </div>

      {staffLoading ? (
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-premium dark:shadow-premium-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/40">
                  <th className="p-4">Staff Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Designated Role</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Login Status</th>
                  {currentUser?.role === 'super_admin' && <th className="p-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {staffData?.data?.map((staff: any) => (
                  <tr key={staff._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-4 font-semibold">{staff.name}</td>
                    <td className="p-4">{staff.email}</td>
                    <td className="p-4">
                      {currentUser?.role === 'super_admin' ? (
                        <select
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff._id, e.target.value)}
                          className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-[10px] uppercase font-bold"
                        >
                          <option value="manager">Manager</option>
                          <option value="officer">Collection Officer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-slate-500">{staff.role}</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400">{new Date(staff.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        staff.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {staff.status.toUpperCase()}
                      </span>
                    </td>
                    {currentUser?.role === 'super_admin' && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleStatusToggle(staff._id, staff.status)}
                          className={`px-3 py-1 font-bold text-[9px] rounded-lg transition-all ${
                            staff.status === 'active' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          }`}
                        >
                          {staff.status === 'active' ? 'Block Access' : 'Unblock'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Register New Staff Profile</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Email Address (Username)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. anand@seyon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Assign Operations Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="form-input">
                  <option value="officer">Collection Officer</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer / Auditor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <UserCheck size={14} /> Register Staff accounts
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
