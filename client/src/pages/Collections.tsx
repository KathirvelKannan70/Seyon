import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI, API_URL } from '../App.tsx';
import {
  Banknote, Search, Calendar, MapPin, Printer, CheckCircle,
  AlertTriangle, RefreshCw, XCircle, Clock, AlertCircle, Plus
} from 'lucide-react';

export default function Collections() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayDay = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]; // standard JS 0=Sunday

  // Filters State
  const [day, setDay] = useState(todayDay);
  const [search, setSearch] = useState('');

  // Active operations payment states
  const [collectingMember, setCollectingMember] = useState<any>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [remarks, setRemarks] = useState('');
  const [customPaymentDate, setCustomPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: collectionData, isLoading, refetch } = useQuery({
    queryKey: ['todayCollections', day],
    queryFn: () => fetchAPI(`/collections/today?day=${day}`, 'GET', null, token),
  });

  // Mutations
  const collectMutation = useMutation({
    mutationFn: (payload: any) => fetchAPI('/collections/collect', 'POST', payload, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['todayCollections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setPaymentSuccess(res.data.payment);
      setCollectingMember(null);
      // Automatically close modal after success
    },
    onError: (err: any) => setFormError(err.message),
  });

  const bulkCollectMutation = useMutation({
    mutationFn: (kuluId: string) => fetchAPI('/collections/bulk-collect', 'POST', { kuluId }, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['todayCollections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      alert(res.message || 'Successfully bulk collected all payments for this Kulu!');
    },
    onError: (err: any) => {
      alert(err.message || 'Bulk collection failed.');
    }
  });

  // Start Collection Slips Modal
  const openCollectModal = (memberItem: any, statusType: 'paid' | 'late' | 'skipped') => {
    setFormError(null);
    setPaymentSuccess(null);
    setCollectingMember({ ...memberItem, statusType });
    setAmountPaid(statusType === 'paid' ? String(memberItem.activeEmi.dueAmount) : '0');
    setPaymentMode('Cash');
    setRemarks('');
    setCustomPaymentDate(new Date().toISOString().split('T')[0]);
    setGpsLocation(null);

    // Fetch GPS coordinates in background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => console.warn('GPS coordinates skipped.')
      );
    }
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!collectingMember) return;

    const payload = {
      loanId: collectingMember.loan._id,
      amountPaid: Number(amountPaid),
      paymentMode,
      status: collectingMember.statusType, // 'paid', 'late', 'skipped'
      gpsLocation: gpsLocation || { latitude: 0, longitude: 0 },
      remarks,
      date: customPaymentDate,
    };

    collectMutation.mutate(payload);
  };

  const handleSkipOrLateQuick = (memberItem: any, actionStatus: 'skipped' | 'late') => {
    if (confirm(`Mark collection for ${memberItem.member.name} as ${actionStatus.toUpperCase()}?`)) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const gps = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            collectMutation.mutate({
              loanId: memberItem.loan._id,
              amountPaid: 0,
              paymentMode: 'Cash',
              status: actionStatus,
              gpsLocation: gps,
              remarks: `Quick marked as ${actionStatus}`,
            });
          },
          () => {
            collectMutation.mutate({
              loanId: memberItem.loan._id,
              amountPaid: 0,
              paymentMode: 'Cash',
              status: actionStatus,
              gpsLocation: { latitude: 0, longitude: 0 },
              remarks: `Quick marked as ${actionStatus}`,
            });
          }
        );
      }
    }
  };

  // Filter group members list on Client Side
  const filteredData = collectionData?.data?.map((kuluBlock: any) => {
    const matchedMembers = kuluBlock.members.filter((m: any) => {
      const matchQuery = search.toLowerCase();
      return (
        m.member.name.toLowerCase().includes(matchQuery) ||
        m.member.phone.includes(matchQuery) ||
        m.member.aadhaarNumber.includes(matchQuery) ||
        (m.loan && m.loan.loanNumber.toLowerCase().includes(matchQuery))
      );
    });
    return {
      ...kuluBlock,
      members: matchedMembers
    };
  }).filter((kuluBlock: any) => kuluBlock.members.length > 0) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections Desk</h1>
          <p className="text-xs text-slate-500">Record weekly EMIs, skip weeks, log GPS locations, and print receipts.</p>
        </div>
        <div className="flex gap-2">
          <select value={day} onChange={(e) => setDay(e.target.value)} className="form-input w-44">
            {daysOfWeek.map(d => (
              <option key={d} value={d}>{d} {d === todayDay ? '(Today)' : ''}</option>
            ))}
          </select>
          <button onClick={() => refetch()} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Filter today list by Member Name, Phone, Aadhaar or Loan Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-9"
        />
      </div>

      {/* Success Receipt Alert */}
      {paymentSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} />
            <div className="flex flex-col text-xs">
              <span className="font-bold">Payment Logged Successfully!</span>
              <span>Receipt Number: <strong>{paymentSuccess.receiptNumber}</strong> • Amount: ₹{paymentSuccess.amountPaid}</span>
            </div>
          </div>
          <a
            href={`${API_URL}/reports/receipt/${paymentSuccess.receiptNumber}?token=${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1 hover:scale-105 active:scale-98 transition-all"
          >
            <Printer size={12} /> Print Receipt
          </a>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
      ) : filteredData.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl text-slate-400 text-xs">
          No collections scheduled for {day}. Try switching weekdays above or verify Kulu setups.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredData.map((block: any) => (
            <div key={block.kulu._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
              {/* Kulu header */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-250">{block.kulu.name}</span>
                  <span className="text-[10px] text-slate-400">Area: {block.kulu.area?.name} • Meeting Day: {block.kulu.meetingDay} ({block.kulu.collectionTime})</span>
                </div>
                <div className="flex items-center gap-2">
                  {block.members.some((mItem: any) => mItem.activeEmi && ['pending', 'partial', 'late'].includes(mItem.activeEmi.status)) ? (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to bulk-collect today's EMIs for all members in ${block.kulu.name}?`)) {
                          bulkCollectMutation.mutate(block.kulu._id);
                        }
                      }}
                      disabled={bulkCollectMutation.isPending}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[9px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {bulkCollectMutation.isPending && bulkCollectMutation.variables === block.kulu._id ? (
                        <RefreshCw size={10} className="animate-spin" />
                      ) : (
                        <CheckCircle size={10} />
                      )}
                      Bulk Collect
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                      Fully Collected
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                    Officer: {block.kulu.fieldOfficer?.name}
                  </span>
                </div>
              </div>

              {/* Members of Kulu list */}
              <div className="flex flex-col gap-3">
                {block.members.map((mItem: any) => (
                  <div key={mItem.member._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/45 hover:bg-slate-100/50 dark:hover:bg-slate-950/70 border border-slate-100/50 dark:border-slate-800/20 rounded-2xl transition-all">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-bold">{mItem.member.name}</span>
                      <span className="text-[10px] text-slate-400">Phone: {mItem.member.phone}</span>
                      {mItem.loan ? (
                        <span className="text-[10px] text-slate-400">Loan: <strong>{mItem.loan.loanNumber}</strong> • EMI Due: <strong className="text-slate-600 dark:text-slate-350">₹{mItem.loan.weeklyEMI}</strong></span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No active loan account</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                      {mItem.activeEmi ? (
                        <>
                          <div className="text-right flex flex-col items-end mr-2">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold">Week {mItem.activeEmi.weekNumber} Status</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase mt-0.5 ${
                              mItem.activeEmi.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                              mItem.activeEmi.status === 'partial' ? 'bg-brand-500/10 text-brand-500' :
                              mItem.activeEmi.status === 'late' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              {mItem.activeEmi.status}
                            </span>
                          </div>

                          <button
                            onClick={() => openCollectModal(mItem, 'paid')}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[10px] rounded-xl shadow-sm active:scale-95 transition-all"
                          >
                            Collect
                          </button>
                          <button
                            onClick={() => openCollectModal(mItem, 'paid')} // partial is collected under standard panel
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[10px] rounded-xl transition-all"
                          >
                            Partial
                          </button>
                          <button
                            onClick={() => handleSkipOrLateQuick(mItem, 'skipped')}
                            className="px-3 py-1.5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 text-[10px] font-semibold rounded-xl transition-all"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => handleSkipOrLateQuick(mItem, 'late')}
                            className="px-3 py-1.5 text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 text-[10px] font-semibold rounded-xl transition-all"
                          >
                            Late
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Cleared / No EMI Due</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collection Form Modal */}
      {collectingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={() => setCollectingMember(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold">Collect Weekly EMI payment</h3>
              <span className="text-xs text-slate-400">Borrower: <strong>{collectingMember.member.name}</strong> • Loan: #{collectingMember.loan.loanNumber}</span>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCollectSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Week Due Amount: ₹{collectingMember.activeEmi.dueAmount}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="form-input pl-7"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="form-input"
                >
                  <option value="Cash">Cash Desk</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="Bank">Direct Bank Transfer</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Collection Date</label>
                <input
                  type="date"
                  required
                  value={customPaymentDate}
                  onChange={(e) => setCustomPaymentDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Remarks / Meeting Notes</label>
                <input
                  type="text"
                  placeholder="Regular payment, partial clearance..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="form-input"
                />
              </div>

              {gpsLocation && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                  <MapPin size={12} />
                  <span>GPS Tags Captured: {gpsLocation.latitude.toFixed(5)}, {gpsLocation.longitude.toFixed(5)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={collectMutation.isPending}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Banknote size={14} /> Record Payment & Issue Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Success Receipt Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setPaymentSuccess(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <div className="flex flex-col items-center text-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Collection Logged Successfully!</h3>
              <p className="text-xs text-slate-500">Receipt generated and logged in operational ledger.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex flex-col gap-2.5 text-xs border border-slate-100 dark:border-slate-800/40">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Number</span>
                <span className="font-bold uppercase text-slate-700 dark:text-slate-200">{paymentSuccess.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Collected</span>
                <span className="font-black text-emerald-500 text-sm">₹{paymentSuccess.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{paymentSuccess.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">{paymentSuccess.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time</span>
                <span className="text-slate-700 dark:text-slate-200">{new Date(paymentSuccess.createdAt).toLocaleString()}</span>
              </div>
              {paymentSuccess.gpsLocation && paymentSuccess.gpsLocation.latitude !== 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS Coordinates</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{paymentSuccess.gpsLocation.latitude.toFixed(5)}, {paymentSuccess.gpsLocation.longitude.toFixed(5)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Printer size={14} /> Print Receipt Slip
              </button>
              <button
                onClick={() => setPaymentSuccess(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
