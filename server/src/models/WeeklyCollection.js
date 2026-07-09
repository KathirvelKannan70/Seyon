import mongoose from 'mongoose';

const weeklyCollectionSchema = new mongoose.Schema(
  {
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
    kulu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kulu',
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    dueAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'skipped', 'late'],
      default: 'pending',
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

// Compound index to ensure we don't duplicate a collection week for a loan
weeklyCollectionSchema.index({ loan: 1, weekNumber: 1 }, { unique: true });

const WeeklyCollection = mongoose.model('WeeklyCollection', weeklyCollectionSchema);
export default WeeklyCollection;
