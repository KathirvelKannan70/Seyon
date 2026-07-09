import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { Plus, Edit2, Trash2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Areas() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  
  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['areas'],
    queryFn: () => fetchAPI('/areas', 'GET', null, token),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newArea: any) => fetchAPI('/areas', 'POST', newArea, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updatedData }: { id: string; updatedData: any }) =>
      fetchAPI(`/areas/${id}`, 'PUT', updatedData, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/areas/${id}`, 'DELETE', null, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (err: any) => alert(err.message),
  });

  const openAddModal = () => {
    setEditingArea(null);
    setName('');
    setCode('');
    setDescription('');
    setStatus('active');
    setMeetingNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (area: any) => {
    setEditingArea(area);
    setName(area.name);
    setCode(area.code);
    setDescription(area.description || '');
    setStatus(area.status);
    setMeetingNotes(area.meetingNotes || '');
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingArea(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = { name, code, description, status, meetingNotes };

    if (editingArea) {
      updateMutation.mutate({ id: editingArea._id, updatedData: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Area: ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Areas Register</h1>
          <p className="text-xs text-slate-500">Define and configure geographic microfinance collections zones.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus size={15} />
          Create Area
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-3xl">
          Failed to load areas register.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((area: any) => (
            <div key={area._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col justify-between shadow-premium dark:shadow-premium-dark hover:scale-[1.01] transition-all relative overflow-hidden">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                      <MapPin size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{area.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">{area.code}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                    area.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {area.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8">
                  {area.description || 'No description provided.'}
                </p>

                {area.meetingNotes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/30 text-[11px] text-slate-400 flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Meeting Rule:</span>
                    <span>{area.meetingNotes}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4">
                <span className="text-[10px] text-slate-400 font-semibold">{area.kuluCount} Active Kulus</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(area)}
                    className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(area._id, area.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">{editingArea ? 'Modify Area Profile' : 'Configure New Area'}</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Area Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madurai Central"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Area Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MDU-C"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="form-input uppercase"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Details regarding zones, boundaries..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input h-16 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Meeting Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Mondays at 10 AM"
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Operational Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} />
                {editingArea ? 'Save Changes' : 'Publish Area'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
