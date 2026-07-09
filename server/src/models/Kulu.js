import mongoose from 'mongoose';

const kuluSchema = new mongoose.Schema(
  {
    kuluNumber: {
      type: String,
      required: [true, 'Kulu number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Kulu name is required'],
      trim: true,
    },
    meetingDay: {
      type: String,
      required: [true, 'Meeting day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    collectionTime: {
      type: String, // e.g., '10:00 AM'
      required: [true, 'Collection time is required'],
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      required: [true, 'Area is required'],
    },
    fieldOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Field officer is required'],
    },
    incharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    schemeType: {
      type: String,
      enum: ['10k', '15k', '20k'],
      default: '15k',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Kulu = mongoose.model('Kulu', kuluSchema);
export default Kulu;
