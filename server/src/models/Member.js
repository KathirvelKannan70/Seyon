import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    kulu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kulu',
      required: [true, 'Kulu reference is required'],
    },
    photo: {
      type: String, // URL of image (local path or Cloudinary)
    },
    signature: {
      type: String, // URL of signature image
    },
    aadhaarPhoto: {
      type: String, // URL of Aadhaar card image
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      unique: true,
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      street: { type: String, required: true },
      village: { type: String, required: true },
      areaName: { type: String, required: true }, // name of Area
      district: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    occupation: {
      type: String,
      required: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
    },
    nominee: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relation: { type: String, required: true },
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    gpsLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    cibilScore: {
      type: Number,
      default: null,
    },
    cibilStatus: {
      type: String,
      default: null,
    },
    cibilCheckedAt: {
      type: Date,
      default: null,
    },
    cibilReport: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Member = mongoose.model('Member', memberSchema);
export default Member;
