import Kulu from '../models/Kulu.js';
import Member from '../models/Member.js';
import Loan from '../models/Loan.js';
import WeeklyCollection from '../models/WeeklyCollection.js';
import Payment from '../models/Payment.js';
import Income from '../models/Income.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import LoanScheme from '../models/LoanScheme.js';

export const getTodayCollections = async (req, res, next) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const targetDay = req.query.day || days[todayIndex];

    // Find Kulus scheduled for this day
    const kulus = await Kulu.find({ meetingDay: targetDay, status: 'active' })
      .populate('area', 'name code')
      .populate('fieldOfficer', 'name');

    const result = [];

    for (const kulu of kulus) {
      const members = await Member.find({ kulu: kulu._id, status: 'active' });
      const membersList = [];

      for (const member of members) {
        let loan = await Loan.findOne({ member: member._id, status: { $in: ['active', 'defaulted'] } });
        let activeEmi = null;

        const schemeMap = {
          '10k': { amount: 10000, emi: 800 },
          '15k': { amount: 15000, emi: 930 },
          '20k': { amount: 20000, emi: 1100 },
        };
        const scheme = schemeMap[kulu.schemeType || '15k'];

        if (!loan) {
          const schemeNameStr = `${kulu.schemeType?.toUpperCase() || '15K'} Auto-Scheme`;

          // Find or create default LoanScheme representation
          let dbScheme = await LoanScheme.findOne({ name: schemeNameStr });
          if (!dbScheme) {
            dbScheme = await LoanScheme.create({
              name: schemeNameStr,
              loanAmount: scheme.amount,
              interestRate: 10,
              processingFee: 300,
              duration: 20,
              weeklyEMI: scheme.emi,
              lateFine: 50,
              graceDays: 2,
              status: 'active',
            });
          }

          const loanNumber = 'LN-' + Math.floor(100000 + Math.random() * 900000);
          const startDate = kulu.startDate || new Date();
          const endDate = new Date(new Date(startDate).getTime() + 20 * 7 * 24 * 60 * 60 * 1000);

          loan = await Loan.create({
            loanNumber,
            member: member._id,
            scheme: dbScheme._id,
            loanAmount: scheme.amount,
            interestRate: 10,
            weeklyEMI: scheme.emi,
            outstandingAmount: scheme.amount,
            paidAmount: 0,
            remainingAmount: scheme.amount,
            startDate,
            endDate,
            status: 'active',
          });
        }

        // Self-heal: If no collections exist for this loan, create them now with the required kulu ID
        const scheduleCount = await WeeklyCollection.countDocuments({ loan: loan._id });
        if (scheduleCount === 0) {
          const schedule = [];
          const start = new Date(loan.startDate || kulu.startDate || new Date());
          for (let i = 1; i <= 20; i++) {
            const dueDate = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            schedule.push({
              loan: loan._id,
              member: member._id,
              kulu: kulu._id, // Required mongoose reference
              weekNumber: i,
              dueDate,
              dueAmount: scheme.emi,
              paidAmount: 0,
              status: 'pending',
            });
          }
          await WeeklyCollection.insertMany(schedule);
        }

        // Find the current pending/partial/late week
        activeEmi = await WeeklyCollection.findOne({
          loan: loan._id,
          status: { $in: ['pending', 'partial', 'late'] },
        }).sort({ weekNumber: 1 });

        membersList.push({
          member,
          loan,
          activeEmi,
        });
      }

      result.push({
        kulu,
        members: membersList,
      });
    }

    res.status(200).json({
      success: true,
      day: targetDay,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const collectPayment = async (req, res, next) => {
  try {
    const { loanId, amountPaid, paymentMode, status, gpsLocation, remarks } = req.body;

    const loan = await Loan.findById(loanId).populate('member');
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Active Loan account not found' });
    }

    // Find the active schedule week
    const activeEmi = await WeeklyCollection.findOne({
      loan: loan._id,
      status: { $in: ['pending', 'partial', 'late'] },
    }).sort({ weekNumber: 1 });

    if (!activeEmi) {
      return res.status(400).json({ success: false, message: 'No pending EMI schedule found for this loan' });
    }

    const receiptNumber = 'REC-' + Math.floor(100000 + Math.random() * 900000);
    const numericAmount = Number(amountPaid);

    // Create payment transaction
    const payment = await Payment.create({
      receiptNumber,
      loan: loan._id,
      member: loan.member._id,
      weeklyCollection: activeEmi._id,
      officer: req.user.id,
      amountPaid: numericAmount,
      paymentMode: paymentMode || 'Cash',
      status, // 'paid', 'partial', 'skipped', 'late'
      gpsLocation,
      remarks,
    });

    // Update EMI Schedule week
    if (status === 'skipped') {
      activeEmi.status = 'skipped';
      activeEmi.remarks = remarks;
    } else if (status === 'late') {
      activeEmi.status = 'late';
      activeEmi.remarks = remarks;
    } else {
      activeEmi.paidAmount += numericAmount;
      if (activeEmi.paidAmount >= activeEmi.dueAmount) {
        activeEmi.status = 'paid';
      } else {
        activeEmi.status = 'partial';
      }
      activeEmi.remarks = remarks;
    }
    await activeEmi.save();

    // Update Loan balances
    if (status !== 'skipped') {
      loan.paidAmount += numericAmount;
      loan.remainingAmount = Math.max(0, loan.outstandingAmount - loan.paidAmount);

      if (loan.remainingAmount <= 0) {
        loan.status = 'completed';
      }
      await loan.save();

      // Log interest return on the Income ledger
      await Income.create({
        category: 'interest',
        amount: numericAmount,
        date: new Date(),
        description: `Collection EMI Week ${activeEmi.weekNumber} for Loan #${loan.loanNumber}`,
        loan: loan._id,
      });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'COLLECT_EMI',
      details: `Collected ${numericAmount} (Receipt: ${receiptNumber}) from ${loan.member.name} for Loan #${loan.loanNumber} Week ${activeEmi.weekNumber}. Status: ${status}`,
      ipAddress: req.ip,
    });

    let alertMsg = '';
    if (status === 'skipped') {
      alertMsg = `Skipped Week ${activeEmi.weekNumber} collection for ${loan.member.name} (Loan #${loan.loanNumber})`;
    } else if (status === 'late') {
      alertMsg = `Marked Week ${activeEmi.weekNumber} collection for ${loan.member.name} as LATE (Loan #${loan.loanNumber})`;
    } else {
      alertMsg = `Collected ₹${numericAmount.toLocaleString()} from ${loan.member.name} for Week ${activeEmi.weekNumber} (Receipt: ${receiptNumber})`;
    }

    await Notification.create({
      type: 'reminder',
      message: alertMsg,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        payment,
        loan,
        activeEmi,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk collect payment for entire Kulu
export const bulkCollectPayment = async (req, res, next) => {
  try {
    const { kuluId, paymentMode = 'cash', remarks = 'Bulk Kulu Collection' } = req.body;
    
    // Find the Kulu
    const kulu = await Kulu.findById(kuluId);
    if (!kulu) {
      return res.status(404).json({ success: false, message: 'Kulu not found' });
    }

    // Find all active members in this Kulu
    const members = await Member.find({ kulu: kuluId, status: 'active' });
    
    const collectionsLogged = [];

    for (const member of members) {
      // Find the active loan for this member
      const loan = await Loan.findOne({ member: member._id, status: { $in: ['active', 'defaulted'] } });
      if (!loan) continue;

      // Find the current pending/partial/late week collection
      const activeEmi = await WeeklyCollection.findOne({
        loan: loan._id,
        status: { $in: ['pending', 'partial', 'late'] },
      }).sort({ weekNumber: 1 });

      if (!activeEmi) continue;

      // Calculate amount to pay (the remaining EMI due for the week)
      const dueAmount = activeEmi.dueAmount - activeEmi.paidAmount;
      if (dueAmount <= 0) continue;

      // Update WeeklyCollection status
      activeEmi.paidAmount += dueAmount;
      activeEmi.status = 'paid';
      activeEmi.remarks = remarks;
      await activeEmi.save();

      // Update Loan aggregates
      loan.paidAmount += dueAmount;
      loan.remainingAmount = Math.max(0, loan.outstandingAmount - loan.paidAmount);
      if (loan.remainingAmount === 0) {
        loan.status = 'completed';
      }
      await loan.save();

      // Create Payment record
      const receiptNumber = 'REC-' + Math.floor(100000 + Math.random() * 900000);
      const payment = await Payment.create({
        receiptNumber,
        loan: loan._id,
        member: member._id,
        weeklyCollection: activeEmi._id,
        amountPaid: dueAmount,
        paymentMode,
        officer: req.user.id,
        status: 'completed',
        remarks,
      });

      // Record income
      await Income.create({
        category: 'emi_collection',
        amount: dueAmount,
        date: new Date(),
        description: `EMI Collection for Kulu ${kulu.name} - ${member.name} (Week ${activeEmi.weekNumber})`,
        payment: payment._id,
      });

      // Add Notification
      await Notification.create({
        type: 'reminder',
        message: `Collected ₹${dueAmount.toLocaleString()} from ${member.name} for Week ${activeEmi.weekNumber} (Receipt: ${receiptNumber})`,
        user: req.user.id,
      });

      collectionsLogged.push({
        memberName: member.name,
        amountPaid: dueAmount,
        receiptNumber,
      });
    }

    // Log Audit
    await AuditLog.create({
      user: req.user.id,
      action: 'BULK_COLLECT',
      details: `Bulk collected EMIs for Kulu: ${kulu.name}. Members collected: ${collectionsLogged.length}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Successfully collected payments for ${collectionsLogged.length} members.`,
      data: collectionsLogged,
    });
  } catch (error) {
    next(error);
  }
};
