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
    const currentDay = days[new Date().getDay()];

    // Counts
    const totalMembers = await Member.countDocuments();
    const totalKulu = await Kulu.countDocuments();
    const activeMembers = await Loan.distinct('member', { status: 'active' }).then(res => res.length);

    // Todays Kulus and Areas
    const todayKulusCount = await Kulu.countDocuments({ meetingDay: currentDay, status: 'active' });
    const todayKuluList = await Kulu.find({ meetingDay: currentDay, status: 'active' });
    const todayAreasCount = await Area.countDocuments({
      _id: { $in: todayKuluList.map(k => k.area) }
    });

    // Today's Dues and Collections
    const todaySchedules = await WeeklyCollection.find({
      dueDate: { $gte: today, $lte: endOfToday }
    });
    const todayDueAmount = todaySchedules.reduce((acc, s) => acc + s.dueAmount, 0);

    const todayCollections = await Payment.find({
      paymentDate: { $gte: today, $lte: endOfToday }
    });
    const todayCollectedAmount = todayCollections.reduce((acc, p) => acc + p.amountPaid, 0);
    const pendingCollection = Math.max(0, todayDueAmount - todayCollectedAmount);

    // Aggregates
    const allPayments = await Payment.find();
    const totalCollected = allPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    const activeLoans = await Loan.find({ status: { $in: ['active', 'defaulted'] } });
    const outstandingLoans = activeLoans.reduce((acc, l) => acc + l.remainingAmount, 0);

    // Monthly & Weekly Collections
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    const monthlyPayments = await Payment.find({ paymentDate: { $gte: startOfMonth } });
    const monthlyCollected = monthlyPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    const weeklyPayments = await Payment.find({ paymentDate: { $gte: startOfWeek } });
    const weeklyCollected = weeklyPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    // Expenses vs Income (P&L Ledger)
    const expenses = await Expense.find();
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const incomes = await Income.find();
    const totalIncomes = incomes.reduce((acc, i) => acc + i.amount, 0);
    const netProfit = totalCollected - totalExpenses; // returns on capital minus operational expenses

    // Collection trend (last 7 days)
    const trendDays = [];
    const trendCollections = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const daysPayments = await Payment.find({ paymentDate: { $gte: d, $lte: dEnd } });
      const dailySum = daysPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      
      trendDays.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      trendCollections.push(dailySum);
    }

    // Top Performing Area
    // Calculate total collection per area
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
          outstandingLoans,
          activeMembers,
          totalMembers,
          totalKulu,
          netProfit,
          totalExpenses,
          topPerformingArea: `${topPerformingArea} (${maxAreaCollection.toFixed(0)} Collected)`,
        },
        collectionGraph: trendDays.map((day, idx) => ({
          name: day,
          Collected: trendCollections[idx],
        })),
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};
