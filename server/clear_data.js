import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Area from './src/models/Area.js';
import Kulu from './src/models/Kulu.js';
import Member from './src/models/Member.js';
import LoanScheme from './src/models/LoanScheme.js';
import Loan from './src/models/Loan.js';
import WeeklyCollection from './src/models/WeeklyCollection.js';
import Payment from './src/models/Payment.js';
import Expense from './src/models/Expense.js';
import Income from './src/models/Income.js';
import AuditLog from './src/models/AuditLog.js';
import Notification from './src/models/Notification.js';
import Setting from './src/models/Setting.js';

dotenv.config();

const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/seyon';

const clearDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(connStr);
    console.log('Connected. Wiping mock operational data...');

    // Wipe transactional data
    await Payment.deleteMany({});
    await Loan.deleteMany({});
    await WeeklyCollection.deleteMany({});
    await Member.deleteMany({});
    await Kulu.deleteMany({});
    await Area.deleteMany({});
    await Expense.deleteMany({});
    await Income.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});
    await Setting.deleteMany({});
    await LoanScheme.deleteMany({});

    console.log('Transactional portfolios cleared.');

    // Clear and restore a clean Super Admin user
    await User.deleteMany({});
    console.log('Users collection cleared. Creating default Super Admin...');
    
    await User.create({
      name: 'Seyon Super Admin',
      email: 'admin@seyon.com',
      password: 'admin123',
      role: 'super_admin',
      status: 'active',
    });

    console.log('Default administrator created (admin@seyon.com / admin123).');
    console.log('DATABASE CLEANUP COMPLETED SUCCESSFULLY!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Wipe script error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

clearDatabase();
