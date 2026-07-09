import { useState } from 'react';
import { useAuth, fetchAPI, API_URL } from '../App.tsx';
import {
  FileSpreadsheet, FileText, Database, ShieldAlert,
  Download, Upload, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

export default function Reports() {
  const { token, user } = useAuth();
  
  // Backup file uploading state
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Daily Kulu Ledger Report Parameters
  const [reportDate, setReportDate] = useState('');
  const [reportDay, setReportDay] = useState('');

  const handleDateChange = (val: string) => {
    setReportDate(val);
    if (val) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[new Date(val).getDay()];
      setReportDay(dayName);
    }
  };

  const excelReports = [
    { title: 'Registered Members Directory', desc: 'Aadhaar, phone, PAN, address details, and Kulu groups.', type: 'members' },
    { title: 'Loan Accounts Ledger', desc: 'Disbursements dates, EMI sizes, amounts paid, and remaining balances.', type: 'loans' },
    { title: 'Payments & Collections Ledger', desc: 'All receipt details, times, payment modes, GPS tags, and officers.', type: 'collections' },
    { title: 'Operations Expenses Ledger', desc: 'Salaries, overheads, rents, travel costs, and dates.', type: 'expenses' },
    { title: 'Portfolio Defaulter Accounts', desc: 'All loans marked as defaulted, showing outstanding balances.', type: 'defaulters' },
  ];

  const pdfBriefs = [
    { title: 'Daily Collection Summary Brief', desc: 'Detailed PDF showing transactions collected today.', type: 'daily' },
    { title: 'Weekly Financial Operations Statement', desc: 'Statement showing weekly collections and operational costs.', type: 'weekly' },
    { title: 'Monthly Profit & Loss Audit Report', desc: 'Reconciliation of interest earnings vs overhead expenses.', type: 'monthly' },
  ];

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/backup/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const res = await response.json();
      if (res.success) {
        setSuccessMsg(res.message || 'Database restored successfully!');
      } else {
        setErrorMsg(res.message || 'Restore failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Failed to restore database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Backups Console</h1>
        <p className="text-xs text-slate-500">Download Excel statements, compile PDF financial summaries, and restore backups.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Excel Section */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <FileSpreadsheet size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Bulk Excel Spreadsheets</span>
              <span className="text-[10px] text-slate-400">Download raw operational ledgers (compatible with MS Excel & Sheets)</span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 mt-2">
            {excelReports.map((report) => (
              <div key={report.type} className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-slate-850 last:border-b-0">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{report.title}</span>
                  <span className="text-[10px] text-slate-400">{report.desc}</span>
                </div>
                <a
                  href={`${API_URL}/reports/excel/${report.type}`}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold text-[10px] rounded-xl flex items-center gap-1 hover:scale-105 active:scale-98 transition-all"
                >
                  <Download size={12} /> Excel CSV
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Section */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <FileText size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">PDF Financial Briefs</span>
              <span className="text-[10px] text-slate-400">Compile clean PDF statement briefs with portfolio aggregates</span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 mt-2">
            {pdfBriefs.map((report) => (
              <div key={report.type} className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-slate-850 last:border-b-0">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{report.title}</span>
                  <span className="text-[10px] text-slate-400">{report.desc}</span>
                </div>
                <a
                  href={`${API_URL}/reports/summary?type=${report.type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold text-[10px] rounded-xl flex items-center gap-1 hover:scale-105 active:scale-98 transition-all"
                >
                  <FileText size={12} /> Open PDF
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Kulu Operations Report Generator */}
        <div className="col-span-1 lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
              <FileSpreadsheet size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Daily Kulu Operations Ledger</span>
              <span className="text-[10px] text-slate-400">Generate operations, location, and collection reports for a specific weekday.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-2">
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-semibold text-slate-450">Select Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-semibold text-slate-450">Scheduled Day</label>
              <select
                value={reportDay}
                onChange={(e) => setReportDay(e.target.value)}
                className="form-input"
              >
                <option value="">Choose Weekday...</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <a
                href={reportDate && reportDay ? `${API_URL}/reports/kulu-day/excel?day=${reportDay}&date=${reportDate}` : '#'}
                onClick={(e) => { if (!reportDate || !reportDay) e.preventDefault(); }}
                className={`flex-1 py-2.5 px-3 font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
                  reportDate && reportDay
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:scale-[1.02] active:scale-98'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                }`}
              >
                <Download size={13} /> Excel CSV
              </a>
              <a
                href={reportDate && reportDay ? `${API_URL}/reports/kulu-day/pdf?day=${reportDay}&date=${reportDate}` : '#'}
                onClick={(e) => { if (!reportDate || !reportDay) e.preventDefault(); }}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 py-2.5 px-3 font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
                  reportDate && reportDay
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:scale-[1.02] active:scale-98'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                }`}
              >
                <FileText size={13} /> PDF Report
              </a>
            </div>
          </div>
        </div>

        {/* Backup Restore Section */}
        {user?.role === 'super_admin' && (
          <div className="col-span-1 lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                <Database size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Database Backup & Recovery Console</span>
                <span className="text-[10px] text-slate-400">Generate JSON copies of all collections and restore past points.</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-2 text-xs">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-2 text-xs">
                <CheckCircle size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Export Panel */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold">Generate Safe Backup</span>
                  <span className="text-[10px] text-slate-400">Downloads a structured JSON file containing all user registers, loan schemes, member records, and payment logs.</span>
                </div>
                <a
                  href={`${API_URL}/backup/export`}
                  download
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-md text-center flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download size={13} /> Export Backup File
                </a>
              </div>

              {/* Import Panel */}
              <form onSubmit={handleRestoreSubmit} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                    <ShieldAlert size={14} /> Restore System Point
                  </span>
                  <span className="text-[10px] text-slate-400">
                    WARNING: Restoring will overwrite all existing collections. Please check credentials session safety.
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-[10px] font-mono file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-900 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-300"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                    Restore Overwrite Database
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
