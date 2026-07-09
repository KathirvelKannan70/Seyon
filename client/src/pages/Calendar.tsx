import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, fetchAPI } from '../App.tsx';
import { CalendarDays, Clock, MapPin, Users, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CalendarPage() {
  const { token } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Queries
  const { data: kulusData, isLoading: kulusLoading } = useQuery({
    queryKey: ['kulus'],
    queryFn: () => fetchAPI('/kulus', 'GET', null, token),
  });

  const { data: loansData } = useQuery({
    queryKey: ['loans'],
    queryFn: () => fetchAPI('/loans', 'GET', null, token),
  });

  // Calculate Calendar Days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad previous month days
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
      days.push(null);
    }
    // Current month days
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysOfWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getKulusForDate = (date: Date | null) => {
    if (!date) return [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = days[date.getDay()];
    return kulusData?.data?.filter((k: any) => {
      if (k.meetingDay !== weekday || k.status !== 'active') return false;

      if (k.startDate) {
        const start = new Date(k.startDate);
        start.setHours(0, 0, 0, 0);
        const cellDate = new Date(date);
        cellDate.setHours(0, 0, 0, 0);

        if (cellDate < start) return false;

        const diffTime = cellDate.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 140) return false; // 20 weeks is 140 days (140 days exclusive limit)
      }
      return true;
    }) || [];
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections Calendar</h1>
          <p className="text-xs text-slate-500">Track and highlight Kulu meeting days and weekly loan EMIs schedules.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-1.5 rounded-2xl shadow-sm text-xs font-bold">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronLeft size={16} />
          </button>
          <span>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800/40">
            {daysOfWeekLabels.map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {kulusLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => {
                const meetings = getKulusForDate(date);
                const hasMeetings = meetings.length > 0;
                
                return (
                  <div
                    key={idx}
                    className={`min-h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                      !date ? 'border-transparent bg-transparent pointer-events-none' :
                      hasMeetings ? 'border-brand-500/20 bg-brand-500/5 dark:bg-brand-500/5' :
                      'border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-950/20'
                    }`}
                  >
                    {date && (
                      <>
                        <span className={`text-[10px] font-bold ${hasMeetings ? 'text-brand-500' : 'text-slate-400'}`}>
                          {date.getDate()}
                        </span>
                        {hasMeetings && (
                          <div className="flex flex-col gap-0.5">
                            {meetings.slice(0, 2).map((k: any) => (
                              <div key={k._id} className="px-1 py-0.5 bg-brand-500 text-white rounded text-[7px] truncate font-bold uppercase" title={k.name}>
                                {k.name}
                              </div>
                            ))}
                            {meetings.length > 2 && (
                              <span className="text-[7px] text-slate-400 font-bold">+{meetings.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule Sidebar Details */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-premium dark:shadow-premium-dark">
          <span className="text-sm font-bold flex items-center gap-1.5">
            <CalendarDays size={16} className="text-brand-500" /> Weekday Group Meetings
          </span>
          <p className="text-[10px] text-slate-400">List of enrolled groups and recurring collections day maps.</p>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] mt-2">
            {kulusData?.data?.length === 0 ? (
              <span className="text-center py-6 text-slate-400 text-xs">No active Kulus found.</span>
            ) : (
              kulusData?.data?.map((kulu: any) => (
                <div key={kulu._id} className="p-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-100/50 dark:border-slate-800/20 rounded-2xl flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{kulu.name}</span>
                    <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-bold rounded uppercase">
                      {kulu.meetingDay}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{kulu.collectionTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} />
                      <span className="truncate">{kulu.area?.name || 'No Area'}</span>
                    </div>
                    {kulu.startDate && (
                      <div className="flex items-center gap-1 col-span-2 mt-0.5 text-slate-400/80">
                        <CalendarDays size={10} />
                        <span className="truncate">
                          Range: {new Date(kulu.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {
                            new Date(new Date(kulu.startDate).getTime() + 19 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 col-span-2 mt-0.5">
                      <Users size={10} />
                      <span>Officer: {kulu.fieldOfficer?.name || 'Unassigned'}</span>
                    </div>
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
