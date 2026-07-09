import Loan from '../models/Loan.js';
import Member from '../models/Member.js';
import LoanScheme from '../models/LoanScheme.js';
import WeeklyCollection from '../models/WeeklyCollection.js';
import Income from '../models/Income.js';
import AuditLog from '../models/AuditLog.js';

export const assignLoan = async (req, res, next) => {
  try {
    const { memberId, schemeId, startDate } = req.body;

    const member = await Member.findById(memberId).populate('kulu');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if member already has active loan
    const activeLoan = await Loan.findOne({ member: memberId, status: { $in: ['active', 'defaulted'] } });
    if (activeLoan) {
      return res.status(400).json({ success: false, message: 'Member already has an active loan' });
    }

    const scheme = await LoanScheme.findById(schemeId);
    if (!scheme || scheme.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active Loan Scheme not found' });
    }

    const start = new Date(startDate || Date.now());
    const durationWeeks = scheme.duration;
    const end = new Date(start.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000);

    // Calculate details
    const loanAmount = scheme.loanAmount;
    const totalPayable = scheme.weeklyEMI * durationWeeks; // total outstanding to be collected
    const loanNumber = 'LN-' + Math.floor(100000 + Math.random() * 900000);

    const loan = await Loan.create({
      loanNumber,
      member: memberId,
      scheme: schemeId,
      loanAmount,
      interestRate: scheme.interestRate,
      weeklyEMI: scheme.weeklyEMI,
      outstandingAmount: totalPayable,
      paidAmount: 0,
      remainingAmount: totalPayable,
      disbursementDate: new Date(),
      startDate: start,
      endDate: end,
      status: 'active',
    });

    // Populate weekly collections schedules
    const weeklySchedules = [];
    for (let i = 1; i <= durationWeeks; i++) {
      const dueDate = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      weeklySchedules.push({
        loan: loan._id,
        member: memberId,
        kulu: member.kulu._id,
        weekNumber: i,
        dueDate,
        dueAmount: scheme.weeklyEMI,
        paidAmount: 0,
        status: 'pending',
      });
    }
    await WeeklyCollection.insertMany(weeklySchedules);

    // Record processing fee as income
    await Income.create({
      category: 'processing_fee',
      amount: scheme.processingFee,
      date: new Date(),
      description: `Processing fee for Loan #${loanNumber}`,
      loan: loan._id,
    });

    await AuditLog.create({
      user: req.user.id,
      action: 'ASSIGN_LOAN',
      details: `Assigned Loan #${loanNumber} to ${member.name}. Principal: ${loanAmount}, EMI: ${scheme.weeklyEMI}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

export const getLoans = async (req, res, next) => {
  try {
    const loans = await Loan.find()
      .populate({
        path: 'member',
        select: 'name phone aadhaarNumber kulu',
        populate: {
          path: 'kulu',
          select: 'name kuluNumber'
        }
      })
      .populate('scheme', 'name loanAmount duration');
    res.status(200).json({ success: true, data: loans });
  } catch (error) {
    next(error);
  }
};

export const getLoanById = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('member')
      .populate('scheme');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    // Fetch complete ledger schedule
    const ledger = await WeeklyCollection.find({ loan: loan._id }).sort({ weekNumber: 1 });
    // Fetch payments logged
    const payments = await Loan.find({ member: loan.member._id }); // Wait, payments should query Payments collection
    // Let's import Payment model if needed, or query it later
    res.status(200).json({
      success: true,
      data: {
        loan,
        ledger,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateLoanStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    loan.status = status;
    await loan.save();

    await AuditLog.create({
      user: req.user.id,
      action: 'UPDATE_LOAN_STATUS',
      details: `Updated Loan #${loan.loanNumber} status to ${status}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};
