import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI, SERVER_URL } from '../App.tsx';
import { Plus, Edit2, Trash2, Users, Calendar, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';

const schemeEmis: Record<string, number> = {
  '10k': 800,
  '15k': 930,
  '20k': 1100,
};

export default function Kulus() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKulu, setEditingKulu] = useState<any>(null);
  const [viewingMembersKulu, setViewingMembersKulu] = useState<any>(null);

  // Form States
  const [name, setName] = useState('');
  const [kuluNumber, setKuluNumber] = useState('');
  const [meetingDay, setMeetingDay] = useState('Friday');
  const [collectionTime, setCollectionTime] = useState('09:30 AM');
  const [areaId, setAreaId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [schemeType, setSchemeType] = useState('15k');
  const [expandedKuluId, setExpandedKuluId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleDateChange = (dateVal: string) => {
    setStartDate(dateVal);
    if (dateVal) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const selectedDay = days[new Date(dateVal).getDay()];
      setMeetingDay(selectedDay);
    }
  };

  // Queries
  const { data: kulusData, isLoading: kulusLoading } = useQuery({
    queryKey: ['kulus'],
    queryFn: () => fetchAPI('/kulus', 'GET', null, token),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: () => fetchAPI('/areas', 'GET', null, token),
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => fetchAPI('/auth/staff', 'GET', null, token),
  });

  const { data: membersListData, isLoading: membersLoading } = useQuery({
    queryKey: ['kuluMembers', viewingMembersKulu?._id],
    queryFn: () => fetchAPI(`/members?kuluId=${viewingMembersKulu._id}`, 'GET', null, token),
    enabled: !!viewingMembersKulu?._id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newKulu: any) => fetchAPI('/kulus', 'POST', newKulu, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kulus'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updatedData }: { id: string; updatedData: any }) =>
      fetchAPI(`/kulus/${id}`, 'PUT', updatedData, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kulus'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/kulus/${id}`, 'DELETE', null, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kulus'] });
    },
    onError: (err: any) => alert(err.message),
  });

  const openAddModal = () => {
    setEditingKulu(null);
    setName('');
    setKuluNumber('KULU-' + Math.floor(100 + Math.random() * 900));
    setMeetingDay('Friday');
    setCollectionTime('09:30 AM');
    setAreaId(areasData?.data?.[0]?._id || '');
    setOfficerId(staffData?.data?.filter((s: any) => s.role === 'officer')?.[0]?._id || '');
    setNotes('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setSchemeType('15k');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (kulu: any) => {
    setEditingKulu(kulu);
    setName(kulu.name);
    setKuluNumber(kulu.kuluNumber);
    setMeetingDay(kulu.meetingDay);
    setCollectionTime(kulu.collectionTime);
    setAreaId(kulu.area?._id || '');
    setOfficerId(kulu.fieldOfficer?._id || '');
    setNotes(kulu.notes || '');
    setStartDate(kulu.startDate ? new Date(kulu.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setSchemeType(kulu.schemeType || '15k');
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingKulu(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name,
      kuluNumber,
      meetingDay,
      collectionTime,
      area: areaId,
      fieldOfficer: officerId,
      notes,
      startDate,
      schemeType,
    };

    if (editingKulu) {
      updateMutation.mutate({ id: editingKulu._id, updatedData: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete Street Group: ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kulus (Street Groups)</h1>
          <p className="text-xs text-slate-500">Configure self-help groups, weekday schedule, and field officer duties.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus size={15} />
          Create Kulu
        </button>
      </div>

      {kulusLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kulusData?.data?.map((kulu: any) => (
            <div key={kulu._id} onClick={() => setViewingMembersKulu(kulu)} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col justify-between shadow-premium dark:shadow-premium-dark hover:scale-[1.01] hover:border-brand-500/35 cursor-pointer transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                      <Users size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{kulu.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">#{kulu.kuluNumber} ({kulu.schemeType?.toUpperCase() || '15K'} Scheme)</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold bg-brand-500/10 text-brand-500">
                    {kulu.area?.name || 'Unassigned Area'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{kulu.meetingDay}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>{kulu.collectionTime}</span>
                  </div>
                  <div className="flex flex-col col-span-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-850/50 gap-0.5 my-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-450">Kulu Total Portfolio:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">₹{(kulu.totalAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-450">Weekly Repayment Collection:</span>
                      <span className="font-bold text-brand-500">₹{(kulu.weeklyRepayment || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <User size={13} className="text-slate-400" />
                    <span className="truncate">Officer: <strong className="text-slate-600 dark:text-slate-300">{kulu.fieldOfficer?.name || 'None'}</strong></span>
                  </div>
                </div>

                {kulu.notes && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 line-clamp-1 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
                    "{kulu.notes}"
                  </p>
                )}

                {expandedKuluId === kulu._id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                    <span className="text-[10px] font-bold text-slate-450 mb-1.5 block">20-Week Collection Schedule:</span>
                    <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/30">
                      {(() => {
                        const emi = schemeEmis[kulu.schemeType || '15k'] || 930;
                        const start = new Date(kulu.startDate || new Date());
                        const weeks = [];
                        for (let i = 0; i < 20; i++) {
                          const current = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                          weeks.push({
                            week: i + 1,
                            dateStr: current.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                            target: emi * (kulu.memberCount || 0),
                          });
                        }
                        return weeks.map(w => (
                          <div key={w.week} className="flex justify-between items-center p-1.5 px-2 text-[9px] bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-850/50 rounded-lg">
                            <span className="text-slate-400">W{w.week}: {w.dateStr}</span>
                            <span className="font-bold text-brand-500">₹{w.target.toLocaleString()}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">{kulu.memberCount} Members Registered</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedKuluId(expandedKuluId === kulu._id ? null : kulu._id);
                    }}
                    className="text-[9px] text-left text-brand-500 hover:text-brand-600 font-bold underline transition-colors"
                  >
                    {expandedKuluId === kulu._id ? 'Hide 20-Week Schedule' : 'View 20-Week Schedule'}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(kulu); }}
                    className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(kulu._id, kulu.name); }}
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

            <h3 className="text-base font-bold">{editingKulu ? 'Modify Kulu Group' : 'Add Kulu Group'}</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Kulu Number</label>
                <input
                  type="text"
                  required
                  placeholder="KULU-100"
                  value={kuluNumber}
                  onChange={(e) => setKuluNumber(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Kulu Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annai Street Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Select Kulu Scheme</label>
                <select value={schemeType} onChange={(e) => setSchemeType(e.target.value)} className="form-input">
                  <option value="10k">10k Scheme (Weekly Repayment: ₹800/member)</option>
                  <option value="15k">15k Scheme (Weekly Repayment: ₹930/member)</option>
                  <option value="20k">20k Scheme (Weekly Repayment: ₹1100/member)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Meeting Day</label>
                  <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} className="form-input">
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Collection Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:30 AM"
                    value={collectionTime}
                    onChange={(e) => setCollectionTime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Assign Area Division</label>
                <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="form-input" required>
                  <option value="">Select Area...</option>
                  {areasData?.data?.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Collection Officer</label>
                <select value={officerId} onChange={(e) => setOfficerId(e.target.value)} className="form-input" required>
                  <option value="">Assign Officer...</option>
                  {staffData?.data?.filter((s: any) => s.role === 'officer' || s.role === 'manager').map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Notes / Remarks</label>
                <textarea
                  placeholder="Meeting locations, landmarks, notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} />
                {editingKulu ? 'Save Changes' : 'Register Kulu'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Members Directory Modal */}
      {viewingMembersKulu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setViewingMembersKulu(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>
            <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold">Members Enrolled in {viewingMembersKulu.name}</h3>
              <p className="text-xs text-slate-450">Showing all registered self-help group members and profiles.</p>
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-500 animate-spin" />
              </div>
            ) : !membersListData?.data || membersListData.data.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No members enrolled in this Kulu yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {membersListData.data.map((m: any) => (
                  <div key={m._id} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex gap-3 text-xs">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                      {m.photo ? <img src={m.photo.startsWith('http') ? m.photo : `${SERVER_URL}${m.photo}`} alt="" className="w-full h-full object-cover" /> : '👩'}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-400">Phone: {m.phone}</span>
                      <span className="text-[10px] text-slate-400">Aadhaar: {m.aadhaarNumber}</span>
                      <span className="text-[10px] text-slate-400">Occupation: {m.occupation}</span>
                      <span className={`w-fit mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        m.kycStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {m.kycStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
