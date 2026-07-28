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
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    dob: {
      type: Date,
    },
    age: {
      type: Number,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 10-digit phone number`,
      },
      trim: true,
    },
    alternatePhone: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 10-digit alternate phone number`,
      },
      trim: true,
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{12}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 12-digit Aadhaar number`,
      },
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      street: { type: String },
      village: { type: String },
      areaName: { type: String },
      district: { type: String },
      pincode: { type: String },
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
      phone: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{10}$/.test(v);
          },
          message: (props) => `${props.value} is not a valid 10-digit nominee phone number`,
        },
      },
      relation: { type: String, required: true },
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    feedbackRating: {
      type: String,
      enum: ['Best', 'Good', 'Average', 'Poor', 'Worst'],
      default: 'Good',
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
