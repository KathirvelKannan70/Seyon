import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    weeklyCollection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyCollection',
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0, 'Amount paid must be positive'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    weekNumber: {
      type: Number,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['paid', 'partial', 'skipped', 'late'],
      required: true,
    },
    gpsLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
