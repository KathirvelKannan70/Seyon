import mongoose from 'mongoose';

const loanSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Scheme name is required'],
      unique: true,
      trim: true,
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount must be positive'],
    },
    interestRate: {
      type: Number, // Percentage (e.g. 10 for 10%)
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate must be positive'],
    },
    processingFee: {
      type: Number,
      required: [true, 'Processing fee is required'],
      min: [0, 'Processing fee must be positive'],
    },
    duration: {
      type: Number, // In weeks
      required: [true, 'Duration in weeks is required'],
      min: [1, 'Duration must be at least 1 week'],
    },
    weeklyEMI: {
      type: Number,
      required: [true, 'Weekly EMI is required'],
      min: [0, 'Weekly EMI must be positive'],
    },
    lateFine: {
      type: Number,
      required: [true, 'Late fine is required'],
      min: [0, 'Late fine must be positive'],
    },
    graceDays: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const LoanScheme = mongoose.model('LoanScheme', loanSchemeSchema);
export default LoanScheme;
