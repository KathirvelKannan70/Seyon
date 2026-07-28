import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { CheckCircle, Zap } from 'lucide-react';

export default function Loans() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  // Query active loans
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => fetchAPI('/loans', 'GET', null, token),
  });

  const markPastPaidMutation = useMutation({
    mutationFn: (loanId?: string) => fetchAPI('/collections/mark-past-paid', 'POST', { loanId }, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['todayCollections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setMsg(res.message || 'Successfully marked past dues as PAID!');
      setTimeout(() => setMsg(null), 5000);
    },
    onError: (err: any) => alert(err.message || 'Action failed'),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Loan Accounts</h1>
          <p className="text-xs text-slate-500">Overview ledger of auto-disbursed Kulu scheme loan portfolios.</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Mark all past due EMIs up to today as PAID for all active loans?')) {
              markPastPaidMutation.mutate(undefined);
            }
          }}
          disabled={markPastPaidMutation.isPending}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
        >
          <Zap size={14} />
          {markPastPaidMutation.isPending ? 'Processing...' : 'Mark All Past Dues Paid Till Today'}
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Active Loans Ledger Table */}
      {loansLoading ? (
        <div className="h-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-premium dark:shadow-premium-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/40">
                  <th className="p-4">Loan No</th>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Kulu Name</th>
                  <th className="p-4">Scheme Type</th>
                  <th className="p-4">Principal Amount</th>
                  <th className="p-4">Weekly EMI</th>
                  <th className="p-4">Collected</th>
                  <th className="p-4">Outstanding</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {!loansData?.data || loansData.data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No active loans found. Loans are auto-created when members are registered in Kulus.
                    </td>
                  </tr>
                ) : (
                  loansData.data.map((loan: any, idx: number) => (
                    <tr key={loan._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 font-bold">#{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{loan.member?.name || 'N/A'}</td>
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">{loan.member?.kulu?.name || 'Unassigned Kulu'}</td>
                      <td className="p-4 font-semibold text-slate-400 uppercase">{loan.scheme?.name || '15K Scheme'}</td>
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
                      <td className="p-4 text-right">
                        {loan.remainingAmount > 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Mark past due EMIs as PAID for ${loan.member?.name || 'this member'}?`)) {
                                markPastPaidMutation.mutate(loan._id);
                              }
                            }}
                            disabled={markPastPaidMutation.isPending}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-lg transition-all"
                            title="Mark past due EMIs as paid up to today"
                          >
                            Mark Dues Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
