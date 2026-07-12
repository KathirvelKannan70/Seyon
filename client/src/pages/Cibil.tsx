import { useState, useEffect } from 'react';
import { useAuth, fetchAPI } from '../App.tsx';
import {
  Search, ShieldAlert, ShieldCheck, AlertCircle, CheckCircle2,
  Building2, CreditCard, User, HelpCircle, ArrowRight, Info
} from 'lucide-react';

interface CreditAccount {
  lender: string;
  type: string;
  sanctionedAmount: number;
  currentBalance: number;
  status: string;
  openedDate: string;
}

interface CibilReport {
  score: number;
  status: string;
  checkedAt: string;
  panOrAadhaar: string;
  name: string;
  activeAccounts: number;
  totalOutstanding: number;
  inquiries: number;
  paymentHistory: number;
  accounts: CreditAccount[];
}

export default function Cibil() {
  const { token } = useAuth();

  // Form input states
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Flow states
  const [checking, setChecking] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<CibilReport | null>(null);

  const steps = [
    'Verifying applicant identity parameters...',
    'Validating document number authenticity with NSDL/UIDAI databases...',
    'Fetching microfinance ledger repayment history...',
    'Aggregating outstanding debt portfolio balances...',
    'Compiling final credit report profile...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checking) {
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [checking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setReport(null);

    if (!name.trim()) {
      setFormError('Please enter applicant name.');
      return;
    }
    if (!pan.trim() && !aadhaar.trim()) {
      setFormError('Please provide either a PAN or Aadhaar card number.');
      return;
    }

    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())) {
      setFormError('PAN must follow the standard 10-character Indian PAN format (e.g. ABCDE1234F).');
      return;
    }

    if (aadhaar && !/^[0-9]{12}$/.test(aadhaar.trim())) {
      setFormError('Aadhaar must be exactly 12 digits.');
      return;
    }

    setChecking(true);

    try {
      // Artificially delay for the loading steps to complete
      await new Promise((resolve) => setTimeout(resolve, steps.length * 700 + 200));

      const res = await fetchAPI('/cibil/check', 'POST', {
        name: name.trim(),
        pan: pan.trim().toUpperCase() || undefined,
        aadhaar: aadhaar.trim() || undefined
      }, token);

      if (res.success) {
        setReport(res.data);
      } else {
        setFormError(res.message || 'Failed to check CIBIL score.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during verification.');
    } finally {
      setChecking(false);
    }
  };

  // Color mappings
  const getScoreColorClass = (score: number) => {
    if (score >= 750) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 680) return 'text-lime-500 stroke-lime-500';
    if (score >= 580) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 750) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (score >= 680) return 'bg-lime-500/10 text-lime-500 border-lime-500/20';
    if (score >= 580) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  const getStrokeDashOffset = (score: number) => {
    // Circle circumference is 2 * PI * r = 2 * 3.14159 * 50 = 314.16
    // Min score 300, max 900 -> range 600
    // We map [300, 900] to offset [314.16, 0]
    const percent = Math.max(0, Math.min(100, ((score - 300) / 600) * 100));
    return 314.16 - (314.16 * percent) / 100;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Bureau Console</h1>
        <p className="text-xs text-slate-500">Perform instant, secure CIBIL score checks using Indian PAN / Aadhaar identifiers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Verification Form Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
              <Search size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Bureau Verification Query</span>
              <span className="text-[10px] text-slate-400">Request active credit profile from transunion bureau</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-400">Applicant Full Name</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <User size={13} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Enter name (e.g. Rajeswari M)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input pl-8.5 text-xs py-2.5"
                  disabled={checking}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-400">PAN Number (Permanent Account Number)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <CreditCard size={13} />
                </span>
                <input
                  type="text"
                  placeholder="ABCDE1234F (10-char uppercase)"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="form-input pl-8.5 text-xs py-2.5 uppercase"
                  disabled={checking}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-400">Aadhaar Card Number</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <ShieldCheck size={13} />
                </span>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="12 digit Aadhaar number"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  className="form-input pl-8.5 text-xs py-2.5"
                  disabled={checking}
                />
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={checking}
              className="py-3 px-4 mt-2 bg-gradient-to-r from-teal-500 to-brand-500 hover:from-teal-600 hover:to-brand-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-99 transition-all disabled:opacity-50"
            >
              {checking ? 'Checking Credit Bureaus...' : 'Verify Bureau Profile'}
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* Verification Status / Results Console */}
        <div className="lg:col-span-2">
          {checking ? (
            /* Premium Animated Loading State */
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-premium dark:shadow-premium-dark min-h-[400px]">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-brand-500 animate-spin" />
                <div className="absolute w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center animate-pulse">
                  <Search size={14} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 max-w-sm">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Retrieving Bureau Report</span>
                <p className="text-xs text-slate-400 h-10 flex items-center justify-center">
                  {steps[loadingStep]}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          ) : report ? (
            /* Premium Credit Bureau Report Presentation */
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-6 shadow-premium dark:shadow-premium-dark">
                
                {/* Header Summary block */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Equifax & TransUnion CIBIL Record</span>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{report.name}</h2>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      ID: {report.panOrAadhaar} &bull; Check Date: {new Date(report.checkedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className={`px-4 py-2 text-xs font-bold border rounded-2xl ${getScoreBgClass(report.score)}`}>
                    Status: {report.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Radial Gauge Meter */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Background track circle */}
                        <circle
                          cx="72"
                          cy="72"
                          r="50"
                          strokeWidth="8"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-800"
                          fill="transparent"
                        />
                        {/* Foreground score progress circle */}
                        <circle
                          cx="72"
                          cy="72"
                          r="50"
                          strokeWidth="8"
                          strokeDasharray="314.16"
                          strokeDashoffset={getStrokeDashOffset(report.score)}
                          strokeLinecap="round"
                          fill="transparent"
                          className={`transition-all duration-1000 ease-out ${getScoreColorClass(report.score)}`}
                        />
                      </svg>
                      {/* Score display text inside circle */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                          {report.score}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                          CIBIL
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 mt-2">
                      Credit Score Range: 300 to 900
                    </span>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="md:col-span-8 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Accounts</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">{report.activeAccounts} Accounts</span>
                      <span className="text-[9px] text-slate-400">Total lines tracked</span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Outstanding</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">INR {report.totalOutstanding.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400">Active credit balance</span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">On-Time Repayments</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-500">{report.paymentHistory}%</span>
                      <span className="text-[9px] text-slate-400">Payment punctuality ratio</span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recent Inquiries</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">{report.inquiries} Inquiries</span>
                      <span className="text-[9px] text-slate-400">Within past 12 months</span>
                    </div>
                  </div>
                </div>

                {/* Account Details Table */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Details & History</span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Info size={11} /> Microfinance & banking records
                    </span>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3">Lender</th>
                          <th className="p-3">Loan Type</th>
                          <th className="p-3">Sanctioned</th>
                          <th className="p-3">Current Balance</th>
                          <th className="p-3">Opened</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {report.accounts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                              No active credit accounts found for this profile.
                            </td>
                          </tr>
                        ) : (
                          report.accounts.map((acc, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                              <td className="p-3 font-bold flex items-center gap-1.5">
                                <Building2 size={12} className="text-slate-400" />
                                {acc.lender}
                              </td>
                              <td className="p-3 text-slate-500">{acc.type}</td>
                              <td className="p-3 font-semibold">INR {acc.sanctionedAmount.toLocaleString()}</td>
                              <td className="p-3 font-semibold">INR {acc.currentBalance.toLocaleString()}</td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{acc.openedDate}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                                  acc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                                  acc.status === 'Closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                                  'bg-rose-500/10 text-rose-500'
                                }`}>
                                  {acc.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Blank state */
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col items-center justify-center text-center gap-4 shadow-premium dark:shadow-premium-dark min-h-[400px]">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-700 rounded-3xl">
                <HelpCircle size={40} />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-350">Credit Report Ledger is empty</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter an applicant's full name along with their PAN or Aadhaar card details on the left, and submit to check credit scoring.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
