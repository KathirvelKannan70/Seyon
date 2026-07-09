import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { Plus, Landmark, PiggyBank, Receipt, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

export default function Loans() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Tab View State: 'loans' | 'schemes'
  const [tab, setTab] = useState<'loans' | 'schemes'>('loans');

  // UI States
  const [schemeModal, setSchemeModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  // Form: Create Scheme
  const [schemeName, setSchemeName] = useState('');
  const [loanAmount, setLoanAmount] = useState<number>(15000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [processingFee, setProcessingFee] = useState<number>(300);
  const [duration, setDuration] = useState<number>(20);
  const [weeklyEMI, setWeeklyEMI] = useState<number>(930);
  const [lateFine, setLateFine] = useState<number>(50);
  const [graceDays, setGraceDays] = useState<number>(1);
  const [schemeStatus, setSchemeStatus] = useState('active');

  // Form: Assign Loan
  const [memberId, setMemberId] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [startDate, setStartDate] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => fetchAPI('/loans', 'GET', null, token),
  });

  const { data: schemesData } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => fetchAPI('/schemes', 'GET', null, token),
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => fetchAPI('/members', 'GET', null, token),
  });

  // Mutations
  const createSchemeMutation = useMutation({
    mutationFn: (newScheme: any) => fetchAPI('/schemes', 'POST', newScheme, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      setSchemeModal(false);
    },
    onError: (err: any) => setFormError(err.message),
  });

  const assignLoanMutation = useMutation({
    mutationFn: (newLoan: any) => fetchAPI('/loans', 'POST', newLoan, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setAssignModal(false);
    },
    onError: (err: any) => setFormError(err.message),
  });

  const handleSchemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: schemeName,
      loanAmount: Number(loanAmount),
      interestRate: Number(interestRate),
      processingFee: Number(processingFee),
      duration: Number(duration),
      weeklyEMI: Number(weeklyEMI),
      lateFine: Number(lateFine),
      graceDays: Number(graceDays),
      status: schemeStatus,
    };

    createSchemeMutation.mutate(payload);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      memberId,
      schemeId,
      startDate: startDate ? new Date(startDate) : new Date(),
    };

    assignLoanMutation.mutate(payload);
  };

  // Helper auto-calculate Weekly EMI suggestion
  const updateEmiEstimate = (amount: number, rate: number, weeks: number) => {
    const principal = Number(amount);
    const interest = principal * (Number(rate) / 100);
    const total = principal + interest;
    const emi = Math.ceil(total / Number(weeks));
    setWeeklyEMI(isNaN(emi) ? 0 : emi);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans & Schemes Desk</h1>
          <p className="text-xs text-slate-500">Configure microfinance schemes and disburse loans to registered members.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setFormError(null); setSchemeModal(true); }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} />
            Create Scheme
          </button>
          <button
            onClick={() => { setFormError(null); setAssignModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Landmark size={15} />
            Assign Loan
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setTab('loans')}
          className={`pb-2.5 px-1 border-b-2 transition-all ${
            tab === 'loans' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Loan Accounts
        </button>
        <button
          onClick={() => setTab('schemes')}
          className={`pb-2.5 px-1 border-b-2 transition-all ${
            tab === 'schemes' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Loan Schemes List
        </button>
      </div>

      {tab === 'loans' ? (
        // Loans Accounts view
        loansLoading ? (
          <div className="h-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-premium dark:shadow-premium-dark">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/40">
                    <th className="p-4">Loan ID</th>
                    <th className="p-4">Member Name</th>
                    <th className="p-4">Scheme Type</th>
                    <th className="p-4">Principal Amount</th>
                    <th className="p-4">Weekly EMI</th>
                    <th className="p-4">Collected</th>
                    <th className="p-4">Outstanding</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {loansData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No active loans disbursed yet. Click "Assign Loan" above.
                      </td>
                    </tr>
                  ) : (
                    loansData?.data?.map((loan: any) => (
                      <tr key={loan._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4 font-bold">{loan.loanNumber}</td>
                        <td className="p-4 font-semibold">{loan.member?.name || 'Unknown'}</td>
                        <td className="p-4">{loan.scheme?.name || 'Custom'}</td>
                        <td className="p-4 font-semibold">₹{loan.loanAmount.toLocaleString()}</td>
                        <td className="p-4">₹{loan.weeklyEMI.toLocaleString()}</td>
                        <td className="p-4 text-emerald-500 font-bold">₹{loan.paidAmount.toLocaleString()}</td>
                        <td className="p-4 text-rose-500 font-bold">₹{loan.remainingAmount.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                            loan.status === 'completed' ? 'bg-brand-500/10 text-brand-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {loan.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // Schemes List view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemesData?.data?.map((scheme: any) => (
            <div key={scheme._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col justify-between shadow-premium dark:shadow-premium-dark hover:scale-[1.01] transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl">
                      <PiggyBank size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{scheme.name}</span>
                      <span className="text-[10px] text-slate-400">Duration: {scheme.duration} Weeks</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                    scheme.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {scheme.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 text-slate-500 border-t border-slate-100 dark:border-slate-800/40">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Loan Amount</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">₹{scheme.loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Weekly EMI</span>
                    <span className="font-bold text-emerald-500">₹{scheme.weeklyEMI.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Interest / Processing Fee</span>
                    <span className="font-semibold">{scheme.interestRate}% / ₹{scheme.processingFee}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Late Fine / Grace Days</span>
                    <span className="font-semibold">₹{scheme.lateFine} / {scheme.graceDays} Day(s)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Scheme Modal */}
      {schemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setSchemeModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Configure New Loan Scheme</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSchemeSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Scheme Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Loan 15K"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Loan Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={loanAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLoanAmount(val);
                      updateEmiEstimate(val, interestRate, duration);
                    }}
                    className="form-input"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Interest Rate (%)</label>
                  <input
                    type="number"
                    required
                    value={interestRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInterestRate(val);
                      updateEmiEstimate(loanAmount, val, duration);
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Processing Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={processingFee}
                    onChange={(e) => setProcessingFee(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Duration (Weeks)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDuration(val);
                      updateEmiEstimate(loanAmount, interestRate, val);
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Dynamic EMI Calculator preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Estimated Weekly EMI:</span>
                  <span className="font-extrabold text-emerald-500 text-sm">₹{weeklyEMI}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    required
                    value={weeklyEMI}
                    onChange={(e) => setWeeklyEMI(Number(e.target.value))}
                    className="form-input w-24 py-1.5"
                  />
                  <span className="text-[10px] text-slate-400">Overridable EMI amount</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Late Fine (₹)</label>
                  <input
                    type="number"
                    required
                    value={lateFine}
                    onChange={(e) => setLateFine(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Grace Days</label>
                  <input
                    type="number"
                    required
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createSchemeMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
              >
                <CheckCircle size={14} /> Create Scheme
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Loan Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setAssignModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Disburse Member Loan Account</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Select Member Borrower</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="form-input" required>
                  <option value="">Choose Member...</option>
                  {membersData?.data?.map((m: any) => (
                    <option key={m._id} value={m._id}>{m.name} (Aadhaar: {m.aadhaarNumber})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Select Scheme Option</label>
                <select value={schemeId} onChange={(e) => setSchemeId(e.target.value)} className="form-input" required>
                  <option value="">Choose Scheme...</option>
                  {schemesData?.data?.filter((s: any) => s.status === 'active').map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name} (Amount: ₹{s.loanAmount.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={assignLoanMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Landmark size={14} /> Disburse Loan Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
