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

dotenv.config();

const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/seyon';

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(connStr);
    console.log('Database connected. Resetting existing data...');

    // Clear all collections
    await User.deleteMany();
    await Area.deleteMany();
    await Kulu.deleteMany();
    await Member.deleteMany();
    await LoanScheme.deleteMany();
    await Loan.deleteMany();
    await WeeklyCollection.deleteMany();
    await Payment.deleteMany();
    await Expense.deleteMany();
    await Income.deleteMany();
    await AuditLog.deleteMany();

    console.log('Collections cleared. Creating staff users...');

    // Create Staff Users
    const superAdmin = await User.create({
      name: 'Seyon Super Admin',
      email: 'admin@seyon.com',
      password: 'admin123',
      role: 'super_admin',
      status: 'active',
    });

    const manager = await User.create({
      name: 'Seyon Manager',
      email: 'manager@seyon.com',
      password: 'manager123',
      role: 'manager',
      status: 'active',
    });

    const officer = await User.create({
      name: 'Karthik Officer',
      email: 'officer@seyon.com',
      password: 'officer123',
      role: 'officer',
      status: 'active',
    });

    const viewer = await User.create({
      name: 'Seyon Auditor',
      email: 'viewer@seyon.com',
      password: 'viewer123',
      role: 'viewer',
      status: 'active',
    });

    console.log('Staff users created. Creating Areas...');

    // Create Areas
    const areaNorth = await Area.create({
      name: 'Madurai North',
      code: 'MDU-N',
      description: 'Urban microfinance division, Madurai North',
      status: 'active',
      meetingNotes: 'Weekly review on Friday evening',
    });

    const areaRural = await Area.create({
      name: 'Periyakulam Rural',
      code: 'PKM-R',
      description: 'Rural community groups in Periyakulam valley',
      status: 'active',
      meetingNotes: 'Collect by 11:00 AM on Tuesdays',
    });

    console.log('Areas created. Creating Kulus...');

    // Create Kulus
    const FridayKulu = await Kulu.create({
      kuluNumber: 'KULU-101',
      name: 'Annai Street Kulu',
      meetingDay: 'Friday',
      collectionTime: '09:30 AM',
      area: areaNorth._id,
      fieldOfficer: officer._id,
      status: 'active',
      notes: 'Group meets at Annai temple tree. Highly punctual group.',
    });

    const TuesdayKulu = await Kulu.create({
      kuluNumber: 'KULU-102',
      name: 'Sakthi Street Kulu',
      meetingDay: 'Tuesday',
      collectionTime: '10:30 AM',
      area: areaRural._id,
      fieldOfficer: officer._id,
      status: 'active',
      notes: 'Group meets near Sakthi community hall.',
    });

    console.log('Kulus created. Creating Members...');

    // Create Members for Friday Kulu
    const memberNamesFriday = ['Mahalakshmi S', 'Gandhimathi R', 'Priya K', 'Anjali Devi M', 'Soundarya P'];
    const membersFriday = [];

    for (let i = 0; i < memberNamesFriday.length; i++) {
      const padAadhaar = `33445566000${i}`;
      const m = await Member.create({
        kulu: FridayKulu._id,
        name: memberNamesFriday[i],
        fatherName: 'Srinivasan',
        gender: 'Female',
        dob: new Date('1990-05-15'),
        age: 36,
        phone: `987654320${i}`,
        aadhaarNumber: padAadhaar,
        pan: `ABCDE123${i}F`,
        address: {
          street: 'Nehru Main Street',
          village: 'Sellur',
          areaName: 'Madurai North',
          district: 'Madurai',
          pincode: '625002',
        },
        occupation: 'Tailoring Shop',
        monthlyIncome: 12000,
        nominee: {
          name: 'Ramesh (Husband)',
          phone: `987654311${i}`,
          relation: 'Spouse',
        },
        kycStatus: 'verified',
        gpsLocation: { latitude: 9.9252, longitude: 78.1198 },
        status: 'active',
      });
      membersFriday.push(m);
    }

    // Create Members for Tuesday Kulu
    const memberNamesTuesday = ['Meenakshi S', 'Deepa Murugan', 'Jeyabharathi M', 'Kavitha P', 'Revathi G'];
    const membersTuesday = [];

    for (let i = 0; i < memberNamesTuesday.length; i++) {
      const padAadhaar = `44556677000${i}`;
      const m = await Member.create({
        kulu: TuesdayKulu._id,
        name: memberNamesTuesday[i],
        fatherName: 'Murugan',
        gender: 'Female',
        dob: new Date('1992-08-20'),
        age: 33,
        phone: `976543210${i}`,
        aadhaarNumber: padAadhaar,
        pan: `BCDEF234${i}G`,
        address: {
          street: 'Bazaar Street',
          village: 'Vadapudupatti',
          areaName: 'Periyakulam Rural',
          district: 'Theni',
          pincode: '625531',
        },
        occupation: 'Dairy Farming',
        monthlyIncome: 15000,
        nominee: {
          name: 'Selvam (Husband)',
          phone: `976543200${i}`,
          relation: 'Spouse',
        },
        kycStatus: 'verified',
        gpsLocation: { latitude: 10.1196, longitude: 77.5492 },
        status: 'active',
      });
      membersTuesday.push(m);
    }

    console.log('Members created. Creating Schemes...');

    // Create Loan Schemes
    const scheme15K = await LoanScheme.create({
      name: 'General Micro Loan 15K',
      loanAmount: 15000,
      interestRate: 10,
      processingFee: 300,
      duration: 20, // 20 weeks
      weeklyEMI: 930, // 15000 + 10% interest (1500) + rounding = 16500 / 20 = 825, EMI 930 yields interest returns.
      lateFine: 50,
      graceDays: 1,
      status: 'active',
    });

    const scheme30K = await LoanScheme.create({
      name: 'SME Business Loan 30K',
      loanAmount: 30000,
      interestRate: 8,
      processingFee: 500,
      duration: 20,
      weeklyEMI: 1800,
      lateFine: 100,
      graceDays: 2,
      status: 'active',
    });

    console.log('Schemes created. Disbursing Loans and generating schedules...');

    // Disburse Loans to 3 Friday members (General Loan 15K) starting 3 weeks ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 21); // 3 weeks ago (Thursday to Thursday, etc.)

    const durationWeeks = 20;

    for (let mIdx = 0; mIdx < 3; mIdx++) {
      const member = membersFriday[mIdx];
      const loanNumber = `LN-202600${mIdx}`;
      const loanAmount = scheme15K.loanAmount;
      const totalPayable = scheme15K.weeklyEMI * durationWeeks;

      const loan = await Loan.create({
        loanNumber,
        member: member._id,
        scheme: scheme15K._id,
        loanAmount,
        interestRate: scheme15K.interestRate,
        weeklyEMI: scheme15K.weeklyEMI,
        outstandingAmount: totalPayable,
        paidAmount: 0,
        remainingAmount: totalPayable,
        disbursementDate: startDate,
        startDate: startDate,
        endDate: new Date(startDate.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000),
        status: 'active',
      });

      // Pre-fill EMI collection schedules
      const schedules = [];
      for (let w = 1; w <= durationWeeks; w++) {
        const dueDate = new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        schedules.push({
          loan: loan._id,
          member: member._id,
          kulu: FridayKulu._id,
          weekNumber: w,
          dueDate,
          dueAmount: scheme15K.weeklyEMI,
          paidAmount: 0,
          status: 'pending',
        });
      }
      const createdScheds = await WeeklyCollection.insertMany(schedules);

      // Log processing fee income
      await Income.create({
        category: 'processing_fee',
        amount: scheme15K.processingFee,
        date: startDate,
        description: `Processing fee for Loan #${loanNumber}`,
        loan: loan._id,
      });

      // Let's seed payments for Week 1 and Week 2 for these members
      for (let payW = 1; payW <= 2; payW++) {
        const targetSched = createdScheds[payW - 1];
        const receiptNumber = `REC-SEED${mIdx}0${payW}`;
        
        const paymentDate = new Date(startDate.getTime() + payW * 7 * 24 * 60 * 60 * 1000);
        
        await Payment.create({
          receiptNumber,
          loan: loan._id,
          member: member._id,
          weeklyCollection: targetSched._id,
          officer: officer._id,
          amountPaid: scheme15K.weeklyEMI,
          paymentDate,
          weekNumber: payW,
          paymentMode: 'Cash',
          status: 'paid',
          gpsLocation: { latitude: 9.9252, longitude: 78.1198 },
          remarks: 'Regular collection',
        });

        // Update schedule status
        targetSched.paidAmount = scheme15K.weeklyEMI;
        targetSched.status = 'paid';
        await targetSched.save();

        // Update loan totals
        loan.paidAmount += scheme15K.weeklyEMI;
        loan.remainingAmount = loan.outstandingAmount - loan.paidAmount;
        await loan.save();

        // Log interest income
        await Income.create({
          category: 'interest',
          amount: scheme15K.weeklyEMI,
          date: paymentDate,
          description: `Collection EMI Week ${payW} for Loan #${loanNumber}`,
          loan: loan._id,
        });
      }
    }

    console.log('Loans disbursed. Creating office expenses...');

    // Seed Expenses
    await Expense.create({
      category: 'rent',
      amount: 4500,
      date: new Date(),
      description: 'Office building monthly rent',
      staff: superAdmin._id,
    });

    await Expense.create({
      category: 'travel',
      amount: 850,
      date: new Date(),
      description: 'Weekly travel allowance for collection officer',
      staff: officer._id,
    });

    await Expense.create({
      category: 'office',
      amount: 320,
      date: new Date(),
      description: 'Stationery and receipt register printing',
      staff: manager._id,
    });

    console.log('Seed completed successfully!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();
