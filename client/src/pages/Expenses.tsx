import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { Plus, DollarSign, Wallet, FileText, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function Expenses() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('office');
  const [amount, setAmount] = useState<number>(500);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => fetchAPI('/expenses', 'GET', null, token),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => fetchAPI('/dashboard/stats', 'GET', null, token),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newExpense: any) => fetchAPI('/expenses', 'POST', newExpense, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/expenses/${id}`, 'DELETE', null, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  const openModal = () => {
    setCategory('office');
    setAmount(500);
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    createMutation.mutate({
      category,
      amount: Number(amount),
      description,
      date: new Date(date),
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete expense record of ₹${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const categories = [
    { value: 'office', label: 'Office Supplies' },
    { value: 'rent', label: 'Office Rent' },
    { value: 'salaries', label: 'Staff Salaries' },
    { value: 'travel', label: 'Officer Travel' },
    { value: 'other', label: 'Other Overheads' },
  ];

  const netCollections = dashboardData?.data?.summary?.totalCollected || 0;
  const netExpenses = expensesData?.data?.reduce((acc: number, e: any) => acc + e.amount, 0) || 0;
  const netPnL = netCollections - netExpenses;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses & P&L Ledger</h1>
          <p className="text-xs text-slate-500">Record branch overheads, disburse salaries, and track Net Profit and Loss.</p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus size={15} />
          Log Expense
        </button>
      </div>

      {/* P&L Console */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-2 shadow-premium dark:shadow-premium-dark">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Collections Earnings</span>
          <span className="text-xl font-black text-emerald-500">₹{netCollections.toLocaleString()}</span>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-2 shadow-premium dark:shadow-premium-dark">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Branch Expenses</span>
          <span className="text-xl font-black text-rose-500">₹{netExpenses.toLocaleString()}</span>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-2 shadow-premium dark:shadow-premium-dark">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Operations Surplus (P&L)</span>
          <span className={`text-xl font-black ${netPnL >= 0 ? 'text-brand-500' : 'text-rose-500'}`}>
            ₹{netPnL.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      {expensesLoading ? (
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-premium dark:shadow-premium-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/40">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Logged By</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {expensesData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No operational expenses logged yet.
                    </td>
                  </tr>
                ) : (
                  expensesData?.data?.map((exp: any) => (
                    <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-4">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="p-4 capitalize font-semibold text-slate-600 dark:text-slate-350">{exp.category}</td>
                      <td className="p-4 text-slate-500">{exp.description}</td>
                      <td className="p-4 text-slate-400">{exp.staff?.name || 'System'}</td>
                      <td className="p-4 text-rose-500 font-bold">₹{exp.amount.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(exp._id, exp.amount)}
                          className="p-1 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Log Operational Expense</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Expense Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Expense Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="form-input pl-7"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Date Logged</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Description</label>
                <textarea
                  required
                  placeholder="e.g. Travel fuel bills for Periyakulam collections run"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 mt-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Wallet size={14} /> Log Operational Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
