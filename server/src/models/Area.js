import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Area code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    meetingNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Area = mongoose.model('Area', areaSchema);
export default Area;
