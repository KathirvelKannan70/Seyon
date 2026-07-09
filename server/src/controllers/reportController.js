import PDFDocument from 'pdfkit';
import Payment from '../models/Payment.js';
import Loan from '../models/Loan.js';
import Member from '../models/Member.js';
import Area from '../models/Area.js';
import Kulu from '../models/Kulu.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';

// Receipt PDF Generator
export const getReceiptPDF = async (req, res, next) => {
  try {
    const { receiptNumber } = req.params;
    const payment = await Payment.findOne({ receiptNumber })
      .populate('member')
      .populate({
        path: 'loan',
        populate: { path: 'scheme' },
      })
      .populate('officer', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const doc = new PDFDocument({ size: 'A5', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt_${receiptNumber}.pdf`);
    doc.pipe(res);

    // Decorative Header Block
    doc.fillColor('#0f172a').rect(0, 0, 420, 60).fill();
    doc.fillColor('#ffffff').fontSize(14).text('SEYON MICROFINANCE MANAGEMENT', 30, 22, { align: 'center', characterSpacing: 1 });
    
    // Receipt Label
    doc.fillColor('#0f172a').fontSize(12).text('PAYMENT RECEIPT VOUCHER', 30, 75, { align: 'center', underline: true });

    // Table details
    doc.fontSize(9).fillColor('#334155');
    
    let y = 105;
    const drawRow = (label, val) => {
      doc.font('Helvetica-Bold').text(label, 30, y);
      doc.font('Helvetica').text(String(val), 180, y);
      y += 18;
    };

    drawRow('Receipt Number:', payment.receiptNumber);
    drawRow('Date & Time:', new Date(payment.paymentDate).toLocaleString());
    drawRow('Member Name:', payment.member.name);
    drawRow('Father\'s Name:', payment.member.fatherName);
    drawRow('Aadhaar Number:', payment.member.aadhaarNumber);
    drawRow('Loan Account:', payment.loan.loanNumber);
    drawRow('Loan Scheme:', payment.loan.scheme.name);
    drawRow('EMI Week Number:', `Week ${payment.weekNumber}`);
    drawRow('Payment Mode:', payment.paymentMode);
    drawRow('Collection Officer:', payment.officer.name);
    drawRow('Payment Status:', payment.status.toUpperCase());
    
    // Total Amount Box
    y += 5;
    doc.fillColor('#f8fafc').rect(30, y, 360, 30).fill();
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('AMOUNT PAID:', 45, y + 10);
    doc.fillColor('#15803d').fontSize(12).text(`INR ${payment.amountPaid.toFixed(2)}`, 180, y + 9);

    y += 45;
    // Disclaimers & Signatures
    doc.fillColor('#64748b').fontSize(8).text('This is an computer generated e-receipt. Valid GPS coordinates logged.', 30, y, { align: 'center' });
    if (payment.gpsLocation?.latitude) {
      doc.text(`GPS Tag: Lat ${payment.gpsLocation.latitude.toFixed(4)}, Lng ${payment.gpsLocation.longitude.toFixed(4)}`, 30, y + 10, { align: 'center' });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

// Excel CSV Exports
export const exportReportExcel = async (req, res, next) => {
  try {
    const { type } = req.params; // 'members', 'loans', 'collections', 'expenses', 'defaulters'
    let csvContent = '';
    let filename = '';

    if (type === 'members') {
      filename = 'members_report.csv';
      const items = await Member.find().populate({ path: 'kulu', populate: { path: 'area' } });
      csvContent = 'Member Name,Father Name,Phone,Aadhaar,PAN,Kulu Name,Area Name,KYC Status,Status\n';
      items.forEach(i => {
        csvContent += `"${i.name}","${i.fatherName}","${i.phone}","${i.aadhaarNumber}","${i.pan || ''}","${i.kulu?.name || ''}","${i.kulu?.area?.name || ''}","${i.kycStatus}","${i.status}"\n`;
      });

    } else if (type === 'loans') {
      filename = 'loans_report.csv';
      const items = await Loan.find().populate('member').populate('scheme');
      csvContent = 'Loan Number,Member Name,Scheme,Principal,Weekly EMI,Paid Amount,Remaining,Status\n';
      items.forEach(i => {
        csvContent += `"${i.loanNumber}","${i.member?.name || ''}","${i.scheme?.name || ''}",${i.loanAmount},${i.weeklyEMI},${i.paidAmount},${i.remainingAmount},"${i.status}"\n`;
      });

    } else if (type === 'collections') {
      filename = 'collections_report.csv';
      const items = await Payment.find().populate('member').populate('loan').populate('officer');
      csvContent = 'Receipt Number,Loan Number,Member Name,Amount Paid,Date,Week Number,Mode,Status,Officer\n';
      items.forEach(i => {
        csvContent += `"${i.receiptNumber}","${i.loan?.loanNumber || ''}","${i.member?.name || ''}",${i.amountPaid},"${new Date(i.paymentDate).toLocaleDateString()}",${i.weekNumber},"${i.paymentMode}","${i.status}","${i.officer?.name || ''}"\n`;
      });

    } else if (type === 'expenses') {
      filename = 'expenses_report.csv';
      const items = await Expense.find().populate('staff');
      csvContent = 'Date,Category,Amount,Description,Staff\n';
      items.forEach(i => {
        csvContent += `"${new Date(i.date).toLocaleDateString()}","${i.category}",${i.amount},"${i.description}","${i.staff?.name || ''}"\n`;
      });

    } else if (type === 'defaulters') {
      filename = 'defaulters_report.csv';
      const items = await Loan.find({ status: 'defaulted' }).populate('member').populate('scheme');
      csvContent = 'Loan Number,Member Name,Phone,Scheme,Weekly EMI,Remaining Amount\n';
      items.forEach(i => {
        csvContent += `"${i.loanNumber}","${i.member?.name || ''}","${i.member?.phone || ''}","${i.scheme?.name || ''}",${i.weeklyEMI},${i.remainingAmount}\n`;
      });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Summary PDF Reports
export const getSummaryPDFReport = async (req, res, next) => {
  try {
    const { type } = req.query; // e.g., 'daily', 'weekly', 'monthly', 'yearly'
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=seyon_summary_${type}_report.pdf`);
    doc.pipe(res);

    // Styling Header
    doc.fillColor('#0f172a').rect(0, 0, 600, 70).fill();
    doc.fillColor('#ffffff').fontSize(16).text('SEYON MICROFINANCE MANAGEMENT SYSTEM', 40, 26);
    doc.fontSize(10).fillColor('#94a3b8').text(`FINANCIAL SUMMARY STATEMENT - ${type?.toUpperCase() || 'GENERAL'}`, 40, 46);

    const loansCount = await Loan.countDocuments();
    const activeLoans = await Loan.find({ status: 'active' });
    const membersCount = await Member.countDocuments();
    
    // Aggregate income & expenses
    const payments = await Payment.find();
    const expenses = await Expense.find();

    const totalCollected = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const outstandingLoans = activeLoans.reduce((acc, l) => acc + l.remainingAmount, 0);

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text('Operational Aggregates', 40, 95);
    
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    let y = 120;
    const printLine = (label, val) => {
      doc.font('Helvetica-Bold').text(label, 40, y);
      doc.font('Helvetica').text(String(val), 280, y);
      y += 20;
    };

    printLine('Total System Members:', membersCount);
    printLine('Total Loans Disbursed:', loansCount);
    printLine('Total Collections Collected:', `INR ${totalCollected.toFixed(2)}`);
    printLine('Total Expenses Logged:', `INR ${totalExpenses.toFixed(2)}`);
    printLine('Outstanding Active Loan Portfolio:', `INR ${outstandingLoans.toFixed(2)}`);
    printLine('Net Operational Profit/Loss:', `INR ${(totalCollected - totalExpenses).toFixed(2)}`);

    y += 20;
    doc.font('Helvetica-Bold').fontSize(13).text('Defaulters / Risk Summary', 40, y);
    y += 25;

    const defaulters = await Loan.find({ status: 'defaulted' }).populate('member');
    printLine('Total Active Defaulted Loans:', defaulters.length);
    const defaultSum = defaulters.reduce((acc, d) => acc + d.remainingAmount, 0);
    printLine('Total Defaulted Balance Portfolio:', `INR ${defaultSum.toFixed(2)}`);

    y += 20;
    doc.fontSize(8).fillColor('#94a3b8').text('This document acts as an automated operational brief and is verified by audit trails. Internal use only.', 40, y, { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// Daily Kulu Excel CSV report
export const exportKuluDayExcel = async (req, res, next) => {
  try {
    const { day, date } = req.query;
    if (!day || !date) {
      return res.status(400).json({ success: false, message: 'Day and Date parameters are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const kulus = await Kulu.find({ meetingDay: day, status: 'active' })
      .populate('area')
      .populate('fieldOfficer');

    const permanentSchemes = {
      '10k': { amount: 10000, emi: 800 },
      '15k': { amount: 15000, emi: 930 },
      '20k': { amount: 20000, emi: 1100 },
    };

    let csvContent = '\uFEFFKulu Number,Kulu Name,Scheme,Location (Area),Officer,Members,Expected EMI,Amount Collected,Pending Amount\n';

    for (const kulu of kulus) {
      const members = await Member.find({ kulu: kulu._id });
      const memberCount = members.length;
      const scheme = permanentSchemes[kulu.schemeType || '15k'];
      const expected = memberCount * scheme.emi;

      const memberIds = members.map(m => m._id);
      const payments = await Payment.find({
        member: { $in: memberIds },
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      const collected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const pending = Math.max(0, expected - collected);

      csvContent += `"${kulu.kuluNumber}","${kulu.name}","${kulu.schemeType?.toUpperCase() || '15K'}","${kulu.area?.name || 'Unassigned'}","${kulu.fieldOfficer?.name || 'Unassigned'}",${memberCount},${expected},${collected},${pending}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=kulus_report_${day}_${date}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Daily Kulu PDF report
export const getKuluDayPDF = async (req, res, next) => {
  try {
    const { day, date } = req.query;
    if (!day || !date) {
      return res.status(400).json({ success: false, message: 'Day and Date parameters are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const kulus = await Kulu.find({ meetingDay: day, status: 'active' })
      .populate('area')
      .populate('fieldOfficer');

    const permanentSchemes = {
      '10k': { amount: 10000, emi: 800 },
      '15k': { amount: 15000, emi: 930 },
      '20k': { amount: 20000, emi: 1100 },
    };

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kulus_report_${day}_${date}.pdf`);
    doc.pipe(res);

    // Styling Header
    doc.fillColor('#0f172a').rect(0, 0, 600, 70).fill();
    doc.fillColor('#ffffff').fontSize(14).text('SEYON MICROFINANCE SYSTEM', 40, 20);
    doc.fontSize(10).fillColor('#94a3b8').text(`KULU OPERATIONS LEDGER - ${day.toUpperCase()} (${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`, 40, 42);

    let y = 95;
    
    // Draw table headers
    doc.fillColor('#f1f5f9').rect(40, y, 515, 20).fill();
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8);
    doc.text('KULU NAME', 45, y + 6);
    doc.text('SCHEME', 150, y + 6);
    doc.text('LOCATION (AREA)', 210, y + 6);
    doc.text('MEMBERS', 320, y + 6);
    doc.text('EXPECTED', 380, y + 6);
    doc.text('COLLECTED', 440, y + 6);
    doc.text('PENDING', 500, y + 6);
    y += 20;

    doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    let totalExpectedSum = 0;
    let totalCollectedSum = 0;

    for (const kulu of kulus) {
      const members = await Member.find({ kulu: kulu._id });
      const memberCount = members.length;
      const scheme = permanentSchemes[kulu.schemeType || '15k'];
      const expected = memberCount * scheme.emi;

      const memberIds = members.map(m => m._id);
      const payments = await Payment.find({
        member: { $in: memberIds },
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      const collected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const pending = Math.max(0, expected - collected);

      totalExpectedSum += expected;
      totalCollectedSum += collected;

      // Draw row lines
      doc.text(kulu.name.slice(0, 18), 45, y + 6);
      doc.text(kulu.schemeType?.toUpperCase() || '15K', 150, y + 6);
      doc.text(kulu.area?.name?.slice(0, 18) || 'Unassigned', 210, y + 6);
      doc.text(`${memberCount} members`, 320, y + 6);
      doc.text(`INR ${expected.toLocaleString()}`, 380, y + 6);
      doc.text(`INR ${collected.toLocaleString()}`, 440, y + 6);
      doc.text(`INR ${pending.toLocaleString()}`, 500, y + 6);
      
      // Draw border separator line
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, y + 18).lineTo(555, y + 18).stroke();
      y += 18;

      if (y > 750) {
        doc.addPage();
        y = 50;
      }
    }

    // Print Total Summary
    y += 10;
    doc.fillColor('#f8fafc').rect(40, y, 515, 30).fill();
    doc.strokeColor('#cbd5e1').lineWidth(1).rect(40, y, 515, 30).stroke();
    
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL SUMMARY:', 50, y + 11);
    
    doc.text(`Expected: INR ${totalExpectedSum.toLocaleString()}`, 180, y + 11);
    doc.fillColor('#15803d');
    doc.text(`Collected: INR ${totalCollectedSum.toLocaleString()}`, 300, y + 11);
    
    const totalPendingSum = Math.max(0, totalExpectedSum - totalCollectedSum);
    doc.fillColor(totalPendingSum > 0 ? '#b91c1c' : '#15803d');
    doc.text(`Pending: INR ${totalPendingSum.toLocaleString()}`, 425, y + 11);

    doc.end();
  } catch (error) {
    next(error);
  }
};
