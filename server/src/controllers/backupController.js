import mongoose from 'mongoose';
import fs from 'fs';
import Area from '../models/Area.js';
import Kulu from '../models/Kulu.js';
import Member from '../models/Member.js';
import LoanScheme from '../models/LoanScheme.js';
import Loan from '../models/Loan.js';
import WeeklyCollection from '../models/WeeklyCollection.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

export const exportBackup = async (req, res, next) => {
  try {
    const data = {
      version: '1.0.0',
      timestamp: new Date(),
      users: await User.find(),
      areas: await Area.find(),
      kulus: await Kulu.find(),
      members: await Member.find(),
      loanSchemes: await LoanScheme.find(),
      loans: await Loan.find(),
      weeklyCollections: await WeeklyCollection.find(),
      payments: await Payment.find(),
      expenses: await Expense.find(),
      income: await Income.find(),
      settings: await Setting.find(),
    };

    res.setHeader('Content-disposition', 'attachment; filename=seyon_backup_' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(data, null, 2));
    res.end();
  } catch (error) {
    next(error);
  }
};

export const importBackup = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No backup file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const data = JSON.parse(fileContent);

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    if (!data.version || !data.timestamp) {
      return res.status(400).json({ success: false, message: 'Invalid backup file format' });
    }

    // Overwrite database collections
    // Users (keep current log-in user to avoid lockout)
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId).select('+password');

    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped. Re-creating structures...');

    // Restore collections
    if (data.users && data.users.length) await User.insertMany(data.users);
    
    // Ensure current user is still in database to preserve token session
    const restoredUser = await User.findById(currentUserId);
    if (!restoredUser && currentUser) {
      await User.create(currentUser.toObject());
    }

    if (data.areas && data.areas.length) await Area.insertMany(data.areas);
    if (data.kulus && data.kulus.length) await Kulu.insertMany(data.kulus);
    if (data.members && data.members.length) await Member.insertMany(data.members);
    if (data.loanSchemes && data.loanSchemes.length) await LoanScheme.insertMany(data.loanSchemes);
    if (data.loans && data.loans.length) await Loan.insertMany(data.loans);
    if (data.weeklyCollections && data.weeklyCollections.length) await WeeklyCollection.insertMany(data.weeklyCollections);
    if (data.payments && data.payments.length) await Payment.insertMany(data.payments);
    if (data.expenses && data.expenses.length) await Expense.insertMany(data.expenses);
    if (data.income && data.income.length) await Income.insertMany(data.income);
    if (data.settings && data.settings.length) await Setting.insertMany(data.settings);

    await AuditLog.create({
      user: req.user.id,
      action: 'IMPORT_BACKUP',
      details: `Restored database backup. Timestamp of backup: ${data.timestamp}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Database backup restored successfully',
    });
  } catch (error) {
    next(error);
  }
};
