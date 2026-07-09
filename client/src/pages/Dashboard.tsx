import { useQuery } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Banknote, Calendar, Users, TrendingUp,
  MapPin, UserCheck, DollarSign, PlusCircle, ArrowUpRight
} from 'lucide-react';

export default function Dashboard() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => fetchAPI('/dashboard/stats', 'GET', null, token),
    refetchInterval: 5000,
  });

  const { data: kulusData } = useQuery({
    queryKey: ['kulus'],
    queryFn: () => fetchAPI('/kulus', 'GET', null, token),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-3xl">
        Error loading statistics: {error?.message || 'Server connection failed.'}
      </div>
    );
  }

  const { summary, collectionGraph, recentActivity } = data.data;

  const statCards = [
    { label: "Today's Collection", val: `₹${summary.todayCollection.toLocaleString()}`, change: `₹${summary.pendingCollection.toLocaleString()} Pending`, icon: Banknote, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: "Today's Due Target", val: `₹${summary.todayDue.toLocaleString()}`, change: `${summary.todayKulu} Kulu Meeting`, icon: Calendar, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Outstanding Portfolio', val: `₹${summary.outstandingLoans.toLocaleString()}`, change: `${summary.activeMembers} Active Borrowers`, icon: TrendingUp, color: 'text-brand-500 bg-brand-500/10' },
    { label: 'Operational Profit/Loss', val: `₹${summary.netProfit.toLocaleString()}`, change: `₹${summary.totalExpenses.toLocaleString()} Expenses Logged`, icon: DollarSign, color: 'text-cyan-500 bg-cyan-500/10' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Live operational ledger metrics and street group audits.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/collections" className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all">
            <PlusCircle size={15} />
            Collection Desk
          </Link>
          <Link to="/members" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all">
            Add Members
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark hover:scale-[1.01] transition-transform">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400">{card.label}</span>
                <div className={`p-2.5 rounded-2xl ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight">{card.val}</span>
                <span className="text-[11px] font-medium text-slate-500">{card.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of Graph + Secondary stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Graph */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Weekly Collection Trend</span>
              <span className="text-[11px] text-slate-400">Total payments collected over the last 7 weekdays.</span>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 rounded-lg">
              Live Feed
            </span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collectionGraph}>
                <defs>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="Collected" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Highlights */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark justify-between">
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold">Operational Focus</span>
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                  <MapPin size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Top Performing Area</span>
                  <span className="text-xs font-bold">{summary.topPerformingArea}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Users size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Total Area Segments</span>
                  <span className="text-xs font-bold">{summary.todayAreas} Today Active</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
                  <UserCheck size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Active Street Kulus</span>
                  <span className="text-xs font-bold">{summary.totalKulu} Enrolled</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-xs mt-4">
            <span className="text-slate-400 font-medium">Month Collection Tally:</span>
            <span className="font-bold text-emerald-500">₹{summary.monthlyCollection.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Kulu Targets + Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kulu Weekly Repayments Target */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Kulu Weekly Repayments Target</span>
              <span className="text-[11px] text-slate-400">Target collection based on group sizes and mapped schemes.</span>
            </div>
            <span className="px-2.5 py-0.5 text-[9px] font-bold bg-brand-500/10 text-brand-500 rounded">Expected Yields</span>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850/50">
                  <th className="p-3">Kulu Name</th>
                  <th className="p-3 text-center">Scheme Option</th>
                  <th className="p-3 text-center">Active Size</th>
                  <th className="p-3 text-right">Repayment/Member</th>
                  <th className="p-3 text-right">Expected Weekly Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {!kulusData?.data || kulusData.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">No street Kulu subgroups configured.</td>
                  </tr>
                ) : (
                  kulusData.data.map((kulu: any) => {
                    const schemeType: '10k' | '15k' | '20k' = (kulu.schemeType === '10k' || kulu.schemeType === '20k') ? kulu.schemeType : '15k';
                    const schemeDetails = {
                      '10k': { name: '10k Scheme', emi: 800 },
                      '15k': { name: '15k Scheme', emi: 930 },
                      '20k': { name: '20k Scheme', emi: 1100 },
                    }[schemeType];

                    return (
                      <tr key={kulu._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{kulu.name}</td>
                        <td className="p-3 text-center uppercase font-bold text-slate-400">{kulu.schemeType || '15k'}</td>
                        <td className="p-3 text-center text-slate-450">{kulu.memberCount} members</td>
                        <td className="p-3 text-right text-slate-450">₹{schemeDetails.emi.toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-emerald-500">₹{(kulu.weeklyRepayment || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">System Audit Trail</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Security Logs</span>
          </div>

          <div className="flex flex-col gap-1">
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No recent operational logs.</div>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log._id} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{log.action.replace('_', ' ')}</span>
                    <span className="text-slate-500 dark:text-slate-400">{log.details}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-[10px] text-slate-400">
                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    <span>{log.user?.name || 'System'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
