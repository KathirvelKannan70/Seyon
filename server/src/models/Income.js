import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['processing_fee', 'interest', 'late_fine', 'other'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Income amount must be positive'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
  },
  {
    timestamps: true,
  }
);

const Income = mongoose.model('Income', incomeSchema);
export default Income;
