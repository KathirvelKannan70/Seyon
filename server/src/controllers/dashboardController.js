import Area from '../models/Area.js';
import Kulu from '../models/Kulu.js';
import Member from '../models/Member.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import WeeklyCollection from '../models/WeeklyCollection.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import AuditLog from '../models/AuditLog.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[today.getDay()];

    // Counts
    const totalMembers = await Member.countDocuments();
    const totalKulu = await Kulu.countDocuments();
    const activeMembers = await Loan.distinct('member', { status: 'active' }).then(res => res.length);

    // Todays Kulus and Areas
    const todayKulusCount = await Kulu.countDocuments({ meetingDay: currentDayName, status: 'active' });
    const todayKuluList = await Kulu.find({ meetingDay: currentDayName, status: 'active' });
    const todayAreasCount = await Area.countDocuments({
      _id: { $in: todayKuluList.map(k => k.area) }
    });

    // Today's Dues and Collections
    const todayCollections = await Payment.find({
      paymentDate: { $gte: today, $lte: endOfToday }
    });
    const todayCollectedAmount = todayCollections.reduce((acc, p) => acc + p.amountPaid, 0);

    const todaySchedules = await WeeklyCollection.find({
      dueDate: { $gte: today, $lte: endOfToday }
    });
    let todayDueAmount = todaySchedules.reduce((acc, s) => acc + s.dueAmount, 0);
    const todayKuluExpected = todayKuluList.reduce((acc, k) => acc + (k.weeklyRepayment || 0), 0);

    if (todayDueAmount === 0 && todayKuluExpected > 0) {
      todayDueAmount = todayKuluExpected;
    }
    const pendingCollection = Math.max(0, todayDueAmount - todayCollectedAmount);

    // Aggregates
    const allPayments = await Payment.find();
    const totalCollected = allPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    const activeLoans = await Loan.find({ status: { $in: ['active', 'defaulted'] } });
    const outstandingLoans = activeLoans.reduce((acc, l) => acc + l.remainingAmount, 0);

    // Monthly Collections
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyPayments = await Payment.find({ paymentDate: { $gte: startOfMonth } });
    const monthlyCollected = monthlyPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    // Microfinance Working Week Calculation (Monday to Saturday)
    const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() + diffToMon);
    mondayDate.setHours(0, 0, 0, 0);

    const weekDaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDaysFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const collectionGraph = [];
    let weeklyCollected = 0;
    let weeklyDue = 0;

    for (let i = 0; i < 6; i++) {
      const dayStart = new Date(mondayDate);
      dayStart.setDate(mondayDate.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Payments on this weekday
      const dayPayments = await Payment.find({ paymentDate: { $gte: dayStart, $lte: dayEnd } });
      const dayCollected = dayPayments.reduce((acc, p) => acc + p.amountPaid, 0);

      // WeeklyCollection dues on this weekday
      const daySchedules = await WeeklyCollection.find({ dueDate: { $gte: dayStart, $lte: dayEnd } });
      let dayDue = daySchedules.reduce((acc, s) => acc + s.dueAmount, 0);

      // Fallback to active Kulu expected repayment if no schedules generated yet
      const dayKulus = await Kulu.find({ meetingDay: weekDaysFull[i], status: 'active' });
      const dayKuluTarget = dayKulus.reduce((acc, k) => acc + (k.weeklyRepayment || 0), 0);
      if (dayDue === 0 && dayKuluTarget > 0) {
        dayDue = dayKuluTarget;
      }

      const dayPending = Math.max(0, dayDue - dayCollected);

      weeklyCollected += dayCollected;
      weeklyDue += dayDue;

      collectionGraph.push({
        name: weekDaysShort[i],
        fullName: weekDaysFull[i],
        Collected: dayCollected,
        Target: dayDue,
        Pending: dayPending,
      });
    }

    const weeklyPending = Math.max(0, weeklyDue - weeklyCollected);

    // Expenses vs Income (P&L Ledger)
    const expenses = await Expense.find();
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalCollected - totalExpenses;

    // Top Performing Area
    const areaPayments = await Payment.find().populate({
      path: 'member',
      populate: { path: 'kulu', populate: { path: 'area' } }
    });

    const areaScores = {};
    areaPayments.forEach(p => {
      const aName = p.member?.kulu?.area?.name;
      if (aName) {
        areaScores[aName] = (areaScores[aName] || 0) + p.amountPaid;
      }
    });

    let topPerformingArea = 'N/A';
    let maxAreaCollection = 0;
    Object.entries(areaScores).forEach(([name, sum]) => {
      if (sum > maxAreaCollection) {
        maxAreaCollection = sum;
        topPerformingArea = name;
      }
    });

    // Recent Activity
    const recentActivity = await AuditLog.find()
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          todayCollection: todayCollectedAmount,
          todayDue: todayDueAmount,
          todayKulu: todayKulusCount,
          todayAreas: todayAreasCount,
          pendingCollection,
          totalCollected,
          monthlyCollection: monthlyCollected,
          weeklyCollection: weeklyCollected,
          weeklyDue,
          weeklyPending,
          outstandingLoans,
          activeMembers,
          totalMembers,
          totalKulu,
          netProfit,
          totalExpenses,
          topPerformingArea: `${topPerformingArea} (${maxAreaCollection.toFixed(0)} Collected)`,
        },
        collectionGraph,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};
