import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      required: [true, 'Loan number is required'],
      unique: true,
      trim: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required'],
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanScheme',
      required: [true, 'Loan Scheme reference is required'],
    },
    loanAmount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      required: true,
    },
    weeklyEMI: {
      type: Number,
      required: true,
    },
    outstandingAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    disbursementDate: {
      type: Date,
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'completed', 'defaulted'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
